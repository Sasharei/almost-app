const HOUR = 3600000;
function buildAlmiWidgetContext({ history = [], budgetTotal, budgetRemaining, now = Date.now() } = {}) {
  const records = Array.isArray(history) ? history : [];
  const events = records.filter(event => ['spend', 'refuse_spend'].includes(event?.kind)
    && Number.isFinite(Number(event.timestamp)) && Number(event.timestamp) > 0
    && Number(event.timestamp) <= now && now - Number(event.timestamp) < 24 * HOUR
    && Number(event.amountUSD) > 0).sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  const latest = events[0];
  const result = { version: 1, financialUpdatedAt: now, eventAt: 0, eventScene: 'balance' };
  if (!latest) return result;
  result.eventAt = Number(latest.timestamp);
  if (latest.kind === 'refuse_spend') result.eventScene = 'savings_guard';
  else if (Number.isFinite(budgetTotal) && budgetTotal > 0 && Number.isFinite(budgetRemaining)) {
    if (budgetRemaining <= 0) result.eventScene = 'empty_treasury';
    else {
      const monthDays = new Date(new Date(now).getFullYear(), new Date(now).getMonth() + 1, 0).getDate();
      const spent = events.reduce((sum, event) => sum + (event.kind === 'spend' ? Number(event.amountUSD) : 0), 0);
      if (spent > 2 * budgetTotal / monthDays) result.eventScene = 'spending_fire';
    }
  }
  return result;
}
module.exports = { buildAlmiWidgetContext };
