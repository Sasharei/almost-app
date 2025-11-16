export function calcPotentialSaved(
  baselineMonthlyWaste: number,
  baselineStartAt: string,
  now: Date = new Date()
): number {
  if (!baselineMonthlyWaste || !baselineStartAt) return 0;

  const start = new Date(baselineStartAt).getTime();
  const current = now.getTime();
  if (Number.isNaN(start) || current <= start) return 0;

  const elapsedMs = current - start;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const dailyWaste = baselineMonthlyWaste / 30;
  const potentialSaved = dailyWaste * elapsedDays;

  return Math.max(0, potentialSaved);
}
