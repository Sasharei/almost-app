import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackHandler from "../utils/screenBack";
import { INITIAL_PRACTICE_TUTORIAL, PRACTICE_TUTORIAL_TARGETS, practiceTutorialReducer, resolvePracticeTutorialStep, resolvePracticeSpotlight, resolvePracticeTargetLayout } from "../utils/practiceTutorial";

export function usePracticeTutorial(active) {
  const [state, dispatch] = useReducer(practiceTutorialReducer, INITIAL_PRACTICE_TUTORIAL);
  const targets = useRef(new Map());
  const [registryVersion, setRegistryVersion] = useState(0);
  const scrollHandler = useRef(null);
  const event = useCallback((type, detail = {}) => dispatch({ type, ...detail }), []);
  const register = useCallback((id, node) => {
    targets.current.set(id, node);
    setRegistryVersion((version) => version + 1);
    return () => { if (targets.current.get(id) === node) { targets.current.delete(id); setRegistryVersion((version) => version + 1); } };
  }, []);
  return useMemo(() => ({ active, state, event, register, targets, scrollHandler, registryVersion }), [active, event, register, registryVersion, state]);
}

export function PracticeTarget({ tutorial, id, children, style, onLayout }) {
  const ref = useRef(null);
  const enabled = tutorial?.active;
  const register = tutorial?.register;
  useEffect(() => {
    if (!enabled || !register) return undefined;
    return register(id, ref);
  }, [enabled, id, register]);
  const hidden = enabled && (id !== PRACTICE_TUTORIAL_TARGETS[tutorial.state.stage] || tutorial.state.stage === "result");
  return <View ref={ref} collapsable={false} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"} style={style} onLayout={onLayout}>{children}</View>;
}

export function PracticeInactive({ tutorial, children, style, pointerEvents }) {
  const hidden = Boolean(tutorial?.active);
  return <View style={style} pointerEvents={pointerEvents} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}>{children}</View>;
}

