const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrapAppsFlyerAttribution } = require("../../src/analytics/appsFlyerBootstrap");
const {
  ATTRIBUTION_DELIVERY_STATES,
  ATTRIBUTION_STATE_SCHEMA_VERSION,
  ATTRIBUTION_SYNC_RESULTS,
  createAttributionStateMachine,
} = require("../../src/analytics/attributionStateMachine");
const {
  REVENUECAT_CUSTOMER_STATES,
  syncRevenueCatAttribution,
} = require("../../src/analytics/revenueCatAttributionSync");
const {
  normalizeAppsFlyerInstallAttribution,
} = require("../../src/analytics/attributionPolicy");
const {
  DESTINATIONS,
  buildEventContract,
} = require("../../src/analytics/contractPolicy");
const {
  runDeduplicatedPurchase,
} = require("../../src/analytics/purchaseDedupPolicy");
const {
  assertAlmostReleaseScope,
} = require("../../src/analytics/releaseScope");
const {
  buildReportRequest,
  buildReportScopes,
  classifyReportRow,
  validateTrackingUrl,
} = require("../check-applovin-cost-import");

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  async getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  async setItem(key, value) {
    this.values.set(key, String(value));
  }

  async removeItem(key) {
    this.values.delete(key);
  }
}

const createSdkHarness = ({ customerState = REVENUECAT_CUSTOMER_STATES.writable } = {}) => {
  const setterCalls = [];
  const syncCalls = [];
  const setterFailures = new Map();
  let syncFailuresRemaining = 0;
  const setters = Object.fromEntries(
    ["appsFlyerId", "mediaSource", "campaign", "adGroup", "ad", "keyword", "creative"].map(
      (field) => [
        field,
        async (value) => {
          setterCalls.push({ field, value });
          const failures = setterFailures.get(field) || 0;
          if (failures > 0) {
            setterFailures.set(field, failures - 1);
            throw new Error("offline");
          }
        },
      ]
    )
  );
  const syncAttributes = async () => {
    syncCalls.push("sync");
    if (syncFailuresRemaining > 0) {
      syncFailuresRemaining -= 1;
      throw new Error("offline");
    }
  };
  return {
    setterCalls,
    syncCalls,
    failSetter(field, count = 1) {
      setterFailures.set(field, count);
    },
    failSync(count = 1) {
      syncFailuresRemaining = count;
    },
    executor: ({ attribution, delivery }) =>
      syncRevenueCatAttribution({
        attribution,
        delivery,
        customerState,
        setters,
        syncAttributes,
      }),
  };
};

const createMachineHarness = ({
  storage = new MemoryStorage(),
  sdk = createSdkHarness(),
  initialNow = 1_000_000,
} = {}) => {
  let currentNow = initialNow;
  const machine = createAttributionStateMachine({
    storage,
    storageKey: "attribution-v2",
    legacyStorageKey: "first-touch-v1",
    legacyDeliveryKeyForField: (field) => `legacy-field/${field}`,
    unsafeLegacyConfirmationKeys: ["unsafe-confirmed-v1"],
    syncAttribution: sdk.executor,
    now: () => currentNow,
    random: () => 0.5,
  });
  return {
    machine,
    sdk,
    storage,
    now: () => currentNow,
    advance(ms) {
      currentNow += ms;
    },
  };
};

test("01 CUID is set before AppsFlyer init on iOS and Android", async () => {
  for (const platform of ["ios", "android"]) {
    const calls = [];
    const result = await bootstrapAppsFlyerAttribution({
      ensureInstallId: async () => {
        calls.push(`${platform}:ensure`);
        return `${platform}-install-id`;
      },
      setInstallIdentity: async (value) => calls.push(`${platform}:identity:${value}`),
      initAttribution: async () => {
        calls.push(`${platform}:initSdk`);
        return true;
      },
    });
    assert.equal(result, true);
    assert.deepEqual(calls, [
      `${platform}:ensure`,
      `${platform}:identity:${platform}-install-id`,
      `${platform}:initSdk`,
    ]);
  }
});

test("02 AppsFlyer UID arriving before campaign stays open for later campaign sync", async () => {
  const { machine, sdk } = createMachineHarness();
  const idOnly = await machine.sync(
    { appsFlyerId: "af-user-1" },
    { source: "bootstrap", force: true }
  );
  assert.equal(idOnly.status, ATTRIBUTION_SYNC_RESULTS.syncedIdOnly);
  assert.equal(idOnly.confirmed, true);

  const full = await machine.sync(
    { campaign: "campaign-a", mediaSource: "applovin_int" },
    { source: "conversion_callback", force: true }
  );
  assert.equal(full.status, ATTRIBUTION_SYNC_RESULTS.syncedFull);
  assert.deepEqual(
    sdk.setterCalls.map(({ field }) => field),
    ["appsFlyerId", "mediaSource", "campaign"]
  );
});

