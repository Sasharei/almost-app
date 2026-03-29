type HistorySpendEvent = {
  kind?: string;
  timestamp?: number | string;
  meta?: {
    amountUSD?: number | string;
  };
};

const resolveEventTimestamp = (value: number | string | undefined): number => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

export function calcSpentLossInCurrentMonth(
  historyEvents: HistorySpendEvent[] | null | undefined,
  baselineStartAt: string | null | undefined,
  now: Date = new Date()
): number {
  if (!Array.isArray(historyEvents) || historyEvents.length === 0) {
    return 0;
  }
  const nowTimestamp = now.getTime();
  if (!Number.isFinite(nowTimestamp) || nowTimestamp <= 0) return 0;
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const baselineTimestamp = baselineStartAt ? new Date(baselineStartAt).getTime() : 0;
  const hasBaselineFilter = Number.isFinite(baselineTimestamp) && baselineTimestamp > 0;

  return historyEvents.reduce((sum, event) => {
    if (!event || event.kind !== "spend") return sum;
    const timestamp = resolveEventTimestamp(event.timestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > nowTimestamp) return sum;
    if (hasBaselineFilter && timestamp < baselineTimestamp) return sum;
    const eventDate = new Date(timestamp);
    if (eventDate.getFullYear() !== currentYear || eventDate.getMonth() !== currentMonth) return sum;
    const amount = Math.max(0, Number(event.meta?.amountUSD) || 0);
    if (!amount) return sum;
    return sum + amount;
  }, 0);
}

export const calcSpentLossSinceBaseline = calcSpentLossInCurrentMonth;

export function calcPotentialSaved(
  baselineMonthlyWaste: number,
  baselineStartAt: string,
  now: Date = new Date(),
  spentLossUSD: number = 0
): number {
  if (!baselineMonthlyWaste || !baselineStartAt) return 0;

  const baselineStart = new Date(baselineStartAt).getTime();
  const current = now.getTime();
  if (Number.isNaN(baselineStart) || current < baselineStart) return 0;

  const monthlyPotential = Math.max(0, Number(baselineMonthlyWaste) || 0);
  const normalizedSpentLoss = Math.max(0, Number(spentLossUSD) || 0);
  if (monthlyPotential <= 0) return 0;

  const nowDate = new Date(current);
  const monthStart = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    1,
    0,
    0,
    0,
    0
  ).getTime();
  const nextMonthStart = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  ).getTime();

  const effectiveStart = Math.max(monthStart, baselineStart);
  const monthWindowMs = Math.max(1, nextMonthStart - effectiveStart);
  const elapsedMs = Math.max(0, Math.min(current - effectiveStart, monthWindowMs));
  const generatedPotential = monthlyPotential * (elapsedMs / monthWindowMs);

  return Math.max(0, generatedPotential - normalizedSpentLoss);
}
