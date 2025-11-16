import { useEffect, useState } from "react";
import { calcPotentialSaved } from "../utils/savingsSimulation";

export function useSavingsSimulation(
  baselineMonthlyWaste: number | null,
  baselineStartAt: string | null
) {
  const [potentialSaved, setPotentialSaved] = useState(0);

  useEffect(() => {
    if (!baselineMonthlyWaste || !baselineStartAt) return;

    const update = () => {
      setPotentialSaved(calcPotentialSaved(baselineMonthlyWaste, baselineStartAt));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [baselineMonthlyWaste, baselineStartAt]);

  return potentialSaved;
}
