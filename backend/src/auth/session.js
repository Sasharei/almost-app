import crypto from "node:crypto";
import { config } from "../config.js";

const TOKEN_VERSION = 1;
const TOKEN_PARTS = 2;

const normalizeString = (value, maxLength = 200) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, maxLength);
};

const normalizePlatform = (value) => {
  const normalized = normalizeString(value, 16).toLowerCase();
  if (normalized === "ios" || normalized === "android") return normalized;
  return "";
};

const base64UrlEncode = (value) => Buffer.from(value, "utf8").toString("base64url");
const base64UrlDecode = (value) => Buffer.from(value, "base64url").toString("utf8");

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const signPayload = (payloadPart) => {
  if (!config.session.secret) return "";
  return crypto.createHmac("sha256", config.session.secret).update(payloadPart).digest("base64url");
};

export const isSessionAuthEnabled = () => !!config.session.enabled;

export const issueSessionToken = ({ appUserId = null, installId = null, platform = null } = {}) => {
  if (!isSessionAuthEnabled()) {
    return {
      ok: false,
      reason: "session_auth_disabled",
    };
  }
  const now = Date.now();
  const ttlMs = Math.max(60 * 1000, Number(config.session.ttlMs) || 0);
  const payload = {
    v: TOKEN_VERSION,
    iat: now,
    exp: now + ttlMs,
    jti: crypto.randomUUID(),
    appUserId: normalizeString(appUserId, 200) || null,
    installId: normalizeString(installId, 200) || null,
    platform: normalizePlatform(platform) || null,
  };
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signaturePart = signPayload(payloadPart);
  const token = `${payloadPart}.${signaturePart}`;
  return {
    ok: true,
    token,
    payload,
  };
};

export const getBearerTokenFromHeader = (authorizationHeader = "") => {
  if (typeof authorizationHeader !== "string") return "";
  const trimmed = authorizationHeader.trim();
  if (!trimmed) return "";
  const [scheme, token] = trimmed.split(/\s+/, 2);
  if (!scheme || !token) return "";
  if (scheme.toLowerCase() !== "bearer") return "";
  return token.trim();
};

export const verifySessionToken = (token = "") => {
  if (!isSessionAuthEnabled()) {
    return {
      ok: false,
      reason: "session_auth_disabled",
    };
  }
  const value = normalizeString(token, 10000);
  if (!value) {
    return {
      ok: false,
      reason: "missing_token",
    };
  }
  const parts = value.split(".");
  if (parts.length !== TOKEN_PARTS) {
    return {
      ok: false,
      reason: "invalid_token_format",
    };
  }
  const [payloadPart, signaturePart] = parts;
  const expectedSignature = signPayload(payloadPart);
  if (!expectedSignature || !timingSafeEqual(signaturePart, expectedSignature)) {
    return {
      ok: false,
      reason: "invalid_token_signature",
    };
  }
  try {
    const decodedPayload = JSON.parse(base64UrlDecode(payloadPart));
    const now = Date.now();
    const issuedAt = Number(decodedPayload?.iat);
    const expiresAt = Number(decodedPayload?.exp);
    const version = Number(decodedPayload?.v);
    if (version !== TOKEN_VERSION) {
      return {
        ok: false,
        reason: "invalid_token_version",
      };
    }
    if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
      return {
        ok: false,
        reason: "invalid_token_timestamps",
      };
    }
    if (issuedAt > now + 60 * 1000) {
      return {
        ok: false,
        reason: "invalid_token_iat",
      };
    }
    if (expiresAt <= now) {
      return {
        ok: false,
        reason: "token_expired",
      };
    }
    return {
      ok: true,
      payload: {
        v: version,
        iat: issuedAt,
        exp: expiresAt,
        jti: normalizeString(decodedPayload?.jti, 120) || null,
        appUserId: normalizeString(decodedPayload?.appUserId, 200) || null,
        installId: normalizeString(decodedPayload?.installId, 200) || null,
        platform: normalizePlatform(decodedPayload?.platform) || null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: "invalid_token_payload",
    };
  }
};

export const sessionClaimsMatch = (
  sessionPayload = {},
  { appUserId = null, installId = null, platform = null } = {}
) => {
  const expectedAppUserId = normalizeString(appUserId, 200);
  const expectedInstallId = normalizeString(installId, 200);
  const expectedPlatform = normalizePlatform(platform);
  if (expectedAppUserId && sessionPayload?.appUserId !== expectedAppUserId) return false;
  if (expectedInstallId && sessionPayload?.installId !== expectedInstallId) return false;
  if (expectedPlatform && sessionPayload?.platform !== expectedPlatform) return false;
  return true;
};
