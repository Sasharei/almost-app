import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { eligibleShoppingSavings, hasShoppingDecision } from "./eligibleSavings";
import { STORAGE_KEYS } from "../constants/appBehavior";

const PROMPT_KEY = "almost.shoppingPause.promptDismissed.v1";
const OFFER_KEY = "almost.shoppingPause.offerShown.v2";
const COHORT_KEY = "almost.shoppingPause.offerCohort.v2";
const COPY_KEYS = ["blockSelectApps", "blockPickerHint", "blockContinue", "blockCancel",
  "blockChooseStore", "blockUnlock", "blockPassHint", "blockShieldBody", "blockClose"];

export function useShoppingBlocker({ history, hydrated, t, language }) {
  const native = Platform.OS === "ios" ? NativeModules.ShoppingBlocker : null;
  const [status, setStatus] = useState(null);
  const [errorKey, setErrorKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [visible, updateVisible] = useState(false);
  const [settings, setSettings] = useState(false);
  const [offering, setOffering] = useState(false);
  const [offerHydrated, setOfferHydrated] = useState(false);
  const [offered, setOffered] = useState(true);
  const [existingUser, setExistingUser] = useState(false);
  const offeredRef = useRef(false);
  const [dismissed, setDismissed] = useState(true);
  const queue = useRef(Promise.resolve());
  const statusTiming = useRef(null);
  const latest = useRef({});
  const mounted = useRef(true);
  const events = useMemo(() => eligibleShoppingSavings(history), [history]);
  const copy = useMemo(() => ({ ...Object.fromEntries(COPY_KEYS.map((key) => [key, t(key)])), locale: language }), [t, language]);
  latest.current = { events, copy, language };

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(PROMPT_KEY).then((value) => {
      if (mounted.current) setDismissed(value === "1");
    }).catch(() => {});
    AsyncStorage.multiGet([OFFER_KEY, COHORT_KEY, STORAGE_KEYS.ONBOARDING]).then(async (rows) => {
      const stored = Object.fromEntries(rows);
      const cohort = stored[COHORT_KEY] || (stored[STORAGE_KEYS.ONBOARDING] === "done" ? "existing" : "new");
      // Persist the initial cohort so a fresh install doesn't become an
      // "existing" user merely by restarting before its first decision.
      if (!stored[COHORT_KEY]) await AsyncStorage.setItem(COHORT_KEY, cohort);
      if (!mounted.current) return;
      offeredRef.current = offeredRef.current || stored[OFFER_KEY] === "1";
      setExistingUser(cohort === "existing");
      setOffered(offeredRef.current);
      setOfferHydrated(true);
    }).catch(() => {});
    return () => { mounted.current = false; };
  }, []);

  // All native writes, including history sync, are ordered. A delayed refresh
  // cannot restore a session that the user has just ended.
  const perform = useCallback((operation, interactive = true) => {
    const task = queue.current.catch(() => {}).then(async () => {
      if (interactive && mounted.current) setBusy(true);
      try {
        const result = await operation();
        if (mounted.current) {
          if (typeof result?.supported === "boolean") {
            // Native polling returns a new object even when its primitive
            // status values have not changed. Keep React's state reference in
            // that case without caching or skipping the native reconciliation.
            // Time-based UI eligibility can change with an identical payload.
            const now = Date.now();
            const timing = {
              openPass: result.unlockUntil > now,
              canEditGoal: !!result.needsNextGoal || now >= result.goalChangeAvailableAt,
            };
            const timingChanged = !statusTiming.current ||
              timing.openPass !== statusTiming.current.openPass ||
              timing.canEditGoal !== statusTiming.current.canEditGoal;
            statusTiming.current = timing;
            const keys = Object.keys(result);
            setStatus((previous) => !timingChanged && previous &&
              Object.keys(previous).length === keys.length &&
              keys.every((key) => Object.prototype.hasOwnProperty.call(previous, key) && Object.is(previous[key], result[key]))
              ? previous : result);
          }
          setErrorKey(null);
        }
        return result;
      } catch (error) {
        if (mounted.current) {
          setErrorKey(["blockPermissionError", "blockSelectionError"].includes(error?.code) ? error.code : "blockError");
        }
        return null;
      } finally {
        if (interactive && mounted.current) setBusy(false);
      }
    });
    queue.current = task;
    return task;
  }, []);

  const refresh = useCallback(() => {
    if (!hydrated) return Promise.resolve(null);
    if (!native) { setStatus({ supported: false }); return Promise.resolve(null); }
    return perform(() => native.sync(latest.current.events, latest.current.copy), false);
  }, [hydrated, native, perform]);

  useEffect(() => { refresh(); }, [refresh, events, copy]);
  useEffect(() => {
    if (Platform.OS !== "ios") return undefined;
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    const interval = setInterval(() => { if (AppState.currentState === "active") refresh(); }, 15000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, [refresh]);

  const dismissPrompt = useCallback(async () => {
    setDismissed(true);
    await AsyncStorage.setItem(PROMPT_KEY, "1").catch(() => {});
  }, []);
  const markOffered = useCallback(() => {
    offeredRef.current = true;
    setOffered(true);
    AsyncStorage.setItem(OFFER_KEY, "1").catch(() => {});
  }, []);
  const setVisible = useCallback((next) => {
    if (next) markOffered();
    setOffering(false);
    setSettings(false);
    updateVisible(next);
  }, [markOffered]);
  const openSettings = useCallback(() => { setVisible(true); setSettings(true); }, [setVisible]);
  const presentOffer = useCallback(() => {
    if (offeredRef.current) return;
    markOffered();
    setOffering(true);
    updateVisible(true);
  }, [markOffered]);
  const acceptOffer = useCallback(() => setOffering(false), []);
  const declineOffer = useCallback(() => {
    setVisible(false);
    dismissPrompt();
  }, [setVisible, dismissPrompt]);
  const authorize = useCallback(() => perform(() => native.authorize()), [native, perform]);
  const selectApps = useCallback(() => perform(() => native.selectApps(latest.current.copy)), [native, perform]);
  const start = useCallback((goalUSD, currency, goalAmount) => perform(() => native.start(goalUSD, currency, goalAmount, latest.current.events, latest.current.copy)), [native, perform]);
  const updateGoal = useCallback((goalUSD, currency, goalAmount) => perform(() => native.updateGoal(goalUSD, currency, goalAmount)), [native, perform]);
  const unlock = useCallback(() => perform(async () => {
    // Revalidate against current edited/deleted history before presenting a pass.
    const current = await native.sync(latest.current.events, latest.current.copy);
    if (!current.ready || !current.authorized || current.unlockUntil > Date.now()) return current;
    const result = await native.unlock(latest.current.copy);
    if (result?.needsNextGoal && mounted.current) {
      setSettings(false); setOffering(false); updateVisible(true);
    }
    return result;
  }), [native, perform]);
  const stop = useCallback(() => perform(async () => {
    if (!native) return { supported: false };
    const result = await native.stop();
    await dismissPrompt();
    return result;
  }), [native, perform, dismissPrompt]);

  return {
    status, errorKey, busy, visible, offering, settings, openSettings, setVisible, presentOffer, acceptOffer, declineOffer,
    offerPending: Platform.OS === "ios" && hydrated && offerHydrated && !offered &&
      (existingUser || hasShoppingDecision(history)) && status?.supported && !status?.active && !visible,
    refresh, authorize, selectApps, start, updateGoal, unlock, stop,
    dismissPrompt, showPrompt: Platform.OS === "ios" && hydrated && events.length > 0 &&
      status?.supported && !status?.active && !dismissed,
  };
}