test("03 campaign callback arriving before AppsFlyer UID is retained", async () => {
  const { machine } = createMachineHarness();
  const campaignFirst = await machine.sync(
    { campaign: "campaign-first", ad: "creative-a" },
    { source: "conversion_callback", force: true }
  );
  assert.equal(campaignFirst.status, ATTRIBUTION_SYNC_RESULTS.pendingProviderId);
  assert.equal(campaignFirst.confirmed, false);

  const withId = await machine.sync(
    { appsFlyerId: "af-later" },
    { source: "revenuecat_bootstrap", force: true }
  );
  assert.equal(withId.status, ATTRIBUTION_SYNC_RESULTS.syncedFull);
  const payload = await machine.readPayload();
  assert.equal(payload.campaign, "campaign-first");
  assert.equal(payload.appsFlyerId, "af-later");
});

test("04 callback after 1.5 seconds merges without overwriting first touch", async () => {
  const harness = createMachineHarness();
  await harness.machine.merge(
    { mediaSource: "applovin_int", campaign: "first" },
    { source: "conversion_callback" }
  );
  harness.advance(1_501);
  await harness.machine.merge(
    { mediaSource: "other", campaign: "second", ad: "late-ad" },
    { source: "conversion_callback" }
  );
  const payload = await harness.machine.readPayload();
  assert.equal(payload.mediaSource, "applovin_int");
  assert.equal(payload.campaign, "first");
  assert.equal(payload.ad, "late-ad");
});

test("05 callback survives cold restart in a versioned record", async () => {
  const storage = new MemoryStorage();
  const first = createMachineHarness({ storage });
  await first.machine.merge(
    { campaign: "persisted-campaign" },
    { source: "conversion_callback" }
  );
  const second = createMachineHarness({ storage, initialNow: first.now() + 10_000 });
  const payload = await second.machine.readPayload();
  assert.equal(payload.campaign, "persisted-campaign");
  const stored = JSON.parse(await storage.getItem("attribution-v2"));
  assert.equal(stored.schemaVersion, ATTRIBUTION_STATE_SCHEMA_VERSION);
  assert.equal(stored.fields.campaign.source, "conversion_callback");
});

test("06 offline setter retries with bounded persisted backoff and succeeds", async () => {
  const harness = createMachineHarness();
  harness.sdk.failSetter("appsFlyerId", 1);
  const failed = await harness.machine.sync(
    { appsFlyerId: "retry-provider" },
    { source: "bootstrap", force: true }
  );
  assert.equal(failed.status, ATTRIBUTION_SYNC_RESULTS.failedRetryable);
  assert.ok(failed.retryAt > harness.now());

  const deferred = await harness.machine.sync(
    { appsFlyerId: "retry-provider" },
    { source: "foreground" }
  );
  assert.equal(deferred.retryDeferred, true);
  harness.advance(deferred.retryAt - harness.now());

  const recovered = await harness.machine.sync(
    { appsFlyerId: "retry-provider" },
    { source: "foreground" }
  );
  assert.equal(recovered.status, ATTRIBUTION_SYNC_RESULTS.syncedIdOnly);
  assert.equal(recovered.confirmed, true);
});

test("07 concurrent callbacks are serialized and retain distinct fields", async () => {
  const { machine } = createMachineHarness();
  await Promise.all([
    machine.merge({ campaign: "concurrent-campaign" }, { source: "callback-a" }),
    machine.merge({ adGroup: "concurrent-ad-group" }, { source: "callback-b" }),
  ]);
  const payload = await machine.readPayload();
  assert.equal(payload.campaign, "concurrent-campaign");
  assert.equal(payload.adGroup, "concurrent-ad-group");
});

test("08 duplicate callback does not repeat RevenueCat setters", async () => {
  const { machine, sdk } = createMachineHarness();
  const input = { appsFlyerId: "dedup-id", campaign: "dedup-campaign" };
  await machine.sync(input, { source: "conversion_callback", force: true });
  await machine.sync(input, { source: "conversion_callback", force: true });
  assert.equal(
    sdk.setterCalls.filter(({ field }) => field === "appsFlyerId").length,
    1
  );
  assert.equal(sdk.setterCalls.filter(({ field }) => field === "campaign").length, 1);
});

