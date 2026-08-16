#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const APP_CONFIG_PATH = path.join(PROJECT_ROOT, "app.json");
const REPORT_URL = "https://r.applovin.com/report";
const CAMPAIGN_ID_MACRO = "{CAMPAIGN_ID}";
const DEFAULT_LOOKBACK_DAYS = 45;
const IOS_APP_STORE_ID = "6756276744";

const parseArgs = (argv) => {
  const options = {
    lookbackDays: DEFAULT_LOOKBACK_DAYS,
    skipApi: false,
    trackingUrls: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--skip-api") {
      options.skipApi = true;
      continue;
    }
    if (argument === "--tracking-url") {
      const value = argv[index + 1];
      if (!value) throw new Error("--tracking-url requires a value");
      options.trackingUrls.push(value);
      index += 1;
      continue;
    }
    if (argument === "--days") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 1 || value > 45) {
        throw new Error("--days must be an integer from 1 to 45");
      }
      options.lookbackDays = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  const environmentUrls = String(process.env.APPLOVIN_TRACKING_URLS || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  options.trackingUrls.push(...environmentUrls);
  return options;
};

const loadExpectedScope = () => {
  const appConfig = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, "utf8"));
  const androidPackage = String(appConfig?.expo?.android?.package || "").trim();
  const iosBundle = String(appConfig?.expo?.ios?.bundleIdentifier || "").trim();

  if (!androidPackage || !iosBundle) {
    throw new Error("app.json must define both expo.android.package and expo.ios.bundleIdentifier");
  }
  if (androidPackage !== iosBundle) {
    throw new Error(
      `App identifiers differ: Android=${androidPackage}, iOS=${iosBundle}. ` +
        "Pass the platform-specific value in the AppsFlyer Cost tab."
    );
  }

  return {
    androidPackage,
    iosBundle,
    iosAppStoreId: IOS_APP_STORE_ID,
  };
};

const validateTrackingUrl = (trackingUrl, expectedScope) => {
  let parsed;
  try {
    parsed = new URL(trackingUrl);
  } catch {
    return "is not a valid absolute URL";
  }
  if (parsed.protocol !== "https:") return "must use HTTPS";

  const partnerId = String(parsed.searchParams.get("pid") || "").trim();
  if (partnerId !== "applovin_int") {
    return `uses pid=${partnerId || "missing"}; expected pid=applovin_int`;
  }

  const campaignId = parsed.searchParams.get("af_c_id");
  if (!campaignId) return "does not contain af_c_id";
  if (campaignId !== CAMPAIGN_ID_MACRO) {
    return `uses af_c_id=${campaignId}; expected af_c_id=${CAMPAIGN_ID_MACRO}`;
  }
  const decodedUrl = decodeURIComponent(parsed.toString()).toLowerCase();
  if (decodedUrl.includes(expectedScope.androidPackage.toLowerCase())) {
    return { platform: "android" };
  }
  if (
    decodedUrl.includes(`id${expectedScope.iosAppStoreId}`) ||
    decodedUrl.includes(expectedScope.iosAppStoreId)
  ) {
    return { platform: "ios" };
  }
  return "does not contain the Almost Savings Android package or iOS App Store ID";
};

const isoDay = (date) => date.toISOString().slice(0, 10);

const buildReportScopes = (expectedScope) => [
  {
    platform: "android",
    filterColumn: "campaign_package_name",
    filterValue: expectedScope.androidPackage,
  },
  {
    platform: "ios",
    filterColumn: "campaign_store_id",
    filterValue: expectedScope.iosAppStoreId,
  },
];

const buildReportRequest = ({ apiKey, lookbackDays, reportScope }) => {
  if (!reportScope?.platform || !reportScope?.filterColumn || !reportScope?.filterValue) {
    throw new Error("AppLovin Reporting API request requires an app-scoped filter");
  }
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (lookbackDays - 1));

  const query = new URLSearchParams({
    api_key: apiKey,
    start: isoDay(startDate),
    end: isoDay(endDate),
    columns: [
      "day",
      "campaign",
      "campaign_id_external",
      "campaign_package_name",
      "campaign_store_id",
      "platform",
      "cost",
      "clicks",
      "impressions",
    ].join(","),
    format: "json",
    report_type: "advertiser",
    limit: "500",
    not_zero: "1",
  });
  query.set("filter_platform", reportScope.platform);
  query.set(`filter_${reportScope.filterColumn}`, reportScope.filterValue);

  return `${REPORT_URL}?${query.toString()}`;
};

