import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, I18nManager, PanResponder, Platform, StyleSheet, UIManager, View, requireNativeComponent, useWindowDimensions } from "react-native";
import { BACK_GESTURE_EDGE_WIDTH, BACK_GESTURE_TRIGGER_DISTANCE, BACK_GESTURE_VERTICAL_SLOP } from "../constants/tutorialUiConstants";
import { useMotionPreferences } from "../hooks/useMotionPreferences";

let NativeEdge;
function nativeEdge() {
  // Fabric interop hosts can render this legacy native view without routing
  // touches to its UIKit recognizer. Keep the leading-edge responder in the
  // renderer that owns the screen; the same native-driven translation is used.
  if (Platform.OS !== "ios" || globalThis.nativeFabricUIManager) return null;
  try {
    // Older installed shells expose only an ended callback. Use the tracking
    // fallback until the native shell supports progress and RTL together.
    const config = UIManager.getViewManagerConfig("NativeEdgeBackGesture");
    if (!config?.NativeProps?.isRTL || !config?.NativeProps?.onEdgeBackProgress) return null;
    if (!NativeEdge) NativeEdge = requireNativeComponent("NativeEdgeBackGesture");
  } catch (_error) { /* The same release/cancel rules apply in the fallback. */ }
  return NativeEdge;
}
export default function EdgeBackGesture({ onBack, rtl = I18nManager.isRTL, enabled = true, children }) {
  const callback = useRef(onBack);
  callback.current = onBack;
  const { reduceMotion } = useMotionPreferences();
  const { width } = useWindowDimensions();
  const translation = useRef(new Animated.Value(0)).current;
  const visibleDistance = useRef(0);
  const origin = useRef(0);
  const gestureVersion = useRef(0);
  const waitingForPosition = useRef(false);
  const pendingDx = useRef(0);
  const sign = rtl ? -1 : 1;
  useEffect(() => {
    const listener = translation.addListener(({ value }) => { visibleDistance.current = value; });
    return () => { translation.stopAnimation(); translation.removeListener(listener); };
  }, [translation]);
  const restore = useCallback((velocity = 0) => {
    gestureVersion.current += 1;
    waitingForPosition.current = false;
    translation.stopAnimation();
    if (reduceMotion) translation.setValue(0);
    else Animated.spring(translation, { toValue: 0, stiffness: 320, damping: 36, mass: 1, velocity: Number.isFinite(velocity) ? velocity : 0, overshootClamping: true, useNativeDriver: true }).start();
  }, [reduceMotion, translation]);
  const begin = useCallback(() => {
    const version = ++gestureVersion.current;
    waitingForPosition.current = true;
    pendingDx.current = 0;
    translation.stopAnimation((value) => {
      if (version !== gestureVersion.current) return;
      origin.current = value;
      visibleDistance.current = value;
      waitingForPosition.current = false;
      translation.setValue(Math.min(width, Math.max(0, value + pendingDx.current * sign)));
    });
  }, [sign, translation, width]);
  const move = useCallback((dx) => {
    pendingDx.current = dx;
    if (waitingForPosition.current) return;
    translation.setValue(Math.min(width, Math.max(0, origin.current + dx * sign)));
  }, [sign, translation, width]);
  const commit = useCallback(() => {
    gestureVersion.current += 1;
    waitingForPosition.current = false;
    translation.stopAnimation();
    translation.setValue(0);
    visibleDistance.current = 0;
    callback.current?.();
  }, [translation]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => enabled && gesture.dx * sign > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderGrant: begin,
    onPanResponderMove: (_event, gesture) => move(gesture.dx),
    onPanResponderRelease: (_event, gesture) => {
      const distance = Math.max(0, (waitingForPosition.current ? visibleDistance.current : origin.current) + gesture.dx * sign);
      if (Math.abs(gesture.dy) < BACK_GESTURE_VERTICAL_SLOP && (distance >= BACK_GESTURE_TRIGGER_DISTANCE || (distance > 20 && gesture.vx * sign > 0.5))) commit();
      else restore(gesture.vx * sign * 1000);
    },
    // An OS interruption or another recognizer taking ownership must cancel.
    onPanResponderTerminate: restore,
    onPanResponderTerminationRequest: () => true,
  }), [begin, commit, enabled, move, restore, sign]);
  const Native = enabled ? nativeEdge() : null;
  const edgeStyle = [styles.edge, rtl ? { right: 0 } : { left: 0 }];
  const edge = !enabled ? null : Native ? <Native style={edgeStyle} isRTL={rtl} onBack={commit} onEdgeBackProgress={({ nativeEvent }) => {
    if (nativeEvent.phase === "began") begin();
    else if (nativeEvent.phase === "cancelled") restore((Number(nativeEvent.velocityX) || 0) * sign);
    else move(nativeEvent.translationX);
  }} accessible={false} /> : <View style={edgeStyle} {...responder.panHandlers} accessible={false} />;
  return children ? <View style={styles.container}>
    <Animated.View style={[styles.container, { transform: [{ translateX: Animated.multiply(translation, sign) }] }]}>{children}</Animated.View>
    {edge}
  </View> : edge;
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  edge: { position: "absolute", top: 0, bottom: 0, width: BACK_GESTURE_EDGE_WIDTH, zIndex: 100 },
});
