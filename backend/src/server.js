import cors from "cors";
import express from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { z } from "zod";
import { config, getBackendReadiness, isProduction } from "./config.js";
import {
  getBearerTokenFromHeader,
  isSessionAuthEnabled,
  issueSessionToken,
  sessionClaimsMatch,
  verifySessionToken,
} from "./auth/session.js";
import { scoreFraudRisk } from "./risk.js";
import {
  bootstrapStore,
  cacheIdempotentResponse,
  flushStore,
  getCachedIdempotentResponse,
  getEntitlementByUser,
  getSeenTransaction,
  markTransactionSeen,
  upsertEntitlement,
  verifyOrRegisterInstallSecret,
} from "./store/entitlementsStore.js";
import { validateApplePurchase } from "./validators/apple.js";
import { validateGooglePurchase } from "./validators/google.js";
import { parseAppleServerNotification } from "./webhooks/apple.js";
import { parseGoogleRtdnMessage } from "./webhooks/google.js";

const app = express();

app.use(helmet());
if (Array.isArray(config.corsOrigins) && config.corsOrigins.length) {
  const allowedOrigins = new Set(config.corsOrigins);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        callback(null, allowedOrigins.has(origin));
      },
    })
  );
}
app.use(express.json({ limit: "1mb" }));

const INSTALL_ID_REGEX = /^[a-zA-Z0-9._:-]{16,200}$/;

