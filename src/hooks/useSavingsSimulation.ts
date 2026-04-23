import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calcPotentialSaved } from "../utils/savingsSimulation";

const DEFAULT_UPDATE_INTERVAL_MS = 1000;
const MIN_UPDATE_INTERVAL_MS = 250;
const MIN_VALUE_DELTA = 0.0001;
const POTENTIAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const POTENTIAL_PERSIST_STORAGE_PREFIX = "@almost_potential_live_value_v1";
const POTENTIAL_PERSIST_INTERVAL_MS = 15_000;
const POTENTIAL_PERSIST_VALUE_DELTA = 0.01;
const roundPotentialValue = (value: number) => Math.round(value * 10_000) / 10_000;

const resolveAbsolutePotentialSaved = (
  baselineMonthlyWaste: number | null,
  baselineStartAt: string | null,
  spentLossUSD: number | null,
  now: Date = new Date()
): number | null => {
  if (!baselineMonthlyWaste || !baselineStartAt) return null;
  const absolutePotential = roundPotentialValue(
    calcPotentialSaved(
      baselineMonthlyWaste,
      baselineStartAt,
      now,
      Math.max(0, Number(spentLossUSD) || 0)
    )
  );
  if (!Number.isFinite(absolutePotential)) return null;
  return Math.max(0, absolutePotential);
};

type SavingsSimulationOptions = {
  enabled?: boolean;
  updateIntervalMs?: number;
  persist?: boolean;
};

export function useSavingsSimulation(
  baselineMonthlyWaste: number | null,
  baselineStartAt: string | null,
  spentLossUSD: number | null = 0,
  options: SavingsSimulationOptions = {}
) {
  const initialPotential =
    resolveAbsolutePotentialSaved(
      baselineMonthlyWaste,
      baselineStartAt,
      spentLossUSD,
      new Date()
    ) ?? 0;
  const latestValueRef = useRef(initialPotential);
  const lastUpdateAtRef = useRef<number | null>(null);
  const baselineKeyRef = useRef<string | null>(null);
  const storageKeyRef = useRef<string | null>(null);
  const lastPersistedValueRef = useRef<number | null>(null);
  const lastPersistedAtRef = useRef(0);
  const [potentialSaved, setPotentialSaved] = useState(initialPotential);
  const enabled = options.enabled !== false;
  const shouldPersist = options.persist !== false;
  const updateIntervalMs = Math.max(
    MIN_UPDATE_INTERVAL_MS,
    Number(options.updateIntervalMs) || DEFAULT_UPDATE_INTERVAL_MS
  );

  useEffect(() => {
    if (!baselineMonthlyWaste || !baselineStartAt) {
      baselineKeyRef.current = null;
      lastUpdateAtRef.current = null;
      storageKeyRef.current = null;
      lastPersistedValueRef.current = null;
      lastPersistedAtRef.current = 0;
      // Keep last known value during transient hydration gaps to avoid visible resets to 0.
      return undefined;
    }

    const baselineKey = `${baselineStartAt}:${Number(baselineMonthlyWaste) || 0}`;
    let cancelled = false;

    const persistPotentialValue = (value: number, force = false) => {
      if (!shouldPersist) return;
      const storageKey = storageKeyRef.current;
      if (!storageKey) return;
      const normalized = roundPotentialValue(Math.max(0, Number(value) || 0));
      if (!Number.isFinite(normalized)) return;
      const now = Date.now();
      const lastPersistedValue = Number(lastPersistedValueRef.current);
      const valueDelta = Number.isFinite(lastPersistedValue)
        ? Math.abs(normalized - lastPersistedValue)
        : Number.POSITIVE_INFINITY;
      const dueByTime = now - lastPersistedAtRef.current >= POTENTIAL_PERSIST_INTERVAL_MS;
      if (!force && valueDelta < POTENTIAL_PERSIST_VALUE_DELTA && !dueByTime) return;
      lastPersistedValueRef.current = normalized;
      lastPersistedAtRef.current = now;
      AsyncStorage.setItem(storageKey, String(normalized)).catch(() => {});
    };

    if (baselineKeyRef.current !== baselineKey) {
      baselineKeyRef.current = baselineKey;
      lastUpdateAtRef.current = null;
      storageKeyRef.current = shouldPersist
        ? `${POTENTIAL_PERSIST_STORAGE_PREFIX}:${baselineKey}`
        : null;
      lastPersistedValueRef.current = null;
      lastPersistedAtRef.current = 0;
      // Bootstrap from the real current value instead of forcing a temporary zero state.
      const bootstrapped =
        resolveAbsolutePotentialSaved(
          baselineMonthlyWaste,
          baselineStartAt,
          spentLossUSD,
          new Date()
        ) ?? 0;
      if (bootstrapped > latestValueRef.current + MIN_VALUE_DELTA) {
        latestValueRef.current = bootstrapped;
        setPotentialSaved(bootstrapped);
      }
      const expectedStorageKey = storageKeyRef.current;
      if (shouldPersist && expectedStorageKey) {
        AsyncStorage.getItem(expectedStorageKey)
          .then((value) => {
            if (cancelled) return;
            if (storageKeyRef.current !== expectedStorageKey) return;
            if (typeof value !== "string" || !value.length) return;
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            const normalized = roundPotentialValue(parsed);
            lastPersistedValueRef.current = normalized;
            if (normalized > latestValueRef.current + MIN_VALUE_DELTA) {
              latestValueRef.current = normalized;
              setPotentialSaved(normalized);
            }
          })
          .catch(() => {});
      }
    }

    const update = () => {
      const now = new Date();
      const nowTimestamp = now.getTime();
      const absolutePotential =
        resolveAbsolutePotentialSaved(
          baselineMonthlyWaste,
          baselineStartAt,
          spentLossUSD,
          now
        ) ?? 0;
      const previousValue = latestValueRef.current;
      const previousUpdateAt = lastUpdateAtRef.current;
      // Counter must not roll back during hydration/race conditions.
      let nextValue = Math.max(previousValue, absolutePotential);

      if (
        previousUpdateAt !== null &&
        Number.isFinite(previousUpdateAt) &&
        absolutePotential + MIN_VALUE_DELTA < previousValue
      ) {
        const deltaMs = Math.max(0, nowTimestamp - previousUpdateAt);
        const remainingMonthlyPotential = Math.max(
          0,
          Number(baselineMonthlyWaste) - Math.max(0, Number(spentLossUSD) || 0)
        );
        const growth = remainingMonthlyPotential * (deltaMs / POTENTIAL_WINDOW_MS);
        nextValue = roundPotentialValue(Math.max(nextValue, previousValue + growth));
      } else {
        nextValue = roundPotentialValue(nextValue);
      }

      lastUpdateAtRef.current = nowTimestamp;
      if (Math.abs(nextValue - previousValue) < MIN_VALUE_DELTA) {
        persistPotentialValue(nextValue);
        return;
      }
      latestValueRef.current = nextValue;
      setPotentialSaved(nextValue);
      persistPotentialValue(nextValue);
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
      persistPotentialValue(latestValueRef.current, true);
      stop();
    });

    return () => {
      cancelled = true;
      persistPotentialValue(latestValueRef.current, true);
      stop();
      subscription?.remove?.();
    };
  }, [baselineMonthlyWaste, baselineStartAt, enabled, shouldPersist, spentLossUSD, updateIntervalMs]);

  return potentialSaved;
}
