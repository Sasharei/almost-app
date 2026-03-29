import { useEffect, useMemo, useState } from "react";
import { calcPotentialSaved } from "../utils/savingsSimulation";

const roundPotentialValue = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

type SavingsSimulationOptions = {
  enabled?: boolean;
  updateIntervalMs?: number;
};

export function useSavingsSimulation(
  baselineMonthlyWaste: number | null,
  baselineStartAt: string | null,
  spentLossUSD: number | null = 0,
  options: SavingsSimulationOptions = {}
) {
  const enabled = options.enabled !== false;
  const updateIntervalMs = Math.max(16, Number(options.updateIntervalMs) || 40);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !baselineMonthlyWaste || !baselineStartAt) return undefined;
    setNowMs(Date.now());
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, updateIntervalMs);
    return () => clearInterval(intervalId);
  }, [baselineMonthlyWaste, baselineStartAt, enabled, updateIntervalMs]);

  return useMemo(() => {
    if (!baselineMonthlyWaste || !baselineStartAt) {
      return 0;
    }
    return roundPotentialValue(
      calcPotentialSaved(
        baselineMonthlyWaste,
        baselineStartAt,
        new Date(nowMs),
        Math.max(0, Number(spentLossUSD) || 0)
      )
    );
  }, [baselineMonthlyWaste, baselineStartAt, nowMs, spentLossUSD]);
}
