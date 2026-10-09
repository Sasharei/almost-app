const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveReportInsights, reportCalendarDayCount } = require("../../src/utils/reportInsights");

const prior = { type: "month", startAt: "2026-08-01", endAt: "2026-09-01", completePeriod: true,
  totals: { spendUSD: 310, spendCount: 6, dayCount: 31 } };
const current = { type: "month", startAt: "2026-09-01", endAt: "2026-10-01", completePeriod: true,
  totals: { spendUSD: 300, spendCount: 6, dayCount: 30 } };

test("different month lengths do not create a false spending change", () => {
  assert.equal(deriveReportInsights(current, prior)[0].key, "reportsPatternSteady");
  assert.equal(deriveReportInsights(current, prior)[0].values.percent, 0);
  const higher = { ...current, totals: { ...current.totals, spendUSD: 450 } };
  assert.equal(deriveReportInsights(higher, prior)[0].values.percent, 50);
  assert.equal(deriveReportInsights(higher, prior)[0].key, "reportsPatternUp");
  const lower = { ...current, totals: { ...current.totals, spendUSD: 150 } };
  assert.equal(deriveReportInsights(lower, prior)[0].key, "reportsPatternDown");
});

test("missing, sparse, nonadjacent and partial baselines never produce a trend", () => {
  const higher = { ...current, totals: { ...current.totals, spendUSD: 900 } };
  for (const previous of [null, { ...prior, completePeriod: false },
    { ...prior, endAt: "2026-08-01" }, { ...prior, type: "week" },
    { ...prior, totals: { ...prior.totals, spendCount: 2 } },
    { ...prior, totals: { ...prior.totals, spendUSD: 0 } }]) {
    assert.deepEqual(deriveReportInsights(higher, previous), []);
  }
  assert.deepEqual(deriveReportInsights({ ...higher, completePeriod: false }, prior), []);
});

test("repeat scenario uses actual average ticket and the most costly recurring item", () => {
  const report = { ...current, spendBuckets: [
    { displayTitle: "Coffee", count: 4, amountUSD: 24 },
    { displayTitle: "Delivery", count: 3, amountUSD: 60 },
    { displayTitle: "Laptop", count: 1, amountUSD: 1000 },
  ] };
  const before = JSON.stringify(report);
  const [insight] = deriveReportInsights(report);
  assert.equal(insight.values.title, "Delivery");
  assert.equal(insight.amounts.amount, 20);
  assert.equal(insight.amounts.total, 60);
  assert.equal(JSON.stringify(report), before);
});

test("single large purchase is distinguished from repeated habits", () => {
  const report = { ...current, largestSpend: { displayTitle: "Laptop", amountUSD: 180 } };
  assert.equal(deriveReportInsights(report)[0].values.percent, 60);
  assert.deepEqual(deriveReportInsights({ ...report, totals: { ...current.totals, spendCount: 1 } }), []);
  assert.deepEqual(deriveReportInsights({ ...report, largestSpend: { amountUSD: 30 } }), []);
});

test("repeated skipped purchases give a useful insight without spending data", () => {
  const [insight] = deriveReportInsights({ declineBuckets: [
    { displayTitle: "Coffee", count: 3, amountUSD: 18 },
  ] });
  assert.equal(insight.key, "reportsPatternSaved");
  assert.equal(insight.amounts.amount, 18);
  // A deposit is not a skipped purchase, even if the saving total is large.
  assert.deepEqual(deriveReportInsights({ totals: { savedCount: 20, savedUSD: 900 } }), []);
});

test("snapshot connects adjacent periods and preserves exclusions, archive and boundaries", () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(require("node:path").join(__dirname, "../../App.js"), "utf8");
  const code = source.slice(source.indexOf("const buildReportPeriods ="), source.indexOf("const reportHasMeaningfulData ="));
  const dayKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const build = vm.runInNewContext(`${code}\nbuildReportsSnapshot`, {
    DEFAULT_LANGUAGE: "en", DEFAULT_PROFILE: { currency: "USD" }, DAY_MS: 86400000,
    REPORTS_WEEK_COUNT: 4, REPORTS_MONTH_COUNT: 3,
    REPORTS_EXCLUDED_SPEND_CATEGORY_IDS: new Set(["essential"]),
    IMPULSE_CATEGORY_DEFS: { food: {}, essential: {} }, IMPULSE_CATEGORY_ORDER: ["food", "essential"],
    normalizeImpulseCategoryId: (value) => value, getFormatLocale: () => "en-US",
    stripEmojis: (value) => value, getDayKey: dayKey, getReportWeekKey: dayKey,
    formatReportMonthLabel: dayKey, formatReportWeekLabel: dayKey,
    getWeekStartMonday: (value) => {
      const date = new Date(value); date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (date.getDay() + 6) % 7); return date;
    },
    isSaveEvent: (kind) => kind === "refuse_spend",
    isStatsSaveEvent: (kind) => ["refuse_spend", "income_savings"].includes(kind),
    isWeekendTimestamp: (value) => [0, 6].includes(new Date(value).getDay()),
    deriveReportInsights, reportCalendarDayCount,
  });
  const event = (month, day, amount, kind = "spend", category = "food") => ({
    timestamp: new Date(2026, month - 1, day, 12).getTime(), kind,
    meta: { amountUSD: amount, category, title: "Coffee", templateId: "coffee" },
  });
  const history = [event(8, 2, 100), event(8, 3, 100), event(8, 4, 110),
    event(9, 2, 150), event(9, 3, 150), event(9, 4, 150),
    event(9, 5, 9000, "spend", "essential"), event(10, 1, 999),
    event(9, 6, 50, "income_savings"), event(9, 7, 5, "refuse_spend")];
  const snapshot = build({ history, now: new Date(2026, 9, 9).getTime(), joinedAt: new Date(2026, 6, 1).getTime() });
  assert.equal(snapshot.weekly.length, 4);
  assert.equal(snapshot.monthly.length, 3);
  const report = snapshot.monthly[0];
  assert.equal(report.totals.spendUSD, 450);
  assert.equal(report.totals.savedUSD, 55);
  assert.equal(report.declineBuckets[0].amountUSD, 5);
  assert.equal(report.patternInsights[0].values.percent, 50);
  assert.equal(report.spendBuckets[0].count, 3);
  assert.equal(report.largestSpend.amountUSD, 150);
  const partial = build({ history, now: new Date(2026, 9, 9).getTime(), joinedAt: new Date(2026, 8, 2).getTime() });
  assert.equal(partial.monthly.length, 1);
  assert.equal(partial.monthly[0].completePeriod, false);
  assert.ok(partial.monthly[0].patternInsights.every((insight) => insight.key !== "reportsPatternUp"));
});

test("calendar-day count remains correct across DST and partial joining days", () => {
  const previousZone = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    assert.equal(reportCalendarDayCount(new Date(2026, 2, 1).getTime(), new Date(2026, 3, 1).getTime()), 31);
    assert.equal(reportCalendarDayCount(new Date(2026, 10, 1).getTime(), new Date(2026, 11, 1).getTime()), 30);
    assert.equal(reportCalendarDayCount(new Date(2026, 9, 1, 12).getTime(), new Date(2026, 9, 3).getTime()), 2);
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});