// This is intentionally a normal view, not a native Modal: a Modal would eat
// taps in its transparent opening and prevent interaction with the real app.
export default function PracticeTutorialOverlay({ tutorial, visible, colors, t, rtl = false, onSkip, onFinish }) {
  const root = useRef(null);
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [frame, setFrame] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [keyboardTop, setKeyboardTop] = useState(null);
  const [delayed, setDelayed] = useState(false);
  const [bubbleHeight, setBubbleHeight] = useState(180);
  const lastReveal = useRef(0);
  const stage = tutorial.state.stage;
  const targetId = PRACTICE_TUTORIAL_TARGETS[stage];
  const step = resolvePracticeTutorialStep(stage);
  const waiting = stage === "pending" || stage === "empty";
  const copyKey = waiting ? "practicePending" : stage === "result" ? (tutorial.state.outcome === "save" ? "practiceSaved" : tutorial.state.outcome === "spend" ? "practiceSpent" : "practicePaused") : ({ open: tutorial.state.hasCards ? "practiceOpen" : "practiceEmpty", card: "practiceCard", amount: "practiceAmount", action: "practiceAction" })[stage];
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => setKeyboardTop(event.endCoordinates.screenY));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardTop(null));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    if (!visible) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { onSkip("system_back"); return true; });
    return () => subscription.remove();
  }, [onSkip, visible]);
  useEffect(() => {
    if (!visible || !copyKey) return;
    AccessibilityInfo.announceForAccessibility(`${t("guideStep", { step, total: 4 })}. ${t(stage === "result" ? "practiceResultTitle" : `${copyKey}Title`)}. ${t(`${copyKey}Body`)}`);
  }, [copyKey, stage, step, t, visible]);
  useEffect(() => { setAnchor(null); lastReveal.current = 0; }, [targetId, tutorial.state.reset, visible]);
  useEffect(() => {
    if (!visible || !targetId) return undefined;
    let cancelled = false;
    let alignedOversized = false;
    setDelayed(false);
    const deadline = setTimeout(() => { if (!cancelled) setDelayed(true); }, 2400);
    const measure = () => {
      root.current?.measureInWindow((x, y, w, h) => {
        if (cancelled) return;
        if (!w || !h) { setAnchor(null); return; }
        setFrame((current) => current && current.x === x && current.y === y && current.width === w && current.height === h ? current : { x, y, width: w, height: h });
        if (waiting) return;
        const candidate = tutorial.targets.current.get(targetId);
        if (!candidate?.current?.measureInWindow) { setAnchor(null); return; }
        candidate.current.measureInWindow((tx, ty, tw, th) => {
          if (cancelled || candidate !== tutorial.targets.current.get(targetId)) return;
          if (!tw || !th || ![tx, ty, tw, th].every(Number.isFinite)) { setAnchor(null); return; }
          const rect = { x: tx - x, y: ty - y, width: tw, height: th };
          const availableBottom = Math.min(h - insets.bottom - 12, keyboardTop == null ? h : keyboardTop - y - 12);
          const top = Math.max(insets.top + 12, 16);
          const layout = resolvePracticeTargetLayout({ rect, top, bottom: availableBottom, bubbleHeight, keyboardVisible: keyboardTop != null });
          if (layout.needsScroll && (!layout.oversized || !alignedOversized) && Date.now() - lastReveal.current > 450 && tutorial.scrollHandler.current) {
            lastReveal.current = Date.now(); alignedOversized = layout.oversized;
            tutorial.scrollHandler.current(rect.y - layout.preferredTop);
          }
          // A tall form exposes its real visible slice; it need not fit in full
          // above the keyboard. Once aligned, the user can scroll within it.
          const displayRect = layout.displayRect;
          const fullyVisible = layout.ready;
          setAnchor((current) => current?.id === targetId && current.session === tutorial.state.reset && current.registry === tutorial.registryVersion && ["x", "y", "width", "height"].every((key) => Math.abs(current.rect[key] - displayRect[key]) < 1) && current.ready === fullyVisible ? current : { id: targetId, session: tutorial.state.reset, registry: tutorial.registryVersion, rect: displayRect, ready: fullyVisible });
        });
      });
    };
    measure();
    const interval = setInterval(measure, 160);
    return () => { cancelled = true; clearTimeout(deadline); clearInterval(interval); };
  }, [bubbleHeight, height, insets.bottom, insets.top, keyboardTop, targetId, tutorial.registryVersion, tutorial.state.reset, tutorial.targets, tutorial.scrollHandler, visible, waiting, width]);
  if (!visible || !targetId) return null;
  const w = frame?.width || width;
  const h = frame?.height || height;
  const ready = waiting || (anchor?.id === targetId && anchor.session === tutorial.state.reset && anchor.registry === tutorial.registryVersion && anchor.ready);
  const spotlight = resolvePracticeSpotlight({ width: w, height: h, target: !waiting && ready ? anchor.rect : null });
  const hole = spotlight?.hole;
  const top = Math.max(insets.top + 12, 16);
  const bottom = Math.max(top + 96, Math.min(h - insets.bottom - 12, keyboardTop == null ? h : keyboardTop - (frame?.y || 0) - 12));
  const above = hole ? Math.max(0, hole.top - top - 12) : 0;
  const below = hole ? Math.max(0, bottom - hole.top - hole.height - 12) : 0;
  const placeBelow = hole && (below >= Math.min(bubbleHeight, 180 * Math.max(1, fontScale)) || below >= above);
  const bubbleRoom = hole ? (placeBelow ? below : above) : bottom - top;
  const bubbleTop = hole ? (placeBelow ? hole.top + hole.height + 12 : hole.top - 12 - Math.min(bubbleHeight, above)) : Math.max(top, top + (bottom - top - Math.min(bubbleHeight, 260)) / 2);
  const path = `M0 0H${w}V${h}H0Z${hole ? ` M${hole.left} ${hole.top}H${hole.left + hole.width}V${hole.top + hole.height}H${hole.left}Z` : ""}`;
  const textAlign = rtl ? "right" : "left";
  const recovering = !ready;
  // Read-only completion and recovery may use the whole viewport when there
  // is no room beside the highlight. Keep Skip fixed; other controls scroll.
  const useFullRoom = (stage === "result" || recovering) && bubbleRoom < 160 * Math.max(1, fontScale);
  const displayedRoom = useFullRoom ? bottom - top : bubbleRoom;
  const displayedTop = useFullRoom ? top : bubbleTop;
  return <View ref={root} testID="practice-tutorial-overlay" style={styles.root} pointerEvents="box-none" accessibilityViewIsModal={false}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width={w} height={h} accessible={false}><Path d={path} fill="rgba(25,28,35,0.80)" fillRule="evenodd" /></Svg>
    </View>
    {(stage === "result" ? [{ left: 0, top: 0, width: w, height: h }] : spotlight?.blockers || []).map((rect, index) => <View key={index} testID={`practice-blocker-${index}`} style={[styles.blocker, rect]} onStartShouldSetResponder={() => true} accessible={false} importantForAccessibility="no-hide-descendants" />)}
    {hole ? <View pointerEvents="none" accessible={false} style={[styles.outline, hole, { borderColor: colors.primary }]} /> : null}
    <View onLayout={(event) => setBubbleHeight(event.nativeEvent.layout.height)} style={[styles.bubble, { top: displayedTop, maxHeight: Math.max(56, displayedRoom), left: Math.max(16, (w - 480) / 2), width: Math.min(w - 32, 480), backgroundColor: colors.card }]}>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.copy} keyboardShouldPersistTaps="handled">
        <Text style={[styles.progress, { color: colors.muted, textAlign }]}>{t("guideStep", { step, total: 4 })}</Text>
        {(waiting || (recovering && !delayed)) ? <ActivityIndicator color={colors.primary} accessibilityLabel={t("practiceLoading")} /> : null}
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text, textAlign }]}>{recovering ? t(delayed ? "practiceRecoveryTitle" : "practiceLoading") : t(stage === "result" ? "practiceResultTitle" : `${copyKey}Title`)}</Text>
        {(!recovering || delayed) ? <Text style={[styles.body, { color: colors.text, textAlign }]}>{recovering ? t("practiceRecoveryBody") : t(`${copyKey}Body`)}</Text> : null}
        {recovering && delayed ? <Pressable testID="practice-retry" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); tutorial.event("RESET"); }} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={[styles.button, { color: colors.onPrimary }]}>{t("practiceRestart")}</Text></Pressable> : stage === "result" ? <Pressable testID="practice-finish" accessibilityRole="button" onPress={onFinish} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={[styles.button, { color: colors.onPrimary }]}>{t("practiceFinish")}</Text></Pressable> : null}
      </ScrollView>
      <View style={[styles.controls, { borderTopColor: colors.border }]}>
        <Pressable testID="practice-skip" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); onSkip("skip"); }} style={styles.skip}><Text style={[styles.skipText, { color: colors.muted }]}>{t("onboardingSkip")}</Text></Pressable>
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  // App's in-tree dialog hosts use 1000. Their confirmation/cancel controls
  // must remain above the tour, while normal navigation stays below it.
  root: { ...StyleSheet.absoluteFillObject, zIndex: 900, elevation: 900, direction: "ltr" },
  blocker: { position: "absolute" },
  outline: { position: "absolute", borderWidth: 2, borderRadius: 12 },
  bubble: { position: "absolute", borderRadius: 16, overflow: "hidden" },
  copy: { padding: 18, gap: 8 },
  progress: { fontSize: 12, lineHeight: 18 },
  title: { fontSize: 19, lineHeight: 25, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22 },
  controls: { paddingHorizontal: 16, paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth },
  primary: { minHeight: 48, marginTop: 12, borderRadius: 10, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 12 },
  button: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  skip: { minHeight: 48, justifyContent: "center", paddingVertical: 10 },
  skipText: { fontSize: 14, textAlign: "center", fontWeight: "600" },
});
