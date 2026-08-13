const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const {
  DESTINATIONS,
  assertDefaultDenyRouting,
  buildEventContract,
  filterDestinationParams,
  validateEventAgainstContract,
} = require("../src/analytics/contractPolicy");
const {
  getElapsedBucket,
  hasCampaignFields,
  mergeWriteOnceAttribution,
  normalizeAppsFlyerInstallAttribution,
  normalizeAttributionValue,
} = require("../src/analytics/attributionPolicy");
const { canEnableMetaAdvertiserTracking } = require("../src/analytics/consentPolicy");
const {
  ALMOST_RELEASE_SCOPE,
  assertAlmostReleaseScope,
} = require("../src/analytics/releaseScope");

const rootDir = path.resolve(__dirname, "..");
const analyticsPath = path.join(rootDir, "analytics.js");
const budgetPath = path.join(__dirname, "analytics-event-budget.json");
const failures = [];

const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const parseSource = (source, fileName) =>
  parser.parse(source, {
    sourceType: "module",
    sourceFilename: fileName,
    plugins: ["jsx", "typescript", "optionalChaining"],
  });

const walk = (node, visitor, parent = null) => {
  if (!node || typeof node !== "object") return;
  visitor(node, parent);
  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry?.type) walk(entry, visitor, node);
      });
    } else if (value?.type) {
      walk(value, visitor, node);
    }
  });
};

const extractEventDefinitions = () => {
  const source = fs.readFileSync(analyticsPath, "utf8");
  const ast = parseSource(source, analyticsPath);
  let definitionNode = null;
  walk(ast, (node) => {
    if (
      node.type === "VariableDeclarator" &&
      node.id?.type === "Identifier" &&
      node.id.name === "EVENT_DEFINITIONS"
    ) {
      definitionNode = node.init;
    }
  });
  if (!definitionNode || definitionNode.type !== "ObjectExpression") {
    throw new Error("EVENT_DEFINITIONS object was not found.");
  }
  return Object.fromEntries(
    definitionNode.properties.map((property) => {
      const eventName =
        property.key?.type === "Identifier"
          ? property.key.name
          : property.key?.value;
      if (!eventName || property.value?.type !== "ArrayExpression") {
        throw new Error("EVENT_DEFINITIONS must contain literal array entries only.");
      }
      const params = property.value.elements.map((element) => element?.value);
      if (params.some((value) => typeof value !== "string")) {
        throw new Error(`${eventName} contains a non-literal parameter name.`);
      }
      return [eventName, params];
    })
  );
};

const definitions = extractEventDefinitions();
const contract = buildEventContract(definitions);
const eventNames = Object.keys(contract);
const budget = JSON.parse(fs.readFileSync(budgetPath, "utf8"));

assert(
  eventNames.length <= Number(budget.maxEventNames),
  `Event-name budget exceeded: ${eventNames.length} > ${budget.maxEventNames}.`
);
assert(
  String(budget.schemaVersion) === "2",
  "Analytics event budget must be reviewed for schema version 2."
);

const forbiddenFamilyPattern =
  /^(day_\d+|level_reached_\d+|language_.+_selected|currency_.+_selected|persona_.+_selected|gender_.+_selected|daily_reward_collected_day_\d+|sound_setting_(enabled|disabled)|premium_purchase_(success|revenue)|session_started|tamagotchi_pressed)$/;
eventNames.forEach((eventName) => {
  const event = contract[eventName];
  assert(!forbiddenFamilyPattern.test(eventName), `Dynamic event family remains: ${eventName}`);
  assert(Array.isArray(event.destinations), `${eventName} has no destinations.`);
  assert(
    event.destination_params && typeof event.destination_params === "object",
    `${eventName} has no destination-specific parameter policy.`
  );
  assert(Array.isArray(event.required_params), `${eventName} has no required_params.`);
  assert(Array.isArray(event.optional_params), `${eventName} has no optional_params.`);
  assert(event.param_types && typeof event.param_types === "object", `${eventName} has no types.`);
  assert(event.schema_version === "2", `${eventName} has the wrong schema_version.`);
  [...event.required_params, ...event.optional_params].forEach((paramName) => {
    assert(
      !!event.param_types[paramName],
      `${eventName}.${paramName} has no declared parameter type.`
    );
  });
});

try {
  assertDefaultDenyRouting(contract);
} catch (error) {
  fail(error.message);
}

