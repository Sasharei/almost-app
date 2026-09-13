import cors from "cors";
import express from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
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
  commitPurchase,
  consumeRateLimit,
  cacheIdempotentResponse,
  flushStore,
  reserveIdempotency,
  getEntitlementByUser,
  verifyOrRegisterInstallSecret,
} from "./store/entitlementsStore.js";
import { validateApplePurchase } from "./validators/apple.js";
import { validateGooglePurchase } from "./validators/google.js";
import { parseAppleServerNotification } from "./webhooks/apple.js";
import { parseGoogleRtdnMessage } from "./webhooks/google.js";

import { isPremiumProduct, verifyPurchaseOwner, verifyRevenueCatOwnership } from "./validators/ownership.js";
import { verifyGooglePush } from "./auth/googlePush.js";

const app = express();
app.set("trust proxy", config.trustProxy.length ? config.trustProxy : false);
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const resolveTamagotchiSkinAssetDir = () =>
  [
    path.resolve(process.cwd(), "assets", "tamagotchi_skins"),
    path.resolve(process.cwd(), "..", "assets", "tamagotchi_skins"),
    path.resolve(serverDir, "..", "public", "tamagotchi_skins"),
  ].find((candidate) => fs.existsSync(candidate));
const tamagotchiSkinAssetDir = resolveTamagotchiSkinAssetDir();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
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
if (tamagotchiSkinAssetDir) {
  app.use(
    "/assets/tamagotchi_skins",
    express.static(tamagotchiSkinAssetDir, {
      immutable: true,
      maxAge: "30d",
      fallthrough: false,
    })
  );
}

const INSTALL_ID_REGEX = /^[a-zA-Z0-9._:-]{16,200}$/;

