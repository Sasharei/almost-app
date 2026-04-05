type HistorySpendEvent = {
  kind?: string;
  timestamp?: number | string | Date;
  meta?: {
    amountUSD?: number | string;
  };
};

const POTENTIAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeTimestampMs = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  let parsed = 0;
  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) {
      parsed = numericValue;
    } else {
      const dateValue = Date.parse(trimmed);
      parsed = Number.isFinite(dateValue) ? dateValue : 0;
    }
  } else if (value instanceof Date) {
    parsed = value.getTime();
  } else if (typeof value === "object") {
    const objectValue = value as {
      seconds?: unknown;
      nanoseconds?: unknown;
      _seconds?: unknown;
      _nanoseconds?: unknown;
      timestamp?: unknown;
    };
    const secondsCandidate = Number(
      objectValue.seconds ?? objectValue._seconds ?? 0
    );
    const nanosCandidate = Number(
      objectValue.nanoseconds ?? objectValue._nanoseconds ?? 0
    );
    if (Number.isFinite(secondsCandidate) && secondsCandidate > 0) {
      parsed = secondsCandidate * 1000 + (Number.isFinite(nanosCandidate) ? nanosCandidate / 1e6 : 0);
    } else if (objectValue.timestamp !== undefined) {
      parsed = normalizeTimestampMs(objectValue.timestamp);
    }
  }
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  // Handle legacy timestamps that may be in seconds/microseconds/nanoseconds.
  if (parsed > 1e18) {
    parsed = Math.round(parsed / 1e6);
  } else if (parsed > 1e15) {
    parsed = Math.round(parsed / 1e3);
  } else if (parsed < 1e11) {
    parsed = Math.round(parsed * 1e3);
  }
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
};

const resolveEventTimestamp = (value: number | string | Date | undefined): number => {
  return normalizeTimestampMs(value);
};

const resolveBaselineTimestamp = (baselineStartAt: string | number | Date | null | undefined): number => {
  return normalizeTimestampMs(baselineStartAt);
};

const resolveMonthStartTimestamp = (now: Date): number => {
  const timestamp = now.getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0;
  const monthStart = new Date(timestamp);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartTimestamp = monthStart.getTime();
  if (!Number.isFinite(monthStartTimestamp) || monthStartTimestamp <= 0) return 0;
  return monthStartTimestamp;
};

export function calcSpentLossInCurrentMonth(
  historyEvents: HistorySpendEvent[] | null | undefined,
  baselineStartAt: string | number | Date | null | undefined,
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
  const monthStartTimestamp = resolveMonthStartTimestamp(now);
  const effectiveStartTimestamp = monthStartTimestamp
    ? Math.max(baselineTimestamp, monthStartTimestamp)
    : baselineTimestamp;

  return historyEvents.reduce((sum, event) => {
    if (!event || event.kind !== "spend") return sum;
    const timestamp = resolveEventTimestamp(event.timestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > nowTimestamp) return sum;
    if (timestamp < effectiveStartTimestamp) return sum;
    const amount = Math.max(0, Number(event.meta?.amountUSD) || 0);
    if (!amount) return sum;
    return sum + amount;
  }, 0);
}

export const calcSpentLossSinceBaseline = calcSpentLossInCurrentMonth;

export function calcPotentialSaved(
  baselineMonthlyWaste: number,
  baselineStartAt: string | number | Date,
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
