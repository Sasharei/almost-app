import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, NativeEventEmitter, NativeModules, Platform } from "react-native";

export function useWalletHistory() {
  const native = Platform.OS === "ios" ? NativeModules.BankExpenses : null;
  const [items, setItems] = useState([]);
  const running = useRef(false);
  const lastRevision = useRef(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  const retryTimer = useRef(null);
  const retries = useRef(0);
  const refresh = useCallback(async () => {
    if (!native) return;
    clearTimeout(retryTimer.current);
    if (running.current) { pending.current = true; return; }
    running.current = true;
    try {
      do {
        pending.current = false;
        let page = JSON.parse(await native.page(0));
        const revision = page.revision;
        if (revision === lastRevision.current) continue;
        const next = [...page.items];
        while (next.length < page.total) {
          page = JSON.parse(await native.page(next.length));
          if (page.revision !== revision) { pending.current = true; break; }
          if (!page.items.length) throw new Error("expense_page_incomplete");
          next.push(...page.items);
        }
        if (!pending.current && mounted.current) { lastRevision.current = revision; setItems(next); }
      } while (pending.current && mounted.current);
      retries.current = 0;
    } catch {
      // A locked database or an interrupted bridge call must not leave history
      // stale until the user next backgrounds the app. Retain the complete
      // snapshot and retry transient failures with a bounded backoff.
      if (mounted.current && retries.current < 3) {
        retries.current += 1;
        retryTimer.current = setTimeout(() => { void refresh(); }, retries.current * 1000);
      }
    } finally { running.current = false; }
  }, [native]);
  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => { void refresh(); }, 1000);
    const app = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    const event = native ? new NativeEventEmitter(native).addListener("BankExpensesChanged", refresh) : null;
    return () => { mounted.current = false; clearTimeout(timer); clearTimeout(retryTimer.current); app.remove(); event?.remove(); };
  }, [native, refresh]);
  return items;
}
