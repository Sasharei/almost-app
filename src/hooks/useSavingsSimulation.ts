import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { calcPotentialSaved } from "../utils/savingsSimulation";

const DEFAULT_UPDATE_INTERVAL_MS = 1000;
const MIN_UPDATE_INTERVAL_MS = 250;
const MIN_VALUE_DELTA = 0.0001;
const roundPotentialValue = (value: number) => Math.round(value * 10_000) / 10_000;

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
  const latestValueRef = useRef(0);
  const [potentialSaved, setPotentialSaved] = useState(0);
  const enabled = options.enabled !== false;
  const updateIntervalMs = Math.max(
    MIN_UPDATE_INTERVAL_MS,
    Number(options.updateIntervalMs) || DEFAULT_UPDATE_INTERVAL_MS
  );

  useEffect(() => {
    if (!baselineMonthlyWaste || !baselineStartAt) {
      if (latestValueRef.current !== 0) {
        latestValueRef.current = 0;
        setPotentialSaved(0);
      }
      return undefined;
    }

    const update = () => {
      const nextValue = roundPotentialValue(
        calcPotentialSaved(
          baselineMonthlyWaste,
          baselineStartAt,
          new Date(),
          Math.max(0, Number(spentLossUSD) || 0)
        )
      );
      if (Math.abs(nextValue - latestValueRef.current) < MIN_VALUE_DELTA) return;
      latestValueRef.current = nextValue;
      setPotentialSaved(nextValue);
    };

    if (!enabled) {
      update();
      return undefined;
    }

    const isActiveState = (state: string | null | undefined) =>
      state === "active" || !state;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        update();
      }, updateIntervalMs);
    };
    const stop = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };
    const refresh = () => {
      update();
      if (isActiveState(AppState.currentState)) {
        start();
        return;
      }
      stop();
    };

    refresh();
    const subscription = AppState?.addEventListener?.("change", (nextState) => {
      if (isActiveState(nextState)) {
        update();
        start();
        return;
      }
      stop();
    });

    return () => {
      stop();
      subscription?.remove?.();
    };
  }, [baselineMonthlyWaste, baselineStartAt, enabled, spentLossUSD, updateIntervalMs]);

  return potentialSaved;
}