const productOnly = contract.temptation_save?.destinations || [];
assert(
  productOnly.length === 2 &&
    productOnly.includes(DESTINATIONS.GA4) &&
    productOnly.includes(DESTINATIONS.AMPLITUDE),
  "Ordinary product events must route only to GA4 and Amplitude."
);
const activationRoutes = contract.onboarding_completed?.destinations || [];
assert(
  activationRoutes.includes(DESTINATIONS.APPSFLYER) &&
    !activationRoutes.includes(DESTINATIONS.META) &&
    !activationRoutes.includes(DESTINATIONS.TIKTOK),
  "Activation must use AppsFlyer as the sole client UA route."
);
const appsFlyerOnboardingPayload = filterDestinationParams(
  {
    analytics_schema_version: "2",
    app_version: "7.1.0",
    build_number: "119",
    platform: "ios",
    experiment_id: "none",
    experiment_variant: "none",
    install_id_present: true,
    persona_id: "sensitive-persona",
    goal_id: "sensitive-goal",
    start_balance: 100,
    has_goal: true,
    skipped: false,
  },
  contract.onboarding_completed,
  DESTINATIONS.APPSFLYER
);
assert(
  !("persona_id" in appsFlyerOnboardingPayload) &&
    !("goal_id" in appsFlyerOnboardingPayload) &&
    !("start_balance" in appsFlyerOnboardingPayload),
  "AppsFlyer onboarding payload must remove persona, goal, and financial details."
);
const appsFlyerPaywallCtaPayload = filterDestinationParams(
  {
    analytics_schema_version: "2",
    app_version: "7.1.0",
    build_number: "119",
    platform: "ios",
    experiment_id: "none",
    experiment_variant: "none",
    install_id_present: true,
    kind: "hard",
    feature: "premium",
    plan: "yearly",
    view_index: 1,
    product_id: "almost_premium_yearly",
    has_trial: true,
    trial_days: 7,
    price: 29.99,
    revenue: 29.99,
  },
  contract.premium_paywall_primary_tapped,
  DESTINATIONS.APPSFLYER
);
["plan", "product_id", "has_trial", "trial_days", "price", "revenue"].forEach(
  (paramName) => {
    assert(
      !(paramName in appsFlyerPaywallCtaPayload),
      `AppsFlyer paywall CTA payload must remove ${paramName}.`
    );
  }
);
[
  "premium_trial_started",
  "premium_entitlement_activated",
  "premium_purchase_result",
  "premium_renewal",
  "premium_cancellation",
].forEach((eventName) => {
  const destinations = contract[eventName]?.destinations || [];
  assert(
    !destinations.some((destination) =>
      [DESTINATIONS.APPSFLYER, DESTINATIONS.META, DESTINATIONS.TIKTOK].includes(
        destination
      )
    ),
    `${eventName} must not route client-side to advertising providers.`
  );
});

const purchaseResultRequired = new Set(
  contract.premium_purchase_result?.required_params || []
);
[
  "result",
  "period_type",
  "product_id",
  "offering_id",
  "error_category",
  "is_restore",
].forEach((paramName) => {
  assert(
    purchaseResultRequired.has(paramName),
    `premium_purchase_result is missing required ${paramName}.`
  );
});

const validPurchaseValidation = validateEventAgainstContract(
  "premium_purchase_result",
  {
    analytics_schema_version: "2",
    app_version: "7.1.0",
    build_number: "119",
    platform: "ios",
    experiment_id: "none",
    experiment_variant: "none",
    install_id_present: true,
    result: "success",
    period_type: "normal",
    product_id: "product",
    offering_id: "default",
    error_category: "none",
    is_restore: false,
  },
  contract
);
assert(validPurchaseValidation.ok, "A valid purchase result must pass contract validation.");
assert(
  !validateEventAgainstContract("not_a_real_event", {}, contract).ok,
  "Unknown events must fail contract validation."
);
assert(
  !validateEventAgainstContract(
    "premium_purchase_result",
    {
      analytics_schema_version: "2",
      app_version: "7.1.0",
      build_number: "119",
      platform: "ios",
      experiment_id: "none",
      experiment_variant: "none",
      install_id_present: true,
    },
    contract
  ).ok,
  "Missing required purchase parameters must fail validation."
);

