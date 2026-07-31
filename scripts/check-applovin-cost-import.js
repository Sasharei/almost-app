#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const APP_CONFIG_PATH = path.join(PROJECT_ROOT, "app.json");
const REPORT_URL = "https://r.applovin.com/report";
const CAMPAIGN_ID_MACRO = "{CAMPAIGN_ID}";
const DEFAULT_LOOKBACK_DAYS = 45;

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

const loadExpectedPackage = () => {
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

  return androidPackage;
};

const validateTrackingUrl = (trackingUrl) => {
  let parsed;
  try {
    parsed = new URL(trackingUrl);
  } catch {
    return "is not a valid absolute URL";
  }

  const campaignId = parsed.searchParams.get("af_c_id");
  if (!campaignId) return "does not contain af_c_id";
  if (campaignId !== CAMPAIGN_ID_MACRO) {
    return `uses af_c_id=${campaignId}; expected af_c_id=${CAMPAIGN_ID_MACRO}`;
  }
  return null;
};

const isoDay = (date) => date.toISOString().slice(0, 10);

const buildReportRequest = ({ apiKey, lookbackDays }) => {
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
      "cost",
      "clicks",
      "impressions",
    ].join(","),
    format: "json",
    report_type: "advertiser",
    limit: "500",
    not_zero: "1",
  });

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

const checkReportingApi = async ({ apiKey, expectedPackage, lookbackDays }) => {
  const requestUrl = buildReportRequest({ apiKey, lookbackDays });
  let response;
  try {
    response = await fetch(requestUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new Error(`AppLovin Reporting API request failed: ${redactSecret(error?.message, apiKey)}`);
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `AppLovin Reporting API returned HTTP ${response.status}: ` +
        redactSecret(responseText.slice(0, 300), apiKey)
    );
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error("AppLovin Reporting API returned a non-JSON response");
  }

  const rows = extractRows(payload);
  const packageNames = new Set(
    rows.map((row) => String(row?.campaign_package_name || "").trim()).filter(Boolean)
  );
  const costRows = rows.filter((row) => parseCost(row?.cost) > 0);
  const matchingCostRows = costRows.filter(
    (row) => String(row?.campaign_package_name || "").trim() === expectedPackage
  );
  const rowsMissingCampaignId = matchingCostRows.filter(
    (row) => !String(row?.campaign_id_external || "").trim()
  );

  return {
    costRows: costRows.length,
    matchingCostRows: matchingCostRows.length,
    packageNames: [...packageNames].sort(),
    rows: rows.length,
    rowsMissingCampaignId: rowsMissingCampaignId.length,
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const expectedPackage = loadExpectedPackage();
  let hasFailure = false;

  console.info(`[OK] App package / iOS bundle ID: ${expectedPackage}`);

  if (options.trackingUrls.length === 0) {
    console.info("[SKIP] No tracking URL supplied; af_c_id was not checked.");
  } else {
    options.trackingUrls.forEach((trackingUrl, index) => {
      const error = validateTrackingUrl(trackingUrl);
      if (error) {
        hasFailure = true;
        console.error(`[FAIL] Tracking URL ${index + 1} ${error}.`);
      } else {
        console.info(`[OK] Tracking URL ${index + 1}: af_c_id=${CAMPAIGN_ID_MACRO}`);
      }
    });
  }

  if (options.skipApi) {
    console.info("[SKIP] AppLovin Reporting API check disabled by --skip-api.");
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
        expectedPackage,
        lookbackDays: options.lookbackDays,
      });
      console.info(`[OK] Reporting API key accepted; ${report.rows} report row(s) returned.`);

      if (report.matchingCostRows === 0) {
        hasFailure = true;
        const packages = report.packageNames.length > 0 ? report.packageNames.join(", ") : "none";
        console.error(
          `[FAIL] No positive-cost rows matched ${expectedPackage}. ` +
            `Packages returned by AppLovin: ${packages}.`
        );
      } else {
        console.info(
          `[OK] ${report.matchingCostRows}/${report.costRows} positive-cost row(s) match ${expectedPackage}.`
        );
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

main().catch((error) => {
  const apiKey = String(process.env.APPLOVIN_REPORTING_API_KEY || "").trim();
  console.error(`[FAIL] ${redactSecret(error?.message || error, apiKey)}`);
  process.exitCode = 1;
});
