import { createContext, useContext } from "react";

type SavingsContextValue = {
  savedTotalUSD: number;
};

const SavingsContext = createContext<SavingsContextValue>({ savedTotalUSD: 0 });

export const SavingsProvider = SavingsContext.Provider;

export function useRealSavedAmount() {
  const context = useContext(SavingsContext);
  return context?.savedTotalUSD || 0;
}