const trackedLiteralNames = new Set();
const approvedDynamicWrappers = new Set([
  "logEvent(eventName, withMonetizationExperimentMeta(normalizedPayload))",
  "logMonetizationEvent(eventName, {",
]);
["App.js", "analytics.js"].forEach((relativeFile) => {
  const source = read(relativeFile);
  const ast = parseSource(source, relativeFile);
  walk(ast, (node) => {
    if (node.type !== "CallExpression" || node.callee?.type !== "Identifier") return;
    if (!["logEvent", "logMonetizationEvent", "trackOnce"].includes(node.callee.name)) return;
    const firstArg = node.arguments?.[0];
    if (firstArg?.type === "StringLiteral") {
      trackedLiteralNames.add(firstArg.value);
      return;
    }
    const callText = source.slice(node.start, node.end);
    const approved = Array.from(approvedDynamicWrappers).some((snippet) =>
      callText.startsWith(snippet)
    );
    if (!approved) {
      fail(
        `${relativeFile}:${node.loc.start.line} uses an unresolved dynamic analytics event name.`
      );
    }
  });
});
trackedLiteralNames.forEach((eventName) => {
  assert(!!contract[eventName], `Tracked event is absent from the contract: ${eventName}`);
});

const appSource = read("App.js");
const analyticsSource = read("analytics.js");
const indexSource = read("index.js");
const purchasesSource = read("src/monetization/purchasesClient.js");
assert(
  !/logEvent\(\s*`/.test(appSource),
  "Template-literal analytics event names are forbidden."
);
assert(
  appSource.includes('reason: "app_foreground"') &&
    appSource.includes('reason: "purchase_preflight"') &&
    analyticsSource.includes('reason: "conversion_callback"'),
  "Attribution sync must retry on callback, foreground, and purchase preflight."
);
assert(
  analyticsSource.includes("setCustomerUserId(customerUserId") &&
    analyticsSource.indexOf("setCustomerUserId(customerUserId") <
      analyticsSource.indexOf("appsFlyer.initSdk("),
  "AppsFlyer customerUserId must be set before initSdk."
);
assert(
  indexSource.includes("await setAppScopedInstallIdentity(premiumInstallId);") &&
    indexSource.includes("void initAttribution().catch((error) => {") &&
    indexSource.indexOf("await setAppScopedInstallIdentity(premiumInstallId);") <
      indexSource.indexOf("void initAttribution().catch((error) => {") &&
    !indexSource.includes("timeToWaitForATTUserAuthorization") &&
    !analyticsSource.includes("timeToWaitForATTUserAuthorization"),
  "AppsFlyer must start immediately after the app-scoped install identity, without waiting for ATT."
);
assert(
  !appSource.includes("initAttribution(") &&
    appSource.includes("const result = await requester();"),
  "The ATT prompt must control IDFA only and must not control AppsFlyer initialization."
);
assert(
  analyticsSource.includes("APPSFLYER_FIRST_TOUCH_STORAGE_KEY") &&
    analyticsSource.includes("mergeWriteOnceAttribution"),
  "AppsFlyer first-touch attribution must be persisted write-once."
);
assert(
  analyticsSource.includes("GA4_PURCHASE_DEDUP_STORAGE_KEY") &&
    analyticsSource.includes("ga4PurchaseLogQueue") &&
    analyticsSource.includes("previousIds.includes(normalizedTransactionId)"),
  "GA4 purchase must retain persistent transaction deduplication."
);
assert(
  !appSource.includes("install_id: premiumInstallId"),
  "The raw install ID must not be duplicated into RevenueCat custom attributes."
);
assert(
  analyticsSource.includes("appsFlyer.setSharingFilterForPartners([]);") &&
    !analyticsSource.includes('setSharingFilterForPartners(["all"])') &&
    !analyticsSource.includes("setAppsFlyerPartnerSharingAllowed") &&
    purchasesSource.includes('"$appsflyerSharingFilter": ""') &&
    !purchasesSource.includes('"$appsflyerSharingFilter": "all"') &&
    purchasesSource.includes("await Purchases.syncAttributesAndOfferingsIfNeeded();") &&
    purchasesSource.includes("await clearRevenueCatAppsFlyerSharingFilterSafe();") &&
    !appSource.includes("APPSFLYER_PARTNER_SHARING_ALLOWED") &&
    !indexSource.includes("APPSFLYER_PARTNER_SHARING_ALLOWED") &&
    !appSource.includes("ANDROID_APPSFLYER_ENABLED") &&
    !indexSource.includes("ANDROID_APPSFLYER_ENABLED"),
  "AppsFlyer and RevenueCat partner postbacks must stay enabled and ignore legacy opt-out keys."
);
assert(
  analyticsSource.includes(
    "ensureAppsFlyerPartnerSharingEnabled();\n  syncAppsFlyerAdvertisingIdCollection();\n  return initAppsFlyerSdk();"
  ),
  "AppsFlyer partner sharing and ATT-limited IDFA state must be applied before initSdk."
);
assert(
  analyticsSource.includes("let appsFlyerAdvertisingIdEnabled = false;") &&
    analyticsSource.includes(
      "appsFlyer.disableAdvertisingIdentifier(!appsFlyerAdvertisingIdEnabled);"
    ) &&
    appSource.includes(
      "setAppsFlyerAdvertisingIdEnabledFlag(isTrackingStatusGranted(iosTrackingStatus))"
    ) &&
    appSource.includes("await setAppsFlyerAdvertisingIdEnabledFlag(granted);") &&
    !appSource.includes("setAppsFlyerAdvertisingIdEnabledFlag(true)"),
  "IDFA collection must default off and only follow the actual iOS ATT status."
);
assert(
  appSource.includes('onboardingStep === "analyticsConsent"') &&
    appSource.includes("onAgree={() => handleAnalyticsConsentChoice(true)}") &&
    appSource.includes("onSkip={() => handleAnalyticsConsentChoice(false)}") &&
    appSource.includes("setAnalyticsOptOutState(") &&
    !appSource.includes(
      'if (Platform.OS === "android") {\n        setAnalyticsOptOutState(false);'
    ),
  "Analytics consent must offer accept/decline and honor stored Android opt-out."
);

const earlyPaid = normalizeAppsFlyerInstallAttribution({
  data: { media_source: "paid", campaign: "first", af_adset: "set-a" },
});
const latePaid = normalizeAppsFlyerInstallAttribution({
  data: { media_source: "other", campaign: "second", af_ad: "creative-b" },
});
const writeOnce = mergeWriteOnceAttribution(earlyPaid, latePaid);
assert(
  writeOnce.mediaSource === "paid" &&
    writeOnce.campaign === "first" &&
    writeOnce.ad === "creative-b",
  "Attribution callbacks before/after 1.5 seconds must merge without overwriting first touch."
);
assert(getElapsedBucket(1500) === "le_1_5s", "1.5-second attribution bucket is wrong.");
assert(getElapsedBucket(1501) === "le_5s", "Post-race attribution bucket is wrong.");
assert(
  !hasCampaignFields(
    normalizeAppsFlyerInstallAttribution({
      data: {
        media_source: "organic",
        campaign: "unknown",
        af_ad: "00000000-0000-0000-0000-000000000000",
      },
    })
  ),
  "Organic/placeholders/zeroed identifiers must not become write-once attribution."
);
assert(
  normalizeAttributionValue("00000000000000000000000000000000") === null,
  "Zeroed identifiers must be rejected."
);

["undetermined", "denied", "restricted", null].forEach((status) => {
  assert(
    !canEnableMetaAdvertiserTracking(status),
    `Meta advertiser tracking must remain disabled for ${status}.`
  );
});
["authorized", "granted"].forEach((status) => {
  assert(
    canEnableMetaAdvertiserTracking(status),
    `Meta advertiser tracking should be enabled for ${status}.`
  );
});
assert(
  !appSource.includes("setAdvertiserTrackingEnabled(true)"),
  "Meta advertiser tracking must never be enabled with an unconditional true literal."
);

try {
  assertAlmostReleaseScope(ALMOST_RELEASE_SCOPE);
} catch (error) {
  fail(error.message);
}
assert(
  (() => {
    try {
      assertAlmostReleaseScope({ ...ALMOST_RELEASE_SCOPE, iosAppStoreId: "6778129996" });
      return false;
    } catch (_error) {
      return true;
    }
  })(),
  "Almost Crossed iOS scope must be rejected."
);
assert(
  (() => {
    try {
      assertAlmostReleaseScope({
        ...ALMOST_RELEASE_SCOPE,
        tiktokIosAppId: "7655726160134275080",
      });
      return false;
    } catch (_error) {
      return true;
    }
  })(),
  "Almost Crossed TikTok scope must be rejected."
);

if (failures.length) {
  failures.forEach((message) => console.error(`[FAIL] ${message}`));
  process.exit(1);
}

console.log(
  `[OK] Analytics contract passed (${eventNames.length} event names, ${trackedLiteralNames.size} tracked literals, default-deny routing, always-on attribution/ATT/dedup policy).`
);
