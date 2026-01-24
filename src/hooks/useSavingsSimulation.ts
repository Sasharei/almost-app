import { useEffect, useRef, useState } from "react";
import { calcPotentialSaved } from "../utils/savingsSimulation";

const UPDATE_INTERVAL_MS = 1000; // Tick every second so cents keep moving.
const MIN_VALUE_DELTA = 0.01;
const roundToCents = (value: number) => Math.round(value * 100) / 100;

export function useSavingsSimulation(
  baselineMonthlyWaste: number | null,
  baselineStartAt: string | null
) {
  const [potentialSaved, setPotentialSaved] = useState(0);
  const latestValueRef = useRef(0);

  useEffect(() => {
    if (!baselineMonthlyWaste || !baselineStartAt) {
      if (latestValueRef.current !== 0) {
        latestValueRef.current = 0;
        setPotentialSaved(0);
      }
      return;
    }

    const update = () => {
      const nextValue = roundToCents(calcPotentialSaved(baselineMonthlyWaste, baselineStartAt));
      if (Math.abs(nextValue - latestValueRef.current) < MIN_VALUE_DELTA) {
        return;
      }
      latestValueRef.current = nextValue;
      setPotentialSaved(nextValue);
    };

    update();
    const id = setInterval(update, UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [baselineMonthlyWaste, baselineStartAt]);

  return potentialSaved;
}
