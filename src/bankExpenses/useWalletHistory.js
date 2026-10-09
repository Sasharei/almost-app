import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, NativeEventEmitter, NativeModules, Platform } from "react-native";

export function useWalletHistory() {
  const native = Platform.OS === "ios" ? NativeModules.BankExpenses : null;
  const [items, setItems] = useState([]);
  const running = useRef(false);
  const lastRevision = useRef(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (!native) return;
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
    } catch {
      // Keep the last complete snapshot. Foreground and native changes retry.
    } finally { running.current = false; }
  }, [native]);
  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => { void refresh(); }, 1000);
    const app = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    const event = native ? new NativeEventEmitter(native).addListener("BankExpensesChanged", refresh) : null;
    return () => { mounted.current = false; clearTimeout(timer); app.remove(); event?.remove(); };
  }, [native, refresh]);
  return items;
}
