const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseTemptationPriceOverrideSnapshot,
  readTemptationPriceOverridesWithRetry,
} = require("../../src/utils/temptationPriceOverrideStorage");

const CATALOG_KEY = "catalog";
const PRECISION_KEY = "precision";

test("preserves fractional average prices and their manual precision", () => {
  const snapshot = parseTemptationPriceOverrideSnapshot({
    catalogRaw: JSON.stringify({ coffee: 0.75, taxi: 2 }),
    pricePrecisionRaw: JSON.stringify({ coffee: 2, taxi: 0 }),
  });

  assert.deepEqual(snapshot.catalogOverrides, { coffee: 0.75, taxi: 2 });
  assert.deepEqual(snapshot.pricePrecisionOverrides, { coffee: 2, taxi: 0 });
});

test("retries a transient storage failure before hydrating price overrides", async () => {
  let reads = 0;
  const storage = {
    async multiGet(keys) {
      reads += 1;
      assert.deepEqual(keys, [CATALOG_KEY, PRECISION_KEY]);
      if (reads === 1) throw new Error("storage temporarily unavailable");
      return [
        [CATALOG_KEY, JSON.stringify({ coffee: 4.25 })],
        [PRECISION_KEY, JSON.stringify({ coffee: 2 })],
      ];
    },
  };

  const result = await readTemptationPriceOverridesWithRetry({
    storage,
    catalogKey: CATALOG_KEY,
    pricePrecisionKey: PRECISION_KEY,
    retryDelayMs: 0,
    wait: async () => {},
  });

  assert.equal(reads, 2);
  assert.equal(result.ok, true);
  assert.deepEqual(result.catalogOverrides, { coffee: 4.25 });
  assert.deepEqual(result.pricePrecisionOverrides, { coffee: 2 });
});

test("does not turn repeated read failures into an empty hydrated catalog", async () => {
  let reads = 0;
  const result = await readTemptationPriceOverridesWithRetry({
    storage: {
      async multiGet() {
        reads += 1;
        throw new Error("storage unavailable");
      },
    },
    catalogKey: CATALOG_KEY,
    pricePrecisionKey: PRECISION_KEY,
    attempts: 3,
    retryDelayMs: 0,
    wait: async () => {},
  });

  assert.equal(reads, 3);
  assert.equal(result.ok, false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "catalogOverrides"), false);
});
