import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { createAnimatedComponent, Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackHandler from "../utils/screenBack";
import { INITIAL_PRACTICE_TUTORIAL, PRACTICE_TUTORIAL_TARGETS, practiceTutorialReducer, resolvePracticeTutorialStep, resolvePracticeSpotlight, resolvePracticeTargetLayout, isPracticeAnchorCurrent, resolvePracticeBubbleLayout, resolvePracticeSpotlightPath } from "../utils/practiceTutorial";

const AnimatedPracticePath = createAnimatedComponent(Path);

export function usePracticeTutorial(active) {
  const [state, dispatch] = useReducer(practiceTutorialReducer, INITIAL_PRACTICE_TUTORIAL);
  const [nativeHostVisible, setNativeHostVisible] = useState(false);
  const motionHole = useSharedValue(null);
  const motionY = useSharedValue(0);
  const motionSize = useSharedValue(180);
  const motionOpacity = useSharedValue(0);
  const visualFrame = useRef({ session: null, presentation: null, copyHeight: 180, controlsHeight: 53 });
  const visualMotion = useMemo(() => ({ hole: motionHole, y: motionY, size: motionSize, opacity: motionOpacity, frame: visualFrame }), [motionHole, motionOpacity, motionSize, motionY]);
  useEffect(() => { if (!active) setNativeHostVisible(false); }, [active]);
  const closeRef = useRef(null);
  const sessionRef = useRef(state.reset);
  const activeRef = useRef(active);
  sessionRef.current = state.reset;
  activeRef.current = active;
  const targets = useRef(new Map());
  const [registryVersion, setRegistryVersion] = useState(0);
  const scrollHandler = useRef(null);
  const event = useCallback((type, detail = {}) => dispatch({ type, ...detail }), []);
  const register = useCallback((id, node) => {
    targets.current.set(id, node);
    setRegistryVersion((version) => version + 1);
    return () => { if (targets.current.get(id) === node) { targets.current.delete(id); setRegistryVersion((version) => version + 1); } };
  }, []);
  return useMemo(() => ({ active, state, event, register, targets, scrollHandler, registryVersion, closeRef, sessionRef, activeRef, nativeHostVisible, setNativeHostVisible, visualMotion }), [active, event, nativeHostVisible, register, registryVersion, state, visualMotion]);
}

export function PracticeTarget({ tutorial, id, children, style, onLayout, containsTargets = false }) {
  const ref = useRef(null);
  const enabled = tutorial?.active;
  const register = tutorial?.register;
  useEffect(() => {
    if (!enabled || !register) return undefined;
    return register(id, ref);
  }, [enabled, id, register]);
  const hidden = enabled && !containsTargets && (id !== PRACTICE_TUTORIAL_TARGETS[tutorial.state.stage] || tutorial.state.stage === "result");
  return <View ref={ref} testID={id} collapsable={false} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"} style={style} onLayout={onLayout}>{children}</View>;
}

export function PracticeInactive({ tutorial, children, style, pointerEvents }) {
  const hidden = Boolean(tutorial?.active);
  return <View style={style} pointerEvents={pointerEvents} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}>{children}</View>;
}