const redactSecret = (value, secret) =>
  secret ? String(value).split(secret).join("[REDACTED]") : String(value);

const extractRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const parseCost = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const classifyReportRow = (row, expectedScope) => {
  const packageName = String(row?.campaign_package_name || "").trim().toLowerCase();
  const storeId = String(row?.campaign_store_id || "").trim().toLowerCase();
  const androidPackage = expectedScope.androidPackage.toLowerCase();
  const iosBundle = expectedScope.iosBundle.toLowerCase();
  const iosAppStoreId = expectedScope.iosAppStoreId.toLowerCase();

  if (
    storeId === iosAppStoreId ||
    storeId.includes(`id${iosAppStoreId}`) ||
    storeId.includes(iosAppStoreId)
  ) {
    return "ios";
  }
  if (packageName === androidPackage || storeId.includes(androidPackage)) return "android";
  if (packageName === iosBundle) return "ios";
  return null;
};

const fetchReportingScope = async ({ apiKey, lookbackDays, reportScope }) => {
  const requestUrl = buildReportRequest({ apiKey, lookbackDays, reportScope });
  let response;
  try {
    response = await fetch(requestUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new Error(
      `AppLovin Reporting API ${reportScope.platform} request failed: ` +
        redactSecret(error?.message, apiKey)
    );
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `AppLovin Reporting API ${reportScope.platform} request returned HTTP ${response.status}: ` +
        redactSecret(responseText.slice(0, 300), apiKey)
    );
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(
      `AppLovin Reporting API ${reportScope.platform} request returned a non-JSON response`
    );
  }

  return extractRows(payload);
};