test("09 organic, unknown, restricted, empty, and zeroed values are rejected", async () => {
  const { machine } = createMachineHarness();
  await machine.merge(
    {
      appsFlyerId: "00000000000000000000000000000000",
      mediaSource: "organic",
      campaign: "unknown",
      adGroup: "restricted",
      ad: "",
      creative: "00000000-0000-0000-0000-000000000000",
    },
    { source: "conversion_callback" }
  );
  assert.deepEqual(await machine.readPayload(), {});
  assert.deepEqual(
    normalizeAppsFlyerInstallAttribution({
      data: { media_source: "restricted", campaign: "organic" },
    }),
    {
      mediaSource: null,
      campaign: null,
      adGroup: null,
      ad: null,
      keyword: null,
      creative: null,
    }
  );
});

test("10 existing customer without local confirmation is preserved, not confirmed", async () => {
  let setterCalls = 0;
  const result = await syncRevenueCatAttribution({
    attribution: { appsFlyerId: "input-only" },
    delivery: { appsFlyerId: ATTRIBUTION_DELIVERY_STATES.pending },
    customerState: REVENUECAT_CUSTOMER_STATES.preserve,
    setters: { appsFlyerId: async () => { setterCalls += 1; } },
    syncAttributes: async () => {},
  });
  assert.equal(result.status, ATTRIBUTION_SYNC_RESULTS.preservedExisting);
  assert.equal(result.confirmed, false);
  assert.equal(result.didWriteAppsFlyerId, false);
  assert.equal(result.previouslyWrittenAppsFlyerId, false);
  assert.equal(setterCalls, 0);
});

test("11 existing customer with a valid prior setter marker can be confirmed", async () => {
  let setterCalls = 0;
  let syncCalls = 0;
  const result = await syncRevenueCatAttribution({
    attribution: { appsFlyerId: "previously-written" },
    delivery: {
      appsFlyerId: ATTRIBUTION_DELIVERY_STATES.writtenPendingUpload,
    },
    customerState: REVENUECAT_CUSTOMER_STATES.preserve,
    setters: { appsFlyerId: async () => { setterCalls += 1; } },
    syncAttributes: async () => { syncCalls += 1; },
  });
  assert.equal(result.status, ATTRIBUTION_SYNC_RESULTS.preservedExisting);
  assert.equal(result.confirmed, true);
  assert.equal(result.previouslyWrittenAppsFlyerId, true);
  assert.equal(result.fieldDelivery.appsFlyerId, ATTRIBUTION_DELIVERY_STATES.synced);
  assert.equal(setterCalls, 0);
  assert.equal(syncCalls, 1);
});

test("11b unsafe legacy confirmation is removed even when schema v2 already exists", async () => {
  const storage = new MemoryStorage({
    "attribution-v2": JSON.stringify({
      schemaVersion: ATTRIBUTION_STATE_SCHEMA_VERSION,
      fields: {},
    }),
    "unsafe-confirmed-v1": "1",
  });
  const harness = createMachineHarness({ storage });
  await harness.machine.readPayload();
  assert.equal(await storage.getItem("unsafe-confirmed-v1"), null);
});

test("12 successful setter plus failed upload stays retryable without repeating setter", async () => {
  const harness = createMachineHarness();
  harness.sdk.failSync(1);
  const first = await harness.machine.sync(
    { appsFlyerId: "pending-upload" },
    { source: "purchase_preflight", force: true }
  );
  assert.equal(first.status, ATTRIBUTION_SYNC_RESULTS.failedRetryable);
  assert.equal(first.didWriteAppsFlyerId, true);
  assert.equal(first.attributesSynced, false);

  const second = await harness.machine.sync(
    { appsFlyerId: "pending-upload" },
    { source: "purchase_preflight", force: true }
  );
  assert.equal(second.status, ATTRIBUTION_SYNC_RESULTS.syncedIdOnly);
  assert.equal(
    harness.sdk.setterCalls.filter(({ field }) => field === "appsFlyerId").length,
    1
  );
  assert.equal(harness.sdk.syncCalls.length, 2);
});

test("13 ID-only success does not close later ad and creative delivery", async () => {
  const { machine, sdk } = createMachineHarness();
  await machine.sync(
    { appsFlyerId: "id-only" },
    { source: "bootstrap", force: true }
  );
  const later = await machine.sync(
    { ad: "ad-later", creative: "creative-later" },
    { source: "conversion_callback", force: true }
  );
  assert.equal(later.status, ATTRIBUTION_SYNC_RESULTS.syncedFull);
  assert.deepEqual(
    sdk.setterCalls.slice(-2).map(({ field }) => field),
    ["ad", "creative"]
  );
});

