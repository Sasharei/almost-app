import React, { useMemo, useRef } from "react";
import { PanResponder, Platform, StyleSheet, UIManager, View, requireNativeComponent } from "react-native";

let NativeEdge;
function nativeEdge() {
  if (Platform.OS !== "ios") return null;
  try {
    if (!NativeEdge && UIManager.getViewManagerConfig("NativeEdgeBackGesture")) {
      NativeEdge = requireNativeComponent("NativeEdgeBackGesture");
    }
  } catch (_error) { /* Installed older builds retain the directional fallback. */ }
  return NativeEdge;
}
export default function EdgeBackGesture({ onBack, fallbackHandlers }) {
  const callback = useRef(onBack);
  callback.current = onBack;
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dx > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx >= 64 && Math.abs(gesture.dy) < 80) callback.current?.();
    },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const Native = nativeEdge();
  return Native ? <Native style={styles.edge} onBack={() => callback.current?.()} accessible={false} /> :
    <View style={styles.edge} {...(fallbackHandlers || responder.panHandlers)} accessible={false} />;
}
const styles = StyleSheet.create({ edge: { position: "absolute", left: 0, top: 0, bottom: 0, width: 24, zIndex: 100 } });
