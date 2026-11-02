// One amount source for manual decisions, displayed cards and automatic collection.
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
function buildDecisionAmountStats(events = []) {
  const stats = Object.create(null);
  for (const event of events || []) {
    if (!["refuse_spend", "spend", "pending_to_decline"].includes(event?.kind)) continue;
    const meta = event.meta || {};
    const amount = positive(meta.amountUSD);
    if (!amount) continue;
    for (const key of new Set([meta.templateId, meta.template_id, meta.id, meta.template].filter((key) => typeof key === "string" && key.trim()).map((key) => key.trim()))) {
      const entry = stats[key] || { totalAmountUSD: 0, sampleCount: 0 };
      const timestamp = positive(event.timestamp);
      const newest = !entry.lastAmountUSD || timestamp > (entry.lastAmountAt || 0);
      stats[key] = { totalAmountUSD: entry.totalAmountUSD + amount, sampleCount: entry.sampleCount + 1,
        lastAmountUSD: newest ? amount : entry.lastAmountUSD,
        lastAmountAt: newest ? timestamp : entry.lastAmountAt };
    }
  }
  return stats;
}
function resolveRememberedAmount(interaction, history, fallback, { currency, rate = 1 } = {}) {
  const interactionAt = Math.max(positive(interaction?.lastSavedAt), positive(interaction?.lastSpentAt));
  if (positive(history?.lastAmountUSD) && (!positive(interaction?.lastAmountUSD) || (positive(history.lastAmountAt) > interactionAt && Math.abs(history.lastAmountUSD - interaction.lastAmountUSD) > 1e-9))) return history.lastAmountUSD;
  if (positive(interaction?.lastAmountUSD) && currency && interaction.lastAmountCurrency === currency && positive(interaction.lastAmountLocal) && positive(rate)) return interaction.lastAmountLocal / rate;
  return positive(interaction?.lastAmountUSD) || positive(history?.lastAmountUSD) || positive(interaction?.averageAmountUSD) || positive(fallback);
}
function recordAmountSample(previous = {}, amount, history, { currency, localAmount } = {}) {
  if (!positive(amount)) return {};
  const count = positive(history?.sampleCount) || positive(previous.amountSampleCount);
  const total = positive(history?.totalAmountUSD) || positive(previous.averageAmountUSD) * count;
  return { lastAmountUSD: Number(amount), amountSampleCount: count + 1, averageAmountUSD: (total + Number(amount)) / (count + 1),
    // Clear stale local memory when a caller records a new USD-only sample.
    ...((currency && positive(localAmount)) || previous.lastAmountCurrency ? {
      lastAmountCurrency: currency && positive(localAmount) ? currency : null,
      lastAmountLocal: currency && positive(localAmount) ? Number(localAmount) : null,
    } : {}) };
}
module.exports = { buildDecisionAmountStats, resolveRememberedAmount, recordAmountSample };
