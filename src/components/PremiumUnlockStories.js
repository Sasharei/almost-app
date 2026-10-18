import PlatformSurface, { PlatformPressable } from "./PlatformSurface";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { AccessiblePressable as Pressable } from "./AccessibleControls";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI_MOTION, UI_RADIUS, UI_SPACING, UI_TOUCH_TARGET } from "../constants/designSystem";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import { isRtlLanguage } from "../utils/language";
import PremiumStoryArtwork from "./PremiumStoryArtwork";

const STORY_DURATION_MS = 6800;
const SWIPE_DISTANCE = 52;
const getPlatformFontStyle = (fontFamily, fontWeight) =>
  Platform.OS === "android" ? { fontWeight } : { fontFamily };
const STORY_DEFINITIONS = Object.freeze([
  { id: "welcome", titleKey: "premiumStoryWelcomeTitle", bodyKey: "premiumStoryWelcomeBody" },
  { id: "budget", titleKey: "premiumStoryBudgetTitle", bodyKey: "premiumStoryBudgetBody" },
  { id: "insights", titleKey: "premiumStoryInsightsTitle", bodyKey: "premiumStoryInsightsBody" },
  { id: "impulse", titleKey: "premiumStoryImpulseTitle", bodyKey: "premiumStoryImpulseBody" },
  { id: "unlimited", titleKey: "premiumStoryUnlimitedTitle", bodyKey: "premiumStoryUnlimitedBody" },
  { id: "ready", titleKey: "premiumStoryReadyTitle", bodyKey: "premiumStoryReadyBody" },
]);
function StoryIcon({ name, color, rtl = false }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" style={rtl ? {transform:[{scaleX:-1}]} : undefined}>
    {name === "close" ? <Path d="m6 6 12 12M18 6 6 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      : name === "pause" ? <><Rect x="6" y="4" width="4" height="16" rx="1" fill={color}/><Rect x="14" y="4" width="4" height="16" rx="1" fill={color}/></>
        : name === "play" ? <Path d="m8 4 12 8-12 8V4Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          : <Path d={name === "back" ? "M19 12H5m6-6-6 6 6 6" : "M5 12h14m-6-6 6 6-6 6"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
  </Svg>;
}

const PremiumUnlockStories = ({ colors, language, onClose, playSound, t }) => {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const { reduceMotion } = useMotionPreferences();
  const [activeIndex, setActiveIndex] = useState(0);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  // Let people read at their own pace; automatic playback stays available.
  const [paused, setPaused] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const activeIndexRef = useRef(0);
  const storyProgress = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const dragStartRef = useRef(0);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef(null);
  const soundPlayedRef = useRef(false);
  const isRtl = isRtlLanguage(language);
  const isLastStory = activeIndex === STORY_DEFINITIONS.length - 1;
  const story = STORY_DEFINITIONS[activeIndex];
  const contentWidth = Math.min(Math.max(0, width - UI_SPACING.md * 2), 560);
  const compact = height < 740 || fontScale > 1.3;
  const artworkHeight = fontScale > 1.6 ? 64 : compact ? 112 : Math.min(210, Math.round(height * 0.24));
  const palette = useMemo(() => ({
    background: colors?.background || "#F5F6FA",
    card: colors?.card || "#FFFFFF",
    text: colors?.text || "#1F2230",
    muted: colors?.muted || "#687083",
    border: colors?.border || "#DDE1EA",
    surfaceMuted: colors?.surfaceMuted || "#EBEDF4",
    primary: colors?.primary || "#485ED7",
    onPrimary: colors?.onPrimary || "#FFFFFF",
  }), [colors]);

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled?.().then((enabled) => {
      if (mounted) setScreenReaderEnabled(Boolean(enabled));
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.("screenReaderChanged", setScreenReaderEnabled);
    return () => { mounted = false; subscription?.remove?.(); };
  }, []);
  useEffect(() => {
    if (!playSound || soundPlayedRef.current) return undefined;
    soundPlayedRef.current = true;
    playSound("level_up", { skipCooldown: true });
    const rewardTimer = setTimeout(() => playSound("reward", { skipCooldown: true }), 220);
    return () => clearTimeout(rewardTimer);
  }, [playSound]);

  const handlePrevious = useCallback(() => setActiveIndex((current) => Math.max(0, current - 1)), []);
  const handleNext = useCallback(() => setActiveIndex((current) => Math.min(STORY_DEFINITIONS.length - 1, current + 1)), []);
  const handleClose = useCallback(() => onClose?.(), [onClose]);
  const handlePrimaryAction = useCallback(() => {
    if (activeIndexRef.current === STORY_DEFINITIONS.length - 1) {
      onClose?.();
      return;
    }
    handleNext();
  }, [handleNext, onClose]);

  useEffect(() => {
    storyProgress.stopAnimation();
    storyProgress.setValue(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    AccessibilityInfo.announceForAccessibility?.(`${t(story.titleKey)}. ${t(story.bodyKey)}`);
  }, [activeIndex, storyProgress, story.titleKey, story.bodyKey, t]);
  useEffect(() => {
    if (isLastStory || reduceMotion || screenReaderEnabled) return undefined;
    if (paused || interacting) return undefined;
    // Resume the remaining time after a hold/scroll, rather than skipping copy.
    let cancelled = false;
    storyProgress.stopAnimation((current) => {
      if (cancelled) return;
      const animation = Animated.timing(storyProgress, {
        toValue: 1,
        duration: Math.max(1, STORY_DURATION_MS * (1 - current)),
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animation.start(({ finished }) => { if (finished && !cancelled) handleNext(); });
    });
    return () => { cancelled = true; storyProgress.stopAnimation(); };
  }, [activeIndex, isLastStory, reduceMotion, screenReaderEnabled, paused, interacting, storyProgress, handleNext]);

  const settleDrag = useCallback(() => {
    if (reduceMotion) { dragX.setValue(0); return; }
    Animated.spring(dragX, { toValue: 0, damping: 24, stiffness: 260, mass: 1, useNativeDriver: true }).start();
  }, [dragX, reduceMotion]);
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onMoveShouldSetPanResponderCapture: (_event, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => { dragX.stopAnimation((value) => { dragStartRef.current = value; }); setInteracting(true); },
    onPanResponderMove: (_event, gesture) => {
      if (!reduceMotion) dragX.setValue(Math.max(-64, Math.min(64, dragStartRef.current + gesture.dx * 0.35)));
    },
    onPanResponderRelease: (_event, gesture) => {
      const direction = Math.abs(gesture.dx) > SWIPE_DISTANCE ? gesture.dx : Math.abs(gesture.vx) > 0.5 ? gesture.vx * SWIPE_DISTANCE * 2 : 0;
      if (isRtl ? direction > SWIPE_DISTANCE : direction < -SWIPE_DISTANCE) handleNext();
      if (isRtl ? direction < -SWIPE_DISTANCE : direction > SWIPE_DISTANCE) handlePrevious();
      setInteracting(false);
      settleDrag();
    },
    onPanResponderTerminate: () => { setInteracting(false); settleDrag(); },
  }), [dragX, handleNext, handlePrevious, isRtl, reduceMotion, settleDrag]);
  const animateButton = useCallback((toValue) => {
    buttonScale.stopAnimation();
    Animated.timing(buttonScale, { toValue: reduceMotion ? 1 : toValue, duration: UI_MOTION.press, useNativeDriver: true }).start();
  }, [buttonScale, reduceMotion]);
  const autoAvailable = !isLastStory && !reduceMotion && !screenReaderEnabled;

  return <View style={[styles.root, { backgroundColor: palette.background }]} accessibilityViewIsModal testID="premium-overview">
    <StatusBar style={colors?.appearance === "dark" ? "light" : "dark"} backgroundColor={palette.background} />
    <View style={[styles.topBar, { width: contentWidth, paddingTop: Math.max(insets.top, UI_SPACING.md) }]}>
      <View style={[styles.progressRow, isRtl && styles.rowReverse]} accessibilityRole="progressbar" accessibilityLabel={t("premiumStoryProgressA11y", { current: activeIndex + 1, total: STORY_DEFINITIONS.length })} accessibilityValue={{ min: 1, max: STORY_DEFINITIONS.length, now: activeIndex + 1 }}>
        {STORY_DEFINITIONS.map((item, index) => <View key={item.id} style={[styles.progressTrack,{backgroundColor:palette.surfaceMuted}]}>
          {index < activeIndex ? <View style={[styles.progressFill,{width:"100%",backgroundColor:palette.primary}]} /> : index === activeIndex ? <Animated.View style={[styles.progressFill,{backgroundColor:palette.primary,width:isLastStory || !autoAvailable ? "100%" : storyProgress.interpolate({inputRange:[0,1],outputRange:["0%","100%"]})}]} /> : null}
        </View>)}
      </View>
      <View style={[styles.header, isRtl && styles.rowReverse]}>
        <View style={styles.headerCopy}>
          <Text maxFontSizeMultiplier={1.4} style={[styles.brandText,{color:palette.text},isRtl && styles.rtlText]}>{t("premiumStoryBadge")}</Text>
          <Text maxFontSizeMultiplier={1.6} style={[styles.stepText,{color:palette.muted},isRtl && styles.rtlText]}>{t("premiumStoryProgressA11y", {current:activeIndex+1,total:STORY_DEFINITIONS.length})}</Text>
        </View>
        <View style={[styles.headerControls,isRtl && styles.rowReverse]}>
          {autoAvailable ? <PlatformPressable surfaceRole="control" onPress={() => setPaused((value) => !value)} style={({pressed}) => [styles.iconButton,{backgroundColor:palette.card},pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t(paused ? "premiumStoryResume" : "premiumStoryPause")} accessibilityState={{selected:paused}} testID="premium-story-playback"><StoryIcon name={paused ? "play" : "pause"} color={palette.text}/></PlatformPressable> : null}
          <PlatformPressable surfaceRole="control" onPress={handleClose} style={({pressed}) => [styles.iconButton,{backgroundColor:palette.card},pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t("premiumStoryCloseA11y")} testID="premium-story-close"><StoryIcon name="close" color={palette.text}/></PlatformPressable>
        </View>
      </View>
    </View>
      <Animated.View style={[styles.artwork,{width:contentWidth,alignSelf:"center",marginTop:12,marginBottom:fontScale > 1.6 ? 8 : 24,transform:[{translateX:dragX}]}]} {...panResponder.panHandlers} onTouchStart={() => setInteracting(true)} onTouchEnd={() => setInteracting(false)} onTouchCancel={() => setInteracting(false)}>
        <PremiumStoryArtwork storyId={story.id} colors={palette} t={t} height={artworkHeight}/>
        <View style={styles.tapZones}>
          <Pressable style={styles.tapZone} onPress={isRtl ? handleNext : handlePrevious} disabled={isRtl ? isLastStory : activeIndex === 0} accessibilityRole="button" accessibilityLabel={isRtl ? t("premiumStoryNextA11y") : t("premiumStoryPreviousA11y")} accessibilityState={{disabled:isRtl ? isLastStory : activeIndex === 0}}/>
          <Pressable style={styles.tapZone} onPress={isRtl ? handlePrevious : handleNext} disabled={isRtl ? activeIndex === 0 : isLastStory} accessibilityRole="button" accessibilityLabel={isRtl ? t("premiumStoryPreviousA11y") : t("premiumStoryNextA11y")} accessibilityState={{disabled:isRtl ? activeIndex === 0 : isLastStory}}/>
        </View>
      </Animated.View>
    <Animated.ScrollView ref={scrollRef} style={[styles.mainScroll,{transform:[{translateX:dragX}]}]} contentContainerStyle={[styles.main,{paddingHorizontal:Math.max(UI_SPACING.md,(width-contentWidth)/2)}]} showsVerticalScrollIndicator directionalLockEnabled bounces={false} onTouchStart={() => setInteracting(true)} onTouchEnd={() => setInteracting(false)} onTouchCancel={() => setInteracting(false)} onScrollBeginDrag={() => { setPaused(true); setInteracting(true); }} onScrollEndDrag={() => setInteracting(false)} onMomentumScrollEnd={() => setInteracting(false)}>
      <View style={[styles.copyBlock,compact && styles.copyCompact]}>
        <Text style={[styles.title,compact && styles.titleCompact,{color:palette.text},isRtl && styles.rtlText]} accessibilityRole="header" testID={`premium-story-title-${story.id}`}>{t(story.titleKey)}</Text>
        <Text style={[styles.body,{color:palette.muted},isRtl && styles.rtlText]}>{t(story.bodyKey)}</Text>
      </View>
    </Animated.ScrollView>
    <PlatformSurface surfaceRole="plain" style={[styles.footer,{backgroundColor:palette.background,paddingBottom:Math.max(insets.bottom,UI_SPACING.md),paddingHorizontal:Math.max(UI_SPACING.md,(width-contentWidth)/2)}]}>
      <View style={[styles.footerRow,isRtl && styles.rowReverse]}>
        <PlatformPressable surfaceRole="control" onPress={handlePrevious} disabled={activeIndex === 0} style={({pressed}) => [styles.previousButton,{backgroundColor:palette.card,borderColor:palette.border},pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t("premiumStoryPreviousA11y")} accessibilityState={{disabled:activeIndex === 0}} testID="premium-story-previous"><StoryIcon name="back" color={activeIndex === 0 ? palette.muted : palette.text} rtl={isRtl}/></PlatformPressable>
        <Animated.View style={[styles.primaryButtonWrap,{transform:[{scale:buttonScale}]}]}>
          <PlatformPressable surfaceRole="control" onPress={handlePrimaryAction} onPressIn={() => animateButton(UI_MOTION.pressScale)} onPressOut={() => animateButton(1)} style={({pressed}) => [styles.primaryButton,{backgroundColor:palette.primary},isRtl && styles.rowReverse,pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t(isLastStory ? "premiumStoryStart" : "premiumStoryNext")} testID="premium-story-primary">
            <Text maxFontSizeMultiplier={2} style={[styles.primaryButtonText,{color:palette.onPrimary}]}>{t(isLastStory ? "premiumStoryStart" : "premiumStoryNext")}</Text>
            <StoryIcon name="next" color={palette.onPrimary} rtl={isRtl}/>
          </PlatformPressable>
        </Animated.View>
      </View>
    </PlatformSurface>
  </View>;
};
const styles = StyleSheet.create({
  root:{flex:1, minHeight:0},
  topBar:{alignSelf:"center", flexShrink:0, gap:16, paddingBottom:12},
  progressRow:{flexDirection:"row",gap:5,height:4},
  progressTrack:{flex:1,height:4,borderRadius:UI_RADIUS.pill,overflow:"hidden"},
  progressFill:{height:"100%",borderRadius:UI_RADIUS.pill},
  header:{flexDirection:"row",alignItems:"center",gap:12},
  headerCopy:{flex:1,minWidth:0,gap:4},
  brandText:{...getPlatformFontStyle("Inter_700Bold", "700"),fontSize:15},
  stepText:{...getPlatformFontStyle("Inter_400Regular", "400"),fontSize:12},
  headerControls:{flexDirection:"row",gap:8},
  iconButton:{width:UI_TOUCH_TARGET.current,height:UI_TOUCH_TARGET.current,borderRadius:UI_RADIUS.pill,alignItems:"center",justifyContent:"center"},
  mainScroll:{flex:1,minHeight:0},
  main:{flexGrow:1,paddingTop:12,paddingBottom:24},
  artwork:{width:"100%",marginBottom:24},
  tapZones:{...StyleSheet.absoluteFillObject,flexDirection:"row"},
  tapZone:{flex:1},
  copyBlock:{gap:14},
  copyCompact:{gap:10},
  title:{...getPlatformFontStyle("Inter_800ExtraBold", "800"),fontSize:30,lineHeight:37,letterSpacing:-0.5},
  titleCompact:{fontSize:26,lineHeight:33},
  body:{...getPlatformFontStyle("Inter_500Medium", "500"),fontSize:16,lineHeight:25},
  footer:{flexShrink:0,paddingTop:12},
  footerRow:{flexDirection:"row",gap:12,alignItems:"stretch"},
  previousButton:{width:52,minHeight:56,borderRadius:UI_RADIUS.control,borderWidth:StyleSheet.hairlineWidth,alignItems:"center",justifyContent:"center"},
  primaryButtonWrap:{flex:1,minWidth:0},
  primaryButton:{flexDirection:"row",gap:12,minHeight:56,paddingHorizontal:20,paddingVertical:14,borderRadius:UI_RADIUS.control,alignItems:"center",justifyContent:"center"},
  primaryButtonText:{...getPlatformFontStyle("Inter_600SemiBold", "600"),fontSize:16,lineHeight:23,flexShrink:1,textAlign:"center"},
  pressed:{opacity:0.68},
  rowReverse:{flexDirection:"row-reverse"},
  rtlText:{textAlign:"right",writingDirection:"rtl"},
});
export default PremiumUnlockStories;