test("14 analytics consent and every ATT state cannot gate AppsFlyer startup", async () => {
  const starts = [];
  for (const analyticsConsent of [true, false, null]) {
    for (const attStatus of ["authorized", "denied", "restricted", "undetermined", null]) {
      await bootstrapAppsFlyerAttribution({
        ensureInstallId: async () => "always-on-install-id",
        setInstallIdentity: async () => {},
        initAttribution: async () => {
          starts.push({ analyticsConsent, attStatus });
          return true;
        },
      });
    }
  }
  assert.equal(starts.length, 15);
});

test("15 subscription lifecycle has no client ad route and GA4 purchase is deduplicated", async () => {
  const contract = buildEventContract({
    premium_trial_started: ["plan", "product_id", "source", "period_type"],
    premium_purchase_result: [
      "result",
      "period_type",
      "product_id",
      "offering_id",
      "error_category",
      "is_restore",
    ],
    premium_entitlement_activated: [
      "billing_state",
      "period_type",
      "product_id",
      "offering_id",
      "is_restore",
    ],
  });
  for (const event of Object.values(contract)) {
    assert.equal(event.destinations.includes(DESTINATIONS.APPSFLYER), false);
    assert.equal(event.destinations.includes(DESTINATIONS.META), false);
    assert.equal(event.destinations.includes(DESTINATIONS.TIKTOK), false);
  }

  const storage = new MemoryStorage();
  let emitCount = 0;
  const run = () =>
    runDeduplicatedPurchase({
      storage,
      storageKey: "ga4-purchases",
      transactionId: "store-transaction-1",
      emit: async () => { emitCount += 1; },
    });
  assert.equal((await run()).duplicate, false);
  assert.equal((await run()).duplicate, true);
  assert.equal(emitCount, 1);
});

test("16 Almost Crossed identifiers fail release scope", () => {
  assert.throws(
    () =>
      assertAlmostReleaseScope({
        iosBundleId: "com.sasarei.almostclean",
        iosAppStoreId: "6778129996",
        androidPackage: "com.sasarei.almostclean",
        tiktokAndroidAppId: "7601076786457329672",
        tiktokIosAppId: "7604101135837855751",
      }),
    /Almost Crossed identifier/
  );
});

test("17 AppLovin release gate covers both Almost apps and rejects foreign scope", () => {
  const expectedScope = {
    androidPackage: "com.sasarei.almostclean",
    iosBundle: "com.sasarei.almostclean",
    iosAppStoreId: "6756276744",
  };
  assert.deepEqual(
    validateTrackingUrl(
      "https://app.appsflyer.com/com.sasarei.almostclean?pid=applovin_int&af_c_id={CAMPAIGN_ID}",
      expectedScope
    ),
    { platform: "android" }
  );
  assert.deepEqual(
    validateTrackingUrl(
      "https://app.appsflyer.com/id6756276744?pid=applovin_int&af_c_id={CAMPAIGN_ID}",
      expectedScope
    ),
    { platform: "ios" }
  );
  assert.match(
    validateTrackingUrl(
      "https://app.appsflyer.com/id6756276744?pid=wrong_partner&af_c_id={CAMPAIGN_ID}",
      expectedScope
    ),
    /expected pid=applovin_int/
  );
  assert.equal(
    classifyReportRow(
      {
        campaign_package_name: "com.sasarei.almostclean",
        campaign_store_id: "id6756276744",
      },
      expectedScope
    ),
    "ios"
  );
  assert.equal(
    classifyReportRow(
      { campaign_package_name: "com.sasarei.almostclean" },
      expectedScope
    ),
    "android"
  );
  assert.equal(
    classifyReportRow(
      { campaign_package_name: "com.other.app", campaign_store_id: "123" },
      expectedScope
    ),
    null
  );
  const [androidScope, iosScope] = buildReportScopes(expectedScope);
  const androidRequest = new URL(
    buildReportRequest({
      apiKey: "test-only",
      lookbackDays: 45,
      reportScope: androidScope,
    })
  );
  const iosRequest = new URL(
    buildReportRequest({
      apiKey: "test-only",
      lookbackDays: 45,
      reportScope: iosScope,
    })
  );
  assert.equal(androidRequest.searchParams.get("filter_platform"), "android");
  assert.equal(
    androidRequest.searchParams.get("filter_campaign_package_name"),
    expectedScope.androidPackage
  );
  assert.equal(iosRequest.searchParams.get("filter_platform"), "ios");
  assert.equal(
    iosRequest.searchParams.get("filter_campaign_store_id"),
    expectedScope.iosAppStoreId
  );
});