const timingSafeEquals = (left = "", right = "") => {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getClientIp = (req) => {
  const forwardedFor = String(req.header("x-forwarded-for") || "")
    .split(",")[0]
    ?.trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || "unknown";
};

const createRateLimiter = ({ maxRequests, windowMs, buildKey, errorCode }) => {
  const hits = new LRUCache({
    max: 100_000,
    ttl: windowMs,
    allowStale: false,
  });
  const max = Math.max(1, Number(maxRequests) || 1);
  const windowDuration = Math.max(1_000, Number(windowMs) || 60_000);
  return (req, res, next) => {
    const key = typeof buildKey === "function" ? String(buildKey(req) || "") : "";
    if (!key) {
      next();
      return;
    }
    const now = Date.now();
    const current = hits.get(key);
    const startedAt = Number(current?.startedAt || 0);
    const stillInWindow = startedAt > 0 && now - startedAt < windowDuration;
    const baseCount = stillInWindow ? Number(current?.count || 0) : 0;
    const nextHits = baseCount + 1;
    const effectiveStartedAt = stillInWindow ? startedAt : now;
    const elapsedMs = Math.max(0, now - effectiveStartedAt);
    const ttlMs = Math.max(1, windowDuration - elapsedMs);
    hits.set(
      key,
      {
        count: nextHits,
        startedAt: effectiveStartedAt,
      },
      {
        ttl: ttlMs,
      }
    );
    if (nextHits > max) {
      const retryAfterMs = Math.max(1, windowDuration - elapsedMs);
      res.status(429).json({
        error: errorCode || "rate_limited",
        retryAfterMs,
      });
      return;
    }
    next();
  };
};

const authSessionRateLimiter = createRateLimiter({
  maxRequests: config.security.rateLimit.authSessionPerMinute,
  windowMs: 60 * 1000,
  buildKey: (req) => {
    const installId = String(req.body?.installId || "").trim().slice(0, 200) || "none";
    return `auth_session:${getClientIp(req)}:${installId}`;
  },
  errorCode: "auth_rate_limited",
});

const appEndpointRateLimiter = createRateLimiter({
  maxRequests: config.security.rateLimit.appPerMinute,
  windowMs: 60 * 1000,
  buildKey: (req) => `app_endpoint:${getClientIp(req)}`,
  errorCode: "app_rate_limited",
});

const assertSecureStartupConfig = () => {
  if (!config.security.strictStartupValidation) return;
  const issues = [];
  if (isProduction && !isSessionAuthEnabled() && !String(config.appSharedSecret || "").trim()) {
    issues.push("missing APP_SESSION_SECRET or APP_SHARED_SECRET");
  }
  if (
    isProduction &&
    isSessionAuthEnabled() &&
    !config.security.requireInstallSecret &&
    !config.security.allowLegacyInstallSecretGrace
  ) {
    issues.push(
      "REQUIRE_INSTALL_SECRET_PROOF must be enabled when APP_SESSION_SECRET is active (or set ALLOW_LEGACY_INSTALL_SECRET_GRACE=1 temporarily)"
    );
  }
  if (isProduction && config.webhookAllowQuerySecret) {
    issues.push("WEBHOOK_QUERY_SECRET_ENABLED must be disabled in production");
  }
  if (
    isProduction &&
    config.apple.webhook.verifySignature &&
    !String(config.apple.webhook.secret || "").trim()
  ) {
    issues.push("missing APPLE_WEBHOOK_SECRET while signature verification is enabled");
  }
  if (issues.length) {
    throw new Error(`insecure_startup_config: ${issues.join("; ")}`);
  }
};

const requireSharedSecret = (req, res, next) => {
  if (!config.appSharedSecret) {
    next();
    return;
  }
  const headerSecret = req.header("x-app-secret") || "";
  if (!timingSafeEquals(headerSecret, config.appSharedSecret)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
};

const requireAppAuth = (req, res, next) => {
  if (isSessionAuthEnabled()) {
    const token = getBearerTokenFromHeader(req.header("authorization") || "");
    if (!token) {
      res.status(401).json({ error: "missing_auth_token" });
      return;
    }
    const verified = verifySessionToken(token);
    if (!verified.ok) {
      res.status(401).json({ error: "invalid_auth_token", reason: verified.reason || "unknown" });
      return;
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const claimCheck = sessionClaimsMatch(verified.payload, {
      appUserId: req.params?.appUserId || body.appUserId || null,
      installId: body.installId || null,
      platform: body.platform || null,
    });
    if (!claimCheck) {
      res.status(401).json({ error: "auth_claims_mismatch" });
      return;
    }
    req.authSession = verified.payload;
    next();
    return;
  }
  requireSharedSecret(req, res, next);
};

const requireWebhookSecret = (getSecret) => (req, res, next) => {
  const expectedSecret =
    typeof getSecret === "function" ? String(getSecret() || "").trim() : String(getSecret || "").trim();
  if (!expectedSecret) {
    next();
    return;
  }
  const headerSecret =
    req.header("x-webhook-secret") ||
    req.header("x-apple-webhook-secret") ||
    req.header("x-google-rtdn-secret") ||
    "";
  const querySecret = config.webhookAllowQuerySecret ? String(req.query?.secret || "") : "";
  const headerMatched = timingSafeEquals(headerSecret, expectedSecret);
  const queryMatched = querySecret ? timingSafeEquals(querySecret, expectedSecret) : false;
  if (!headerMatched && !queryMatched) {
    res.status(401).json({ error: "unauthorized_webhook" });
    return;
  }
  next();
};

const syncSchema = z.object({
  appUserId: z.string().min(1).max(200),
  installId: z.string().min(1).max(200).optional().nullable(),
  platform: z.enum(["ios", "android"]).optional().nullable(),
  source: z.string().max(80).optional().nullable(),
  entitlement: z
    .object({
      identifier: z.string().max(200).optional().nullable(),
      isActive: z.boolean().optional(),
      productIdentifier: z.string().max(200).optional().nullable(),
      expirationDate: z.string().optional().nullable(),
      originalPurchaseDate: z.string().optional().nullable(),
      latestPurchaseDate: z.string().optional().nullable(),
      store: z.string().max(80).optional().nullable(),
    })
    .optional()
    .nullable(),
  customerInfo: z.any().optional().nullable(),
});

const validationSchema = z.object({
  appUserId: z.string().min(1).max(200),
  installId: z.string().min(1).max(200).optional().nullable(),
  platform: z.enum(["ios", "android"]),
  productId: z.string().max(200).optional().nullable(),
  transactionId: z.string().max(500).optional().nullable(),
  purchaseToken: z.string().max(500).optional().nullable(),
  receipt: z.string().max(20000).optional().nullable(),
  signature: z.string().max(4000).optional().nullable(),
  obfuscatedAccountId: z.string().max(200).optional().nullable(),
});

const appleWebhookSchema = z.object({
  signedPayload: z.string().min(10).max(200000),
  appUserId: z.string().min(1).max(200).optional().nullable(),
});

const googleWebhookSchema = z
  .object({
    appUserId: z.string().min(1).max(200).optional().nullable(),
  })
  .passthrough();

const authSessionSchema = z.object({
  appUserId: z.string().min(1).max(200).optional().nullable(),
  installId: z.string().min(16).max(200).regex(/^[a-zA-Z0-9._:-]+$/, "invalid_install_id_format"),
  installSecret: z.string().min(1).max(2048).optional().nullable(),
  platform: z.enum(["ios", "android"]).optional().nullable(),
});

const parseBody = (schema, payload) => {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return {
      ok: true,
      data: parsed.data,
    };
  }
  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
};

const resolveAppleRootCaDiagnostics = () => {
  const configuredPaths = Array.isArray(config.apple.webhook.rootCaPaths)
    ? config.apple.webhook.rootCaPaths
    : [];
  if (!configuredPaths.length) {
    return {
      configured: false,
      missingFiles: [],
      checkedFiles: [],
    };
  }
  const checkedFiles = configuredPaths.map((filePath) => path.resolve(process.cwd(), filePath));
  const missingFiles = checkedFiles.filter((absolutePath) => !fs.existsSync(absolutePath));
  return {
    configured: true,
    missingFiles,
    checkedFiles,
  };
};

const buildHealthPayload = () => {
  const readiness = getBackendReadiness();
  const appleRootCa = resolveAppleRootCaDiagnostics();
  const appleWebhookReady =
    readiness.webhooks.apple.ready && (!appleRootCa.configured || !appleRootCa.missingFiles.length);
  if (!config.security.healthExposeDetails) {
    return {
      ok: true,
      service: "almost-monetization",
      now: new Date().toISOString(),
      readiness: {
        appAuth: readiness.appAuth,
        security: readiness.security,
        cors: {
          restricted: readiness.cors.restricted,
        },
        validation: {
          apple: {
            enabled: readiness.validation.apple.enabled,
            ready: readiness.validation.apple.ready,
          },
          google: {
            enabled: readiness.validation.google.enabled,
            ready: readiness.validation.google.ready,
          },
        },
        webhooks: {
          apple: {
            verifySignature: readiness.webhooks.apple.verifySignature,
            requireVerified: readiness.webhooks.apple.requireVerified,
            acceptQuerySecret: readiness.webhooks.apple.acceptQuerySecret,
            ready: appleWebhookReady,
            rootCaConfigured: appleRootCa.configured,
            missingRootCaFiles: appleRootCa.missingFiles.length,
          },
        },
      },
    };
  }
  return {
    ok: true,
    service: "almost-monetization",
    now: new Date().toISOString(),
    readiness: {
      ...readiness,
      webhooks: {
        ...readiness.webhooks,
        apple: {
          ...readiness.webhooks.apple,
          ready: appleWebhookReady,
          rootCaConfigured: appleRootCa.configured,
          missingRootCaFiles: appleRootCa.missingFiles,
        },
      },
    },
  };
};

app.get("/health", (_, res) => {
  res.json(buildHealthPayload());
});

app.post("/v1/auth/session", authSessionRateLimiter, (req, res) => {
  if (!isSessionAuthEnabled()) {
    res.status(503).json({ ok: false, error: "session_auth_disabled" });
    return;
  }
  const parsed = parseBody(authSessionSchema, req.body || {});
  if (!parsed.ok) {
    res.status(400).json({ error: "invalid_payload", details: parsed.errors });
    return;
  }
  const installId = String(parsed.data.installId || "").trim();
  if (!INSTALL_ID_REGEX.test(installId)) {
    res.status(400).json({ error: "invalid_install_id_format" });
    return;
  }
  const installSecret = String(parsed.data.installSecret || "").trim();
  if (config.security.requireInstallSecret) {
    if (!installSecret || installSecret.length < config.security.installSecretMinLength) {
      res.status(400).json({ error: "missing_install_secret" });
      return;
    }
    const installSecretCheck = verifyOrRegisterInstallSecret(installId, installSecret);
    if (!installSecretCheck.ok) {
      res.status(401).json({ error: "invalid_install_secret" });
      return;
    }
  }
  const appUserId = String(parsed.data.appUserId || "").trim();
  if (config.security.enforceInstallIdBinding && appUserId && appUserId !== installId) {
    res.status(400).json({ error: "app_user_install_mismatch" });
    return;
  }
  const tokenClaims = config.security.enforceInstallIdBinding
    ? {
        appUserId: installId,
        installId,
        platform: parsed.data.platform || null,
      }
    : parsed.data;
  const issued = issueSessionToken(tokenClaims);
  if (!issued.ok) {
    res.status(503).json({ ok: false, error: issued.reason || "session_issue_failed" });
    return;
  }
  res.json({
    ok: true,
    token: issued.token,
    expiresAt: issued.payload?.exp || null,
    issuedAt: issued.payload?.iat || null,
  });
});

app.get("/v1/entitlements/:appUserId", appEndpointRateLimiter, requireAppAuth, (req, res) => {
  const appUserId = String(req.params.appUserId || "").trim();
  if (!appUserId) {
    res.status(400).json({ error: "missing_app_user_id" });
    return;
  }
  const entitlement = getEntitlementByUser(appUserId);
  res.json({
    ok: true,
    entitlement: entitlement || null,
  });
});

app.post("/v1/entitlements/sync", appEndpointRateLimiter, requireAppAuth, (req, res) => {
  const parsed = parseBody(syncSchema, req.body || {});
  if (!parsed.ok) {
    res.status(400).json({ error: "invalid_payload", details: parsed.errors });
    return;
  }

  const payload = parsed.data;
  const risk = scoreFraudRisk({ payload, trustedValidation: false });
  const entitlement = getEntitlementByUser(payload.appUserId);

  res.json({
    ok: true,
    accepted: true,
    trusted: false,
    risk,
    entitlement: entitlement || null,
  });
});

app.post("/v1/iap/validate", appEndpointRateLimiter, requireAppAuth, async (req, res) => {
  const idempotencyKey = req.header("idempotency-key") || "";
  if (idempotencyKey) {
    const cached = getCachedIdempotentResponse(idempotencyKey);
    if (cached) {
      res.json({ ...cached, idempotent: true });
      return;
    }
  }

  const parsed = parseBody(validationSchema, req.body || {});
  if (!parsed.ok) {
    res.status(400).json({ error: "invalid_payload", details: parsed.errors });
    return;
  }

  const payload = parsed.data;
  const initialRisk = scoreFraudRisk({
    payload,
    trustedValidation: false,
  });
  if (initialRisk.reasons.includes("reused_transaction_other_user")) {
    const failurePayload = {
      ok: false,
      error: "reused_transaction_other_user",
      risk: initialRisk,
    };
    if (idempotencyKey) {
      cacheIdempotentResponse(idempotencyKey, failurePayload);
    }
    res.status(409).json(failurePayload);
    return;
  }
  const validate = payload.platform === "ios" ? validateApplePurchase : validateGooglePurchase;
  const validation = await validate(payload);

  const risk = scoreFraudRisk({
    payload,
    trustedValidation: !!validation.ok && !!validation.trusted,
  });

  if (risk.score >= 0.95) {
    res.status(403).json({
      ok: false,
      error: "fraud_risk_too_high",
      risk,
    });
    return;
  }

  if (!validation.ok) {
    const failurePayload = {
      ok: false,
      error: validation.reason || "validation_failed",
      validation,
      risk,
    };
    if (idempotencyKey) {
      cacheIdempotentResponse(idempotencyKey, failurePayload);
    }
    res.status(422).json(failurePayload);
    return;
  }

  const transactionReferences = [
    validation.transactionId,
    validation.originalTransactionId,
    payload.transactionId,
    payload.purchaseToken,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const uniqueTransactionReferences = Array.from(new Set(transactionReferences));
  const reusedReference = uniqueTransactionReferences.find((reference) => {
    const previous = getSeenTransaction(reference);
    return previous?.appUserId && previous.appUserId !== payload.appUserId;
  });
  if (reusedReference) {
    const failurePayload = {
      ok: false,
      error: "reused_transaction_other_user",
      risk: {
        ...risk,
        reasons: Array.from(new Set([...(risk.reasons || []), "reused_transaction_other_user"])),
      },
    };
    if (idempotencyKey) {
      cacheIdempotentResponse(idempotencyKey, failurePayload);
    }
    res.status(409).json(failurePayload);
    return;
  }
  uniqueTransactionReferences.forEach((reference) => {
    markTransactionSeen(reference, payload.appUserId);
  });

  const entitlement = upsertEntitlement(payload.appUserId, {
    source: "store_validation",
    platform: validation.platform || payload.platform,
    installId: payload.installId || null,
    isPremium: !!validation.isActive,
    productId: validation.productId || payload.productId || null,
    transactionId: validation.transactionId || payload.transactionId || null,
    originalTransactionId: validation.originalTransactionId || null,
    expiresDate: validation.expiresDate || null,
    raw: {
      validation,
      risk,
    },
  });

  const responsePayload = {
    ok: true,
    trusted: !!validation.trusted,
    risk,
    entitlement,
  };

  if (idempotencyKey) {
    cacheIdempotentResponse(idempotencyKey, responsePayload);
  }

  res.json(responsePayload);
});

app.post(
  "/v1/webhooks/apple",
  requireWebhookSecret(() => config.apple.webhook.secret),
  async (req, res) => {
    const parsed = parseBody(appleWebhookSchema, req.body || {});
    if (!parsed.ok) {
      res.status(400).json({ error: "invalid_payload", details: parsed.errors });
      return;
    }

    const event = await parseAppleServerNotification({
      signedPayload: parsed.data.signedPayload,
      appUserIdHint: parsed.data.appUserId || null,
    });

    if (!event.ok) {
      const isVerificationFailure =
        event.reason === "apple_webhook_verification_failed" ||
        event.reason === "apple_webhook_verifier_init_failed";
      const strictReject = config.apple.webhook.requireVerified && isVerificationFailure;
      res.status(strictReject ? 401 : 422).json({
        ok: false,
        error: event.reason || "apple_webhook_failed",
        details: event.error || null,
      });
      return;
    }

    if (event.transactionId) {
      markTransactionSeen(event.transactionId, event.appUserId || "");
    }
    if (event.originalTransactionId) {
      markTransactionSeen(event.originalTransactionId, event.appUserId || "");
    }

    if (!event.mapped || !event.appUserId) {
      res.status(202).json({
        ok: true,
        accepted: true,
        mapped: false,
        trusted: !!event.trusted,
        event: {
          notificationType: event.notificationType,
          subtype: event.subtype,
          transactionId: event.transactionId,
          originalTransactionId: event.originalTransactionId,
        },
      });
      return;
    }

    const entitlement = upsertEntitlement(event.appUserId, {
      source: "apple_webhook",
      platform: "ios",
      installId: null,
      isPremium: !!event.isActive,
      productId: event.productId || null,
      transactionId: event.transactionId || null,
      originalTransactionId: event.originalTransactionId || null,
      expiresDate: event.expiresDate || null,
      raw: {
        trustedWebhook: !!event.trusted,
        notificationType: event.notificationType,
        subtype: event.subtype,
        notificationUUID: event.notificationUUID,
        payload: event.raw || null,
      },
    });

    res.json({
      ok: true,
      trusted: !!event.trusted,
      mapped: true,
      entitlement,
      event: {
        notificationType: event.notificationType,
        subtype: event.subtype,
      },
    });
  }
);

app.post(
  "/v1/webhooks/google/rtdn",
  requireWebhookSecret(() => config.google.webhook.secret),
  async (req, res) => {
    const parsed = parseBody(googleWebhookSchema, req.body || {});
    if (!parsed.ok) {
      // Acknowledge malformed RTDN pushes to avoid endless retries.
      res.status(200).json({ ok: false, accepted: true, error: "invalid_payload", details: parsed.errors });
      return;
    }

    const event = await parseGoogleRtdnMessage({
      payload: parsed.data,
      appUserIdHint: parsed.data.appUserId || null,
    });

    if (!event.ok) {
      res.status(200).json({
        ok: false,
        accepted: true,
        error: event.reason || "google_rtdn_failed",
        eventType: event.eventType || null,
      });
      return;
    }

    if (event.transactionId) {
      markTransactionSeen(event.transactionId, event.appUserId || "");
    }
    if (event.purchaseToken) {
      markTransactionSeen(event.purchaseToken, event.appUserId || "");
    }

    if (!event.mapped || !event.appUserId || event.test) {
      res.status(202).json({
        ok: true,
        accepted: true,
        mapped: false,
        trusted: !!event.trusted,
        eventType: event.eventType || null,
      });
      return;
    }

    const entitlement = upsertEntitlement(event.appUserId, {
      source: "google_rtdn",
      platform: "android",
      installId: null,
      isPremium: !!event.isActive,
      productId: event.productId || null,
      transactionId: event.transactionId || null,
      originalTransactionId: event.originalTransactionId || null,
      expiresDate: event.expiresDate || null,
      raw: {
        trustedWebhook: !!event.trusted,
        eventType: event.eventType || null,
        payload: event.raw || null,
      },
    });

    res.json({
      ok: true,
      trusted: !!event.trusted,
      mapped: true,
      entitlement,
      eventType: event.eventType || null,
    });
  }
);

const start = async () => {
  assertSecureStartupConfig();
  await bootstrapStore();
  const readiness = buildHealthPayload().readiness;
  const securityWarnings = [];
  if (isProduction && isSessionAuthEnabled() && !config.security.requireInstallSecret) {
    securityWarnings.push("legacy_install_secret_grace_mode_enabled");
  }
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        msg: "backend_readiness",
        appAuth: readiness.appAuth,
        security: readiness.security,
        cors: readiness.cors,
        appleValidation: readiness.validation.apple,
        googleValidation: readiness.validation.google,
        appleWebhook: readiness.webhooks.apple,
        securityWarnings,
      },
      null,
      2
    )
  );
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`almost monetization backend listening on :${config.port}`);
  });

  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`received ${signal}, flushing store and shutting down`);
    await flushStore();
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 4000).unref();
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("server failed to start", error);
  process.exit(1);
});
