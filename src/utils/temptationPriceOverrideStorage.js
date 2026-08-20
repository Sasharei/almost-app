const isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);

const parseOverrideRecord = (rawValue) => {
  if (!rawValue) return {};
  try {
    const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
    return isRecord(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
};

const parseTemptationPriceOverrideSnapshot = ({
  catalogRaw = null,
  pricePrecisionRaw = null,
} = {}) => ({
  catalogOverrides: parseOverrideRecord(catalogRaw),
  pricePrecisionOverrides: parseOverrideRecord(pricePrecisionRaw),
});

const readTemptationPriceOverridesWithRetry = async ({
  storage,
  catalogKey,
  pricePrecisionKey,
  attempts = 3,
  retryDelayMs = 400,
  wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
} = {}) => {
  const maxAttempts = Math.max(1, Math.floor(Number(attempts) || 1));
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const pairs = await storage.multiGet([catalogKey, pricePrecisionKey]);
      const storedMap = Object.fromEntries(pairs || []);
      return {
        ok: true,
        ...parseTemptationPriceOverrideSnapshot({
          catalogRaw: storedMap[catalogKey] ?? null,
          pricePrecisionRaw: storedMap[pricePrecisionKey] ?? null,
        }),
      };
    } catch (error) {
      lastError = error;
      if (attempt + 1 < maxAttempts) {
        await wait(retryDelayMs);
      }
    }
  }

  return {
    ok: false,
    error: lastError,
  };
};

module.exports = {
  parseTemptationPriceOverrideSnapshot,
  readTemptationPriceOverridesWithRetry,
};
