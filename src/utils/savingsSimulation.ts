type HistorySpendEvent = {
  kind?: string;
  timestamp?: number | string;
  meta?: {
    amountUSD?: number | string;
  };
};

const POTENTIAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const resolveEventTimestamp = (value: number | string | undefined): number => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

const resolveBaselineTimestamp = (baselineStartAt: string | null | undefined): number => {
  if (!baselineStartAt) return 0;
  const baselineStart = new Date(baselineStartAt).getTime();
  if (!Number.isFinite(baselineStart) || baselineStart <= 0) return 0;
  return baselineStart;
};

export function calcSpentLossInCurrentMonth(
  historyEvents: HistorySpendEvent[] | null | undefined,
  baselineStartAt: string | null | undefined,
  now: Date = new Date()
): number {
  if (!Array.isArray(historyEvents) || historyEvents.length === 0) {
    return 0;
  }
  const baselineTimestamp = resolveBaselineTimestamp(baselineStartAt);
  if (!baselineTimestamp) return 0;
  const nowTimestamp = now.getTime();
  if (!Number.isFinite(nowTimestamp) || nowTimestamp <= 0 || nowTimestamp < baselineTimestamp) {
    return 0;
  }

  return historyEvents.reduce((sum, event) => {
    if (!event || event.kind !== "spend") return sum;
    const timestamp = resolveEventTimestamp(event.timestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > nowTimestamp) return sum;
    if (timestamp < baselineTimestamp) return sum;
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

  const baselineStart = resolveBaselineTimestamp(baselineStartAt);
  if (!baselineStart) return 0;
  const nowTimestamp = now.getTime();
  if (!Number.isFinite(nowTimestamp) || nowTimestamp <= 0 || nowTimestamp < baselineStart) {
    return 0;
  }

  const monthlyPotential = Math.max(0, Number(baselineMonthlyWaste) || 0);
  const normalizedSpentLoss = Math.max(0, Number(spentLossUSD) || 0);
  if (monthlyPotential <= 0) return 0;

  const elapsedMs = Math.max(0, nowTimestamp - baselineStart);
  const generatedPotential = monthlyPotential * (elapsedMs / POTENTIAL_WINDOW_MS);
  return Math.max(0, generatedPotential - normalizedSpentLoss);
}