const checkReportingApi = async ({ apiKey, expectedScope, lookbackDays }) => {
  const reportScopes = buildReportScopes(expectedScope);
  const scopeResponses = await Promise.all(
    reportScopes.map(async (reportScope) => ({
      reportScope,
      rows: await fetchReportingScope({ apiKey, lookbackDays, reportScope }),
    }))
  );
  const classifiedRows = scopeResponses.flatMap(({ reportScope, rows }) =>
    rows.map((row) => ({
      row,
      requestedPlatform: reportScope.platform,
      platform: classifyReportRow(row, expectedScope),
    }))
  );
  const rows = classifiedRows.map(({ row }) => row);
  const packageNames = new Set(
    rows.map((row) => String(row?.campaign_package_name || "").trim()).filter(Boolean)
  );
  const costRows = classifiedRows.filter(({ row }) => parseCost(row?.cost) > 0);
  const matchingRows = classifiedRows.filter(
    ({ platform, requestedPlatform }) => platform === requestedPlatform
  );
  const matchingCostRows = costRows.filter(
    ({ platform, requestedPlatform }) => platform === requestedPlatform
  );
  const foreignRows = classifiedRows.filter(
    ({ platform, requestedPlatform }) => platform !== requestedPlatform
  );
  const rowsMissingCampaignId = matchingCostRows.filter(
    ({ row }) => !String(row?.campaign_id_external || "").trim()
  );

  const matchingDeliveryDays = matchingCostRows
    .map(({ row }) => String(row?.day || "").trim())
    .filter(Boolean)
    .sort();
  const platformRows = matchingRows.reduce(
    (counts, { requestedPlatform }) => ({
      ...counts,
      [requestedPlatform]: counts[requestedPlatform] + 1,
    }),
    { android: 0, ios: 0 }
  );

  return {
    costRows: costRows.length,
    foreignRows: foreignRows.length,
    matchingCostRows: matchingCostRows.length,
    matchingRows: matchingRows.length,
    matchingDeliveryStart: matchingDeliveryDays[0] || null,
    matchingDeliveryEnd: matchingDeliveryDays.at(-1) || null,
    packageNames: [...packageNames].sort(),
    platformRows,
    rows: rows.length,
    rowsMissingCampaignId: rowsMissingCampaignId.length,
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const expectedScope = loadExpectedScope();
  const expectedPackage = expectedScope.androidPackage;
  let hasFailure = false;

  console.info(`[OK] App package / iOS bundle ID: ${expectedPackage}`);

  if (options.trackingUrls.length < 2) {
    hasFailure = true;
    console.error(
      `[FAIL] Two Almost Savings tracking URLs are required; received ${options.trackingUrls.length}.`
    );
  } else {
    const coveredPlatforms = new Set();
    options.trackingUrls.forEach((trackingUrl, index) => {
      const validation = validateTrackingUrl(trackingUrl, expectedScope);
      if (typeof validation === "string") {
        hasFailure = true;
        console.error(`[FAIL] Tracking URL ${index + 1} ${validation}.`);
      } else {
        coveredPlatforms.add(validation.platform);
        console.info(
          `[OK] Tracking URL ${index + 1}: platform=${validation.platform}, af_c_id=${CAMPAIGN_ID_MACRO}`
        );
      }
    });
    if (!coveredPlatforms.has("ios") || !coveredPlatforms.has("android")) {
      hasFailure = true;
      console.error("[FAIL] Tracking URLs must cover both iOS and Android Almost Savings apps.");
    }
  }

  if (options.skipApi) {
    hasFailure = true;
    console.error(
      "[NO-GO] AppLovin Reporting API check disabled by --skip-api; release evidence is incomplete."
    );
  } else {
    const apiKey = String(process.env.APPLOVIN_REPORTING_API_KEY || "").trim();
    if (!apiKey) {
      hasFailure = true;
      console.error(
        "[FAIL] APPLOVIN_REPORTING_API_KEY is not set; the Reporting API key cannot be verified."
      );
    } else {
      const report = await checkReportingApi({
        apiKey,
        expectedScope,
        lookbackDays: options.lookbackDays,
      });
      console.info(
        `[OK] Reporting API key accepted; ${report.rows} app-scoped report row(s) returned.`
      );

      if (report.foreignRows > 0) {
        hasFailure = true;
        console.error(
          `[FAIL] ${report.foreignRows} report row(s) escaped the requested Almost Savings app scope.`
        );
      }

      if (report.matchingRows === 0) {
        hasFailure = true;
        const packages = report.packageNames.length > 0 ? report.packageNames.join(", ") : "none";
        console.error(
          `[FAIL] No report rows matched ${expectedPackage}. ` +
            `Packages returned by AppLovin: ${packages}.`
        );
      } else if (report.matchingCostRows === 0) {
        console.info(
          `[WARN] ${report.matchingRows} row(s) matched ${expectedPackage}, but no positive cost ` +
            `was observed in the ${options.lookbackDays}-day window; app scope is valid and delivery is idle.`
        );
      } else {
        console.info(
          `[OK] ${report.matchingCostRows}/${report.costRows} positive-cost row(s) match ${expectedPackage}; ` +
            `last nonzero delivery ${report.matchingDeliveryStart}..${report.matchingDeliveryEnd}.`
        );
      }

      for (const platform of ["android", "ios"]) {
        const count = report.platformRows[platform];
        const label = platform === "ios" ? "iOS" : "Android";
        if (count > 0) {
          console.info(`[OK] ${label} Almost scope: ${count} report row(s).`);
        } else {
          console.info(
            `[WARN] ${label} Almost scope has no rows in the ${options.lookbackDays}-day window; ` +
              "the app-scoped tracking URL is valid, but delivery is idle."
          );
        }
      }

      if (report.rowsMissingCampaignId > 0) {
        hasFailure = true;
        console.error(
          `[FAIL] ${report.rowsMissingCampaignId} matching cost row(s) have no campaign_id_external; ` +
            "AppsFlyer cannot reconcile those rows with af_c_id."
        );
      } else if (report.matchingCostRows > 0) {
        console.info("[OK] Matching cost rows contain AppLovin campaign IDs for af_c_id reconciliation.");
      }
    }
  }

  if (hasFailure) process.exitCode = 1;
};

if (require.main === module) {
  main().catch((error) => {
    const apiKey = String(process.env.APPLOVIN_REPORTING_API_KEY || "").trim();
    console.error(`[FAIL] ${redactSecret(error?.message || error, apiKey)}`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildReportRequest,
  buildReportScopes,
  classifyReportRow,
  validateTrackingUrl,
};