const timingSafeEquals = (left = "", right = "") => {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getClientIp = req => req.ip || req.socket?.remoteAddress || "unknown";
const createRateLimiter = ({ maxRequests, windowMs, buildKey, errorCode }) => (req, res, next) => {
  const result = consumeRateLimit(buildKey(req), maxRequests, windowMs);
  if (!result.allowed) {
    res.set("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
    res.status(429).json({ error: errorCode, retryAfterMs: result.retryAfterMs });
    return;
  }
  next();
};
const authSessionRateLimiter = createRateLimiter({
  maxRequests: config.security.rateLimit.authSessionPerMinute, windowMs: 60000,
  buildKey: req => `auth_session:${getClientIp(req)}`, errorCode: "auth_rate_limited",
});
const appEndpointRateLimiter = createRateLimiter({
  maxRequests: config.security.rateLimit.appPerMinute, windowMs: 60000,
  buildKey: req => `app_endpoint:${getClientIp(req)}`, errorCode: "app_rate_limited",
});

const assertSecureStartupConfig = () => {
  if (!isProduction && !config.security.strictStartupValidation) return;
  const issues = [];
  if (isProduction) {
    if (!isSessionAuthEnabled() || config.session.secret.length < 32) issues.push("APP_SESSION_SECRET must contain at least 32 characters");
    if (!config.security.requireInstallSecret || !config.security.enforceInstallIdBinding) issues.push("install secret proof and install binding are mandatory");
    if (!config.databasePath || config.databasePath === ":memory:") issues.push("persistent STORE_DATABASE_PATH is required");
    if (config.google.enabled && !config.google.webhook.secret && !(config.google.webhook.audience && config.google.webhook.serviceAccountEmail)) issues.push("Google RTDN authentication is required");
  }
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
  if (issues.length) {
    throw new Error(`insecure_startup_config: ${issues.join("; ")}`);
  }
};

const requireSharedSecret = (req, res, next) => {
  if (isProduction || !config.appSharedSecret) {
    res.status(503).json({ error: "session_auth_required" });
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
    res.status(503).json({ error: "webhook_auth_not_configured" });
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
  const appUserId = String(parsed.data.appUserId || "").trim();
  if (config.security.enforceInstallIdBinding && appUserId && appUserId !== installId) {
    res.status(400).json({ error: "app_user_install_mismatch" });
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

app.post("/v1/iap/validate", appEndpointRateLimiter, requireAppAuth, asyncRoute(async (req, res) => {
  const parsed = parseBody(validationSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: "invalid_payload", details: parsed.errors });
  const payload = parsed.data;
  if (!isPremiumProduct(payload.productId)) return res.status(400).json({ error: "unsupported_product" });
  const rawKey = req.header("idempotency-key") || "";
  if (rawKey.length > 200) return res.status(400).json({ error: "invalid_idempotency_key" });
  const key = rawKey ? JSON.stringify([payload.appUserId, "/v1/iap/validate", rawKey]) : "";
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  if (key) {
    const cached = reserveIdempotency(key, fingerprint);
    if (cached) {
      if (cached.fingerprint !== fingerprint) return res.status(409).json({ error: "idempotency_payload_mismatch" });
      if (cached.pending) return res.status(409).json({ error: "idempotency_in_progress" });
      return res.status(cached.status).json({ ...cached.body, idempotent: true });
    }
  }
  const reply = (status, body) => {
    if (key) cacheIdempotentResponse(key, { fingerprint, status, body });
    return res.status(status).json(body);
  };
  let validation;
  let owner;
  if (payload.platform === "android" && !payload.purchaseToken && payload.transactionId) {
    // RevenueCat exposes store order IDs, not Google purchase tokens, to this client.
    owner = await verifyRevenueCatOwnership({ ...payload, transactionIds: [payload.transactionId] });
    if (!owner.ok) return reply(owner.status, { ok: false, error: owner.reason });
    validation = owner.validation;
  } else {
    const validate = payload.platform === "ios" ? validateApplePurchase : validateGooglePurchase;
    validation = await validate(payload);
    if (!validation.ok || !validation.trusted) return reply(422, { ok: false, error: validation.reason || "validation_failed" });
    if (!isPremiumProduct(validation.productId)) return reply(403, { ok: false, error: "unsupported_product" });
    owner = await verifyPurchaseOwner(payload, validation);
    if (!owner.ok) return reply(owner.status, { ok: false, error: owner.reason });
  }
  const references = [validation.transactionId, validation.originalTransactionId, payload.purchaseToken].filter(Boolean);
  const risk = scoreFraudRisk({ payload, trustedValidation: true });
  try {
    const entitlement = commitPurchase(payload.appUserId, references, {
      source: "store_validation", platform: payload.platform, installId: payload.installId || null,
      isPremium: !!validation.isActive && (owner.source !== "revenuecat" || !!owner.validation.isActive), productId: validation.productId,
      transactionId: validation.transactionId, originalTransactionId: validation.originalTransactionId || null,
      expiresDate: validation.expiresDate || null,
      raw: { validation, risk },
    }, { allowTransfer: owner.source === "revenuecat" && !!owner.validation.isActive });
    return reply(200, { ok: true, trusted: true, entitlement, risk });
  } catch (error) {
    if (error.message === "reused_transaction_other_user") return reply(409, { ok: false, error: error.message });
    throw error;
  }
}));

app.post(
  "/v1/webhooks/apple",
  appEndpointRateLimiter,
  asyncRoute(async (req, res) => {
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

    if (!event.trusted) return res.status(401).json({ error: "untrusted_webhook" });
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

    const entitlement = commitPurchase(event.appUserId, [event.transactionId, event.originalTransactionId, event.purchaseToken].filter(Boolean), {
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
  })
);

app.post(
  "/v1/webhooks/google/rtdn",
  asyncRoute(async (req, res, next) => {
    if (config.google.webhook.audience && config.google.webhook.serviceAccountEmail) {
      if (!await verifyGooglePush(req.header("authorization") || "")) return res.status(401).json({ error: "unauthorized_webhook" });
      return next();
    }
    return requireWebhookSecret(() => config.google.webhook.secret)(req, res, next);
  }),
  asyncRoute(async (req, res) => {
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
      res.status(event.reason?.includes("validation") ? 503 : 422).json({
        ok: false,
        accepted: false,
        error: event.reason || "google_rtdn_failed",
        eventType: event.eventType || null,
      });
      return;
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

    const entitlement = commitPurchase(event.appUserId, [event.transactionId, event.originalTransactionId, event.purchaseToken].filter(Boolean), {
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
  })
);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === "entity.too.large" ? 413 : error instanceof SyntaxError ? 400 : error.message === "reused_transaction_other_user" ? 409 : 503;
  res.status(status).json({ ok: false, error: status === 400 ? "invalid_json" : status === 413 ? "payload_too_large" : "request_failed" });
});

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

  return server;
};

const isDirectRun =
  !!process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun && config.nodeEnv !== "test") {
  start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("server failed to start", error);
    process.exit(1);
  });
}

export { app, assertSecureStartupConfig, buildHealthPayload, resolveTamagotchiSkinAssetDir, start };
