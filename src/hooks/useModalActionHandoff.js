import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

// iOS must finish dismissing the presenting modal before opening another one.
export function useModalActionHandoff(visible, onClose, onAction) {
  const pending = useRef(null);
  const finish = useCallback(() => {
    const entry = pending.current;
    pending.current = null;
    if (entry) onAction?.(entry);
  }, [onAction]);
  useEffect(() => {
    if (!visible && Platform.OS !== "ios") finish();
  }, [visible, finish]);
  const select = useCallback((entry) => {
    if (pending.current) return;
    pending.current = entry;
    onClose();
  }, [onClose]);
  return { select, onDismiss: finish };
}
