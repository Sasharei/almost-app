const positive = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

const reportCalendarDayCount = (start, end) => {
  const first = new Date(start);
  const last = new Date(end - 1);
  const day = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.round((day(last) - day(first)) / 86400000) + 1);
};

// Only compare complete adjacent periods with enough recorded purchases. Missing
// records are not evidence of no spending; these are observations, not forecasts.
const deriveReportInsights = (report, previous) => {
  if (!report) return [];
  const insights = [];
  const totals = report.totals || {};
  const spend = positive(totals.spendUSD);
  const count = positive(totals.spendCount);
  const days = positive(totals.dayCount);
  const priorSpend = positive(previous?.totals?.spendUSD);
  const priorCount = positive(previous?.totals?.spendCount);
  const priorDays = positive(previous?.totals?.dayCount);
  if (report.completePeriod && previous?.completePeriod &&
      report.type === previous.type && report.startAt === previous.endAt &&
      count >= 3 && priorCount >= 3 && spend > 0 && priorSpend > 0 && days && priorDays) {
    const change = (spend / days) / (priorSpend / priorDays) - 1;
    insights.push({
      key: Math.abs(change) < 0.1 ? "reportsPatternSteady" : change > 0 ? "reportsPatternUp" : "reportsPatternDown",
      values: { percent: Math.round(Math.abs(change) * 100) },
      amounts: { current: spend / days, previous: priorSpend / priorDays },
    });
  }
  const repeated = (report.spendBuckets || [])
    .filter((bucket) => positive(bucket.count) >= 3 && positive(bucket.amountUSD) > 0)
    .sort((a, b) => b.amountUSD - a.amountUSD)[0];
  if (repeated) {
    insights.push({
      key: "reportsPatternRepeat",
      values: { title: repeated.displayTitle, count: repeated.count },
      amounts: { total: repeated.amountUSD, amount: repeated.amountUSD / repeated.count },
    });
  }
  const peak = report.largestSpend;
  if (count >= 3 && spend > 0 && positive(peak?.amountUSD) / spend >= 0.4) {
    insights.push({
      key: "reportsPatternLarge",
      values: { title: peak.displayTitle, percent: Math.round(peak.amountUSD / spend * 100) },
      amounts: { amount: peak.amountUSD },
    });
  }
  const repeatedSkip = (report.declineBuckets || [])
    .filter((bucket) => positive(bucket.count) >= 3 && positive(bucket.amountUSD) > 0)
    .sort((a, b) => b.amountUSD - a.amountUSD)[0];
  if (repeatedSkip) {
    insights.push({
      key: "reportsPatternSaved",
      values: { title: repeatedSkip.displayTitle, count: repeatedSkip.count },
      amounts: { amount: repeatedSkip.amountUSD },
    });
  }
  return insights.slice(0, 3);
};

module.exports = { deriveReportInsights, reportCalendarDayCount };