// This is intentionally a normal view, not a native Modal: a Modal would eat
// taps in its transparent opening and prevent interaction with the real app.
export default function PracticeTutorialOverlay({ tutorial, visible, colors, t, rtl = false, onSkip, onFinish, allowScrollReveal = true, holdPresentation = false }) {
  const holding = holdPresentation || (!allowScrollReveal && !tutorial.nativeHostVisible);
  const visualMotion = tutorial.visualMotion;
  const cached = useRef(visualMotion.frame.current.session === tutorial.state.reset ? { ...visualMotion.frame.current } : null).current;
  const root = useRef(null);
  const copyScroll = useRef(null);
  const measureRef = useRef(null);
  const revealRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const { reduceMotion } = useMotionPreferences();
  const insets = useSafeAreaInsets();
  const [frame, setFrame] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [presentation, setPresentation] = useState(cached?.presentation || null);
  const [keyboardTop, setKeyboardTop] = useState(null);
  const [delayedTarget, setDelayedTarget] = useState(null);
  const [copyHeight, setCopyHeight] = useState(cached?.copyHeight || 180);
  const [controlsHeight, setControlsHeight] = useState(cached?.controlsHeight || 53);
  // Both hosts draw the same UI-thread values. A host handoff cannot replace
  // the moving highlight with a blank frame or restart from a target value.
  const visualHole = visualMotion.hole;
  const bubbleY = visualMotion.y;
  const bubbleSize = visualMotion.size;
  const bubbleOpacity = visualMotion.opacity;
  const stage = tutorial?.state.stage;
  const session = tutorial?.state.reset;
  const targetId = PRACTICE_TUTORIAL_TARGETS[stage];
  const waiting = stage === "pending" || stage === "empty";
  const copyKey = waiting ? "practicePending" : stage === "result" ? (tutorial?.state.outcome === "save" ? "practiceSaved" : tutorial?.state.outcome === "spend" ? "practiceSpent" : "practicePaused") : ({ open: tutorial?.state.hasCards ? "practiceOpen" : "practiceEmpty", card: "practiceCard", amount: "practiceAmount", action: "practiceAction" })[stage];
  const title = copyKey ? t(stage === "result" ? "practiceResultTitle" : `${copyKey}Title`) : "";
  const body = copyKey ? t(`${copyKey}Body`, { save: t("saveAction"), spend: t("spendAction"), total: t("redesignTodaySaved") }) : "";
  const ready = visible && !holding && isPracticeAnchorCurrent(anchor, targetId, session, tutorial?.targets.current.get(targetId));
  const deadlineKey = `${session}:${targetId}`;
  const recovering = visible && !holding && !waiting && !ready && delayedTarget === deadlineKey;
  const w = frame?.width || width;
  const h = frame?.height || height;
  const top = Math.max(insets.top + 12, 16);
  const bottom = Math.max(top + 96, Math.min(h - insets.bottom - 12, keyboardTop == null ? h : keyboardTop - (frame?.y || 0) - 12));

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
    setDelayedTarget(null);
    if (!visible || waiting || ready || holding) return undefined;
    const deadline = setTimeout(() => setDelayedTarget(deadlineKey), 2400);
    return () => clearTimeout(deadline);
  }, [deadlineKey, holding, ready, visible, waiting]);
  useEffect(() => {
    if (!visible || !targetId || waiting || holding) return undefined;
    let cancelled = false;
    let revealFrame = null;
    const revealKey = `${session}:${targetId}:${width}:${height}:${keyboardTop}`;
    const invalidate = () => setAnchor((current) => current?.ready ? { ...current, ready: false } : current);
    const measure = () => {
      root.current?.measureInWindow((x, y, rw, rh) => {
        if (cancelled) return;
        if (!rw || !rh) { invalidate(); return; }
        setFrame((current) => current && ["x", "y", "width", "height"].every((key) => Math.abs(current[key] - ({ x, y, width: rw, height: rh })[key]) < 1) ? current : { x, y, width: rw, height: rh });
        const candidate = tutorial.targets.current.get(targetId);
        if (!candidate?.current?.measureInWindow) { invalidate(); return; }
        candidate.current.measureInWindow((tx, ty, tw, th) => {
          if (cancelled || candidate !== tutorial.targets.current.get(targetId)) return;
          if (!tw || !th || ![tx, ty, tw, th].every(Number.isFinite)) { invalidate(); return; }
          const rect = { x: tx - x, y: ty - y, width: tw, height: th };
          const availableBottom = Math.min(rh - insets.bottom - 12, keyboardTop == null ? rh : keyboardTop - y - 12);
          const layout = resolvePracticeTargetLayout({ rect, top: Math.max(insets.top + 12, 16), bottom: availableBottom, keyboardVisible: keyboardTop != null });
          // Reveal at most once for this mounted target/viewport. Copy resizing
          // and unrelated target registrations cannot restart a scroll loop.
          if (allowScrollReveal && layout.needsScroll && tutorial.scrollHandler.current && (revealRef.current?.key !== revealKey || revealRef.current?.node !== candidate)) {
            revealRef.current = { key: revealKey, node: candidate };
            tutorial.scrollHandler.current(rect.y - layout.preferredTop);
            revealFrame = requestAnimationFrame(measure);
            return;
          }
          const next = { id: targetId, session, node: candidate, rect: layout.displayRect, ready: layout.ready };
          setAnchor((current) => current?.id === targetId && current.session === session && current.node === candidate && current.ready === next.ready && ["x", "y", "width", "height"].every((key) => Math.abs(current.rect[key] - next.rect[key]) < 1) ? current : next);
        });
      });
    };
    measureRef.current = measure;
    measure();
    const interval = setInterval(measure, 160);
    return () => { cancelled = true; clearInterval(interval); if (revealFrame != null) cancelAnimationFrame(revealFrame); if (measureRef.current === measure) measureRef.current = null; };
  }, [allowScrollReveal, height, holding, insets.bottom, insets.top, keyboardTop, session, targetId, tutorial?.registryVersion, tutorial?.targets, tutorial?.scrollHandler, visible, waiting, width]);

  // Keep the last complete visual frame while the next real target is being
  // measured. The live touch opening below never uses this cached rectangle.
  useLayoutEffect(() => {
    if (!visible || holding || (!waiting && !ready && !recovering)) return;
    const next = { stage, session, title: recovering ? t("practiceRecoveryTitle") : title, body: recovering ? t("practiceRecoveryBody") : body, step: resolvePracticeTutorialStep(stage), recovering, waiting, rect: ready && !waiting ? anchor.rect : null };
    setPresentation((current) => current?.stage === next.stage && current.session === next.session && current.title === next.title && current.body === next.body && current.recovering === next.recovering && current.rect === next.rect ? current : next);
  }, [anchor, body, holding, ready, recovering, session, stage, t, title, visible, waiting]);
  const shown = Boolean(visible && (ready || waiting || recovering || presentation?.session === session));
  const display = useMemo(() => ready || waiting || recovering || !shown
    ? { stage, session, step: resolvePracticeTutorialStep(stage), title: recovering ? t("practiceRecoveryTitle") : title, body: recovering ? t("practiceRecoveryBody") : body, waiting, recovering, rect: ready && !waiting ? anchor.rect : null }
    : presentation, [anchor, body, presentation, ready, recovering, shown, session, stage, t, title, waiting]);
  const visualSpotlight = useMemo(() => resolvePracticeSpotlight({ width: w, height: h, target: display.rect }), [display.rect, h, w]);
  const hole = visualSpotlight?.hole;
  const bubble = resolvePracticeBubbleLayout({ top, bottom, hole, contentHeight: copyHeight + controlsHeight, allowCover: display.recovering || display.stage === "result" });
  useLayoutEffect(() => {
    if (!visible || !shown) {
      if (!tutorial.active || (visible && visualMotion.frame.current.session !== session)) {
        bubbleOpacity.value = 0; visualHole.value = null; visualMotion.frame.current.session = null;
      }
      return;
    }
    if (holding || (!ready && !waiting && !recovering)) return;
    const first = visualMotion.frame.current.session !== session;
    visualMotion.frame.current = { session, presentation: display, copyHeight, controlsHeight };
    const config = { duration: reduceMotion ? 0 : 180, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
    if (first) {
      visualHole.value = hole;
      bubbleY.value = bubble.top;
      bubbleSize.value = bubble.height;
      bubbleOpacity.value = reduceMotion ? 1 : withTiming(1, { ...config, duration: 100 });
    } else {
      visualHole.value = hole && visualHole.value ? withTiming(hole, config) : hole;
      bubbleY.value = withTiming(bubble.top, config);
      bubbleSize.value = withTiming(bubble.height, config);
    }
  }, [bubble.height, bubble.top, bubbleOpacity, bubbleSize, bubbleY, controlsHeight, copyHeight, display, holding, hole, ready, recovering, reduceMotion, session, shown, tutorial.active, visible, visualHole, visualMotion.frame, waiting]);
  useLayoutEffect(() => { copyScroll.current?.scrollTo({ y: 0, animated: false }); }, [display.stage, display.recovering, session]);
  useEffect(() => {
    if (!shown) return;
    AccessibilityInfo.announceForAccessibility(`${t("guideStep", { step: display.step, total: 4 })}. ${display.title}. ${display.body}`);
  }, [display.body, display.step, display.title, shown, t]);
  const maskProps = useAnimatedProps(() => ({ d: resolvePracticeSpotlightPath(w, h, visualHole.value) }));
  const outlineStyle = useAnimatedStyle(() => ({ left: visualHole.value?.left || 0, top: visualHole.value?.top || 0, width: visualHole.value?.width || 0, height: visualHole.value?.height || 0, opacity: visualHole.value ? 1 : 0 }));
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bubbleY.value }], height: bubbleSize.value, opacity: bubbleOpacity.value }));
  if (!visible || !targetId) return null;
  const liveSpotlight = resolvePracticeSpotlight({ width: w, height: h, target: ready && stage !== "result" && !waiting ? anchor.rect : null });
  const textAlign = rtl ? "right" : "left";
  return <View ref={root} onLayout={() => measureRef.current?.()} testID="practice-tutorial-overlay" style={styles.root} pointerEvents="box-none" accessibilityViewIsModal={false}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width={w} height={h} accessible={false}><AnimatedPracticePath animatedProps={maskProps} fill="rgba(25,28,35,0.80)" fillRule="evenodd" /></Svg>
    </View>
    {(liveSpotlight?.blockers || []).map((rect, index) => <View key={index} testID={`practice-blocker-${index}`} style={[styles.blocker, rect]} onStartShouldSetResponder={() => true} accessible={false} importantForAccessibility="no-hide-descendants" />)}
    <Animated.View pointerEvents="none" accessible={false} style={[styles.outline, { borderColor: colors.primary }, outlineStyle]} />
    <Animated.View pointerEvents={shown ? "auto" : "none"} accessibilityElementsHidden={!shown} importantForAccessibility={shown ? "auto" : "no-hide-descendants"} style={[styles.bubble, { top: 0, left: Math.max(16, (w - 480) / 2), width: Math.min(w - 32, 480), backgroundColor: colors.card }, bubbleStyle]}>
      <ScrollView ref={copyScroll} style={{ flex: 1 }} onContentSizeChange={(_, nextHeight) => setCopyHeight((current) => Math.abs(current - nextHeight) < 1 ? current : nextHeight)} contentContainerStyle={styles.copy} keyboardShouldPersistTaps="handled">
        <Text style={[styles.progress, { color: colors.muted, textAlign }]}>{t("guideStep", { step: display.step, total: 4 })}</Text>
        {display.waiting ? <ActivityIndicator color={colors.primary} accessibilityLabel={t("practiceLoading")} /> : null}
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text, textAlign }]}>{display.title}</Text>
        <Text style={[styles.body, { color: colors.text, textAlign }]}>{display.body}</Text>
        {display.recovering ? <Pressable testID="practice-retry" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); tutorial.event("RESET"); }} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.button, { color: colors.onPrimary }]}>{t("practiceRestart")}</Text></Pressable> : display.stage === "result" ? <Pressable testID="practice-finish" accessibilityRole="button" onPress={onFinish} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.button, { color: colors.onPrimary }]}>{t("practiceFinish")}</Text></Pressable> : null}
      </ScrollView>
      <View onLayout={({ nativeEvent }) => setControlsHeight((current) => Math.abs(current - nativeEvent.layout.height) < 1 ? current : nativeEvent.layout.height)} style={[styles.controls, { borderTopColor: colors.border }]}>
        <Pressable testID="practice-skip" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); onSkip("skip"); }} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}><Text style={[styles.skipText, { color: colors.muted }]}>{t("onboardingSkip")}</Text></Pressable>
      </View>
    </Animated.View>
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
  pressed: { opacity: 0.72 },
  skipText: { fontSize: 14, textAlign: "center", fontWeight: "600" },
});
