import dotenv from "dotenv";

dotenv.config();

const parseIntOrDefault = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePem = (value = "") => {
  if (!value) return "";
  return String(value).replace(/\\n/g, "\n");
};

const parseJsonEnv = (value = "") => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const parseCsvEnv = (value = "") =>
  String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseIntOrDefault(process.env.PORT, 8787),
  appSharedSecret: process.env.APP_SHARED_SECRET || "",
  requestTtlMs: parseIntOrDefault(process.env.REQUEST_TTL_MS, 15 * 60 * 1000),
  replayWindowMs: parseIntOrDefault(process.env.REPLAY_WINDOW_MS, 24 * 60 * 60 * 1000),
  storePath: process.env.STORE_PATH || "",
  storeFlushMs: parseIntOrDefault(process.env.STORE_FLUSH_MS, 2000),
  apple: {
    enabled: process.env.APPLE_VALIDATION_ENABLED === "1",
    bundleId: process.env.APPLE_BUNDLE_ID || "",
    environment: process.env.APPLE_ENVIRONMENT === "production" ? "production" : "sandbox",
    issuerId: process.env.APPLE_ISSUER_ID || "",
    keyId: process.env.APPLE_KEY_ID || "",
    privateKey: normalizePem(process.env.APPLE_PRIVATE_KEY || ""),
    appAppleId: parseIntOrDefault(process.env.APPLE_APPLE_ID, 0) || null,
    webhook: {
      secret: process.env.APPLE_WEBHOOK_SECRET || process.env.WEBHOOK_SHARED_SECRET || "",
      verifySignature: process.env.APPLE_WEBHOOK_VERIFY_SIGNATURE === "1",
      requireVerified: process.env.APPLE_WEBHOOK_REQUIRE_VERIFIED === "1",
      enableOnlineChecks: process.env.APPLE_WEBHOOK_ONLINE_CHECKS === "1",
      rootCaPaths: parseCsvEnv(process.env.APPLE_ROOT_CA_PATHS || ""),
    },
  },
  google: {
    enabled: process.env.GOOGLE_VALIDATION_ENABLED === "1",
    packageName: process.env.GOOGLE_PACKAGE_NAME || "",
    serviceAccountJson:
      parseJsonEnv(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "") ||
      parseJsonEnv(process.env.GOOGLE_SERVICE_ACCOUNT || ""),
    webhook: {
      secret: process.env.GOOGLE_RTDN_SECRET || process.env.WEBHOOK_SHARED_SECRET || "",
    },
  },
};

export const isProduction = config.nodeEnv === "production";
