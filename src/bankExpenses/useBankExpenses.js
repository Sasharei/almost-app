import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, NativeEventEmitter, NativeModules, Platform } from "react-native";
import { expensePremiumUntil } from "./premiumAccess";
import { BANK_EXPENSE_COPY } from "../constants/bankExpenseCopy";
import { normalizeLanguage, resolveTranslationLanguage } from "../utils/language";

export function expenseCopy(language) {
  return BANK_EXPENSE_COPY[normalizeLanguage(language)] || BANK_EXPENSE_COPY[resolveTranslationLanguage(language)] || BANK_EXPENSE_COPY.en;
}

export function useBankExpenses(language, premiumState = {}, entitlementHydrated = false) {
  const native = NativeModules.BankExpenses;
  const isPremium = !!premiumState.isPremium;
  const expiresAt = expensePremiumUntil(premiumState, Math.floor(Date.now() / 3600000) * 3600000);
  const accessResolved = premiumState.enabled || entitlementHydrated;
  useEffect(() => {
    if (!native || !accessResolved) return;
    // No expiry on an active non-lifetime entitlement: bounded offline lease, renewed on foreground sync.
    const sync = () => native.setPremiumAccess(expiresAt).catch(() => {});
    void sync();
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") void sync(); });
    return () => sub.remove();
  }, [native, accessResolved, isPremium, expiresAt]);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState(null);
  const [apps, setApps] = useState([]);
  const [selected, setSelected] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  const operation = useRef(false);
  const baseCopy = expenseCopy(language);
  const copy = Platform.OS === "ios" ? { ...baseCopy, noticeTitle: baseCopy.walletRecorded, noticeBody: baseCopy.walletNoticeBody } : baseCopy;
  useEffect(() => {
    // Optional work is deferred; it never gates application or attribution startup.
    const timer = setTimeout(() => {
      native?.setNoticeCopy(copy.noticeTitle, copy.noticeBody).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [copy.noticeTitle, copy.noticeBody, native]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async (work) => {
    if (!native || operation.current) return false;
    operation.current = true;
    setBusy(true); setError(false);
    try { return await work(); }
    catch { if (mounted.current) setError(true); return false; }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }, [native]);
  const refresh = useCallback(() => run(async () => {
    const [next, page, sources] = await Promise.all([
      native.status().then(JSON.parse), native.page(0).then(JSON.parse),
      Platform.OS === "android" ? native.sources().then(JSON.parse) : Promise.resolve([]),
    ]);
    if (!mounted.current) return;
    setStatus(next); setSelected(next.sources); setItems(page.items); setTotal(page.total); setNextOffset(page.items.length); setRevision(page.revision); setApps(sources);
  }), [native, run]);
  useEffect(() => { if (visible) void refresh(); }, [visible, refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => { if (visible && state === "active") void refresh(); });
    return () => sub.remove();
  }, [refresh, visible]);
  useEffect(() => {
    if (Platform.OS !== "ios" || !native || !visible) return;
    const sub = new NativeEventEmitter(native).addListener("BankExpensesChanged", () => { void refresh(); });
    return () => sub.remove();
  }, [native, visible, refresh]);
  const configure = useCallback((enabled) => run(async () => {
    if (enabled && (!isPremium || expiresAt <= Date.now())) return false;
    await native.configure(enabled, selected, copy.noticeTitle, copy.noticeBody);
    setStatus(JSON.parse(await native.status()));
    return true;
  }), [copy.noticeBody, copy.noticeTitle, native, run, selected, isPremium, expiresAt]);
  const more = () => run(async () => {
    let page = JSON.parse(await native.page(nextOffset));
    if (page.total !== total || page.revision !== revision) {
      page = JSON.parse(await native.page(0));
      setItems(page.items); setTotal(page.total); setNextOffset(page.items.length); setRevision(page.revision);
      return;
    }
    // Stable IDs protect against newly inserted rows shifting pagination while this screen is open.
    setItems((prev) => [...prev, ...page.items.filter((entry) => !prev.some((old) => old.id === entry.id))]);
    setTotal(page.total);
    setNextOffset((prev) => prev + page.items.length);
  });
  const update = (id, amount, currency, remove = false, category = null) => run(async () => {
    if (!remove && category && native.updateCategorized) await native.updateCategorized(id, amount, currency, category);
    else await native.update(id, amount, currency, remove);
    const page = JSON.parse(await native.page(0)); setItems(page.items); setTotal(page.total); setNextOffset(page.items.length); setRevision(page.revision);
    return true;
  });
  const separateDuplicate = (id) => run(async () => {
    await native.separateDuplicate(id);
    const page = JSON.parse(await native.page(0));
    setItems(page.items); setTotal(page.total); setNextOffset(page.items.length); setRevision(page.revision);
    return true;
  });
  const permission = () => run(() => native.openPermission());
  const openWalletAutomation = () => run(() => native.installWalletAutomation());
  const reset = useCallback(async () => {
    if (native) await native.reset();
    setStatus(null); setItems([]); setSelected([]); setTotal(0); setVisible(false);
  }, [native]);
  const open = useCallback(() => { setVisible(true); void refresh(); }, [refresh]);
  return { isPremium: isPremium && expiresAt > Date.now(), supported: !!native && (Platform.OS === "ios" || Platform.OS === "android"), copy, visible, setVisible, open, status, apps, selected, setSelected, items, total, busy, error, refresh, configure, more, update, separateDuplicate, permission, openWalletAutomation, reset, hasMore: nextOffset < total };
}
