import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  UI_MOTION,
  UI_RADIUS,
  UI_SPACING,
  UI_TOUCH_TARGET,
} from "../constants/designSystem";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import { isRtlLanguage } from "../utils/language";

const PREMIUM_VIOLET = "#7C3AED";
const STORY_DURATION_MS = 6800;
const SWIPE_DISTANCE = 52;
const ARTWORK_FRAME_PADDING = 6;

const STORY_ART = Object.freeze({
  welcome: require("../../assets/premium_stories/premium-welcome-scene-v2.webp"),
  budget: require("../../assets/premium_stories/premium-budget-scene-v2.webp"),
  insights: require("../../assets/premium_stories/premium-insights-scene-v2.webp"),
  impulse: require("../../assets/premium_stories/premium-impulse-scene-v2.webp"),
  unlimited: require("../../assets/premium_stories/premium-unlimited-scene-v2.webp"),
  ready: require("../../assets/premium_stories/premium-ready-scene-v2.webp"),
});

const STORY_DEFINITIONS = Object.freeze([
  {
    id: "welcome",
    titleKey: "premiumStoryWelcomeTitle",
    bodyKey: "premiumStoryWelcomeBody",
  },
  {
    id: "budget",
    titleKey: "premiumStoryBudgetTitle",
    bodyKey: "premiumStoryBudgetBody",
  },
  {
    id: "insights",
    titleKey: "premiumStoryInsightsTitle",
    bodyKey: "premiumStoryInsightsBody",
  },
  {
    id: "impulse",
    titleKey: "premiumStoryImpulseTitle",
    bodyKey: "premiumStoryImpulseBody",
  },
  {
    id: "unlimited",
    titleKey: "premiumStoryUnlimitedTitle",
    bodyKey: "premiumStoryUnlimitedBody",
  },
  {
    id: "ready",
    titleKey: "premiumStoryReadyTitle",
    bodyKey: "premiumStoryReadyBody",
  },
]);

const PremiumUnlockStories = ({ language, onClose, playSound, t }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { reduceMotion } = useMotionPreferences();
  const [activeIndex, setActiveIndex] = useState(0);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const activeIndexRef = useRef(0);
  const entryProgress = useRef(new Animated.Value(0)).current;
  const storyProgress = useRef(new Animated.Value(0)).current;
  const floatProgress = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const soundPlayedRef = useRef(false);
  const isRtl = isRtlLanguage(language);
  const isLastStory = activeIndex === STORY_DEFINITIONS.length - 1;
  const story = STORY_DEFINITIONS[activeIndex];
  const compactHeight = height < 720;
  const contentWidth = Math.min(Math.max(0, width - UI_SPACING.xl), 560);
  const topChromeHeight =
    Math.max(insets.top, UI_SPACING.sm) +
    UI_TOUCH_TARGET.current +
    UI_SPACING.sm +
    3;
  const bottomChromeHeight = 76;
  const storyBodyHeight = Math.max(420, height - topChromeHeight - bottomChromeHeight);
  const illustrationRegionHeight = Math.round(storyBodyHeight * 0.64);
  const copyRegionHeight = storyBodyHeight - illustrationRegionHeight;
  const maxArtworkHeight = Math.max(220, illustrationRegionHeight - UI_SPACING.lg);
  const artworkWidth = Math.min(
    contentWidth,
    (maxArtworkHeight - ARTWORK_FRAME_PADDING * 2) * 0.75 +
      ARTWORK_FRAME_PADDING * 2,
    compactHeight ? 300 : 370
  );
  const artworkHeight =
    (artworkWidth - ARTWORK_FRAME_PADDING * 2) / 0.75 +
    ARTWORK_FRAME_PADDING * 2;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled?.()
      .then((enabled) => {
        if (mounted) setScreenReaderEnabled(Boolean(enabled));
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.(
      "screenReaderChanged",
      setScreenReaderEnabled
    );
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!playSound || soundPlayedRef.current) return;
    soundPlayedRef.current = true;
    playSound("level_up", { skipCooldown: true });
    const rewardTimer = setTimeout(() => {
      playSound("reward", { skipCooldown: true });
    }, 220);
    return () => clearTimeout(rewardTimer);
  }, [playSound]);

  const handlePrevious = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((current) => Math.min(STORY_DEFINITIONS.length - 1, current + 1));
  }, []);

  const handlePrimaryAction = useCallback(() => {
    if (activeIndexRef.current === STORY_DEFINITIONS.length - 1) {
      onClose?.();
      return;
    }
    handleNext();
  }, [handleNext, onClose]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    entryProgress.stopAnimation();
    entryProgress.setValue(reduceMotion ? 1 : 0);
    if (!reduceMotion) {
      Animated.timing(entryProgress, {
        toValue: 1,
        duration: UI_MOTION.sheet,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }

    storyProgress.stopAnimation();
    storyProgress.setValue(0);
    if (isLastStory || reduceMotion || screenReaderEnabled) return undefined;
    const progressAnimation = Animated.timing(storyProgress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressAnimation.start(({ finished }) => {
      if (finished) handleNext();
    });
    return () => progressAnimation.stop();
  }, [
    activeIndex,
    entryProgress,
    handleNext,
    isLastStory,
    reduceMotion,
    screenReaderEnabled,
    storyProgress,
  ]);

  useEffect(() => {
    floatProgress.stopAnimation();
    floatProgress.setValue(0);
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatProgress, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatProgress, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatProgress, reduceMotion]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.(
      `${t(story.titleKey)}. ${t(story.bodyKey)}`
    );
  }, [activeIndex, story.bodyKey, story.titleKey, t]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          const forward = isRtl ? gesture.dx > SWIPE_DISTANCE : gesture.dx < -SWIPE_DISTANCE;
          const backward = isRtl ? gesture.dx < -SWIPE_DISTANCE : gesture.dx > SWIPE_DISTANCE;
          if (forward) handleNext();
          if (backward) handlePrevious();
        },
      }),
    [handleNext, handlePrevious, isRtl]
  );

  const animateButton = useCallback(
    (toValue) => {
      Animated.timing(buttonScale, {
        toValue,
        duration: UI_MOTION.press,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [buttonScale]
  );

  const artworkAnimatedStyle = {
    opacity: entryProgress,
    transform: [
      {
        translateY: Animated.add(
          entryProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
          floatProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })
        ),
      },
      { scale: entryProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
    ],
  };
  const copyAnimatedStyle = {
    opacity: entryProgress,
    transform: [
      { translateY: entryProgress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
    ],
  };

  return (
    <View style={styles.root} accessibilityViewIsModal {...panResponder.panHandlers}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, UI_SPACING.sm),
            paddingHorizontal: Math.max(UI_SPACING.md, (width - contentWidth) / 2),
          },
        ]}
      >
        <View
          style={[styles.progressRow, isRtl && styles.rowReverse]}
          accessibilityRole="progressbar"
          accessibilityLabel={t("premiumStoryProgressA11y", {
            current: activeIndex + 1,
            total: STORY_DEFINITIONS.length,
          })}
          accessibilityValue={{
            min: 1,
            max: STORY_DEFINITIONS.length,
            now: activeIndex + 1,
          }}
        >
          {STORY_DEFINITIONS.map((item, index) => (
            <View key={item.id} style={styles.progressTrack}>
              {index < activeIndex && <View style={[styles.progressFill, styles.progressComplete]} />}
              {index === activeIndex && (
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: isLastStory
                        ? "100%"
                        : storyProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        <View style={[styles.brandRow, isRtl && styles.rowReverse]}>
          <View style={styles.brandBadge}>
            <View style={styles.brandMark} />
            <Text style={styles.brandText} maxFontSizeMultiplier={1.2}>
              {t("premiumStoryBadge")}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            style={({ pressed }) => [styles.closeButton, pressed && styles.controlPressed]}
            accessibilityRole="button"
            accessibilityLabel={t("premiumStoryCloseA11y")}
          >
            <Text style={styles.closeGlyph} maxFontSizeMultiplier={1}>×</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.main}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={[styles.content, { width: contentWidth }]}
          importantForAccessibility="yes"
        >
          <View style={[styles.illustrationRegion, { minHeight: illustrationRegionHeight }]}>
            <Animated.View
              style={[
                styles.artworkFrame,
                { width: artworkWidth, height: artworkHeight },
                artworkAnimatedStyle,
              ]}
            >
              <View style={styles.artworkClip} pointerEvents="none">
                <Image source={STORY_ART[story.id]} resizeMode="cover" style={styles.artworkImage} />
              </View>

              <View style={[styles.tapZones, isRtl && styles.rowReverse]}>
                <Pressable
                  style={styles.tapZone}
                  onPress={isRtl ? handleNext : handlePrevious}
                  disabled={isRtl ? isLastStory : activeIndex === 0}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isRtl ? t("premiumStoryNextA11y") : t("premiumStoryPreviousA11y")
                  }
                  accessibilityState={{
                    disabled: isRtl ? isLastStory : activeIndex === 0,
                  }}
                />
                <Pressable
                  style={styles.tapZone}
                  onPress={isRtl ? handlePrevious : handleNext}
                  disabled={isRtl ? activeIndex === 0 : isLastStory}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isRtl ? t("premiumStoryPreviousA11y") : t("premiumStoryNextA11y")
                  }
                  accessibilityState={{
                    disabled: isRtl ? activeIndex === 0 : isLastStory,
                  }}
                />
              </View>
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.copyBlock,
              { minHeight: copyRegionHeight },
              copyAnimatedStyle,
            ]}
          >
            <Text
              style={[styles.title, compactHeight && styles.titleCompact, isRtl && styles.rtlText]}
              maxFontSizeMultiplier={1.35}
            >
              {t(story.titleKey)}
            </Text>
            <Text
              style={[styles.body, compactHeight && styles.bodyCompact, isRtl && styles.rtlText]}
              maxFontSizeMultiplier={1.35}
            >
              {t(story.bodyKey)}
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, UI_SPACING.md),
            paddingHorizontal: Math.max(UI_SPACING.md, (width - contentWidth) / 2),
            alignItems: isRtl ? "flex-start" : "flex-end",
          },
        ]}
      >
        {isLastStory ? (
          <Animated.View style={[styles.primaryButtonWrap, { transform: [{ scale: buttonScale }] }]}>
            <Pressable
              onPress={handlePrimaryAction}
              onPressIn={() => animateButton(UI_MOTION.pressScale)}
              onPressOut={() => animateButton(1)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
              accessibilityRole="button"
              accessibilityLabel={t("premiumStoryStart")}
            >
              <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.25}>
                {t("premiumStoryStart")}
              </Text>
              <Text style={styles.primaryArrow} maxFontSizeMultiplier={1}>
                {isRtl ? "←" : "→"}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable
            onPress={handlePrimaryAction}
            onPressIn={() => animateButton(UI_MOTION.pressScale)}
            onPressOut={() => animateButton(1)}
            style={({ pressed }) => [styles.nextButton, pressed && styles.controlPressed]}
            accessibilityRole="button"
            accessibilityLabel={t("premiumStoryNextA11y")}
          >
            <Animated.Text
              style={[styles.nextGlyph, { transform: [{ scale: buttonScale }] }]}
              maxFontSizeMultiplier={1}
            >
              {isRtl ? "←" : "→"}
            </Animated.Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  topBar: {
    zIndex: 10,
    gap: UI_SPACING.sm,
  },
  progressRow: {
    flexDirection: "row",
    gap: 5,
    minHeight: 3,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: UI_RADIUS.pill,
    overflow: "hidden",
    backgroundColor: "rgba(42,35,57,0.13)",
  },
  progressFill: {
    height: "100%",
    borderRadius: UI_RADIUS.pill,
    backgroundColor: PREMIUM_VIOLET,
  },
  progressComplete: {
    width: "100%",
  },
  brandRow: {
    minHeight: UI_TOUCH_TARGET.current,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandBadge: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: UI_SPACING.xs,
    paddingHorizontal: UI_SPACING.sm,
    borderRadius: UI_RADIUS.pill,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.16)",
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  brandMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PREMIUM_VIOLET,
  },
  brandText: {
    color: "#5F35A8",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.55,
    textTransform: "uppercase",
  },
  closeButton: {
    width: UI_TOUCH_TARGET.current,
    height: UI_TOUCH_TARGET.current,
    borderRadius: UI_RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(42,35,57,0.08)",
  },
  closeGlyph: {
    color: "#3D354A",
    fontFamily: "Inter_400Regular",
    fontSize: 28,
    lineHeight: 31,
    marginTop: Platform.OS === "android" ? -3 : -1,
  },
  controlPressed: {
    opacity: 0.66,
  },
  mainScroll: {
    flex: 1,
  },
  main: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: UI_SPACING.md,
  },
  content: {
    flexGrow: 1,
    alignItems: "stretch",
  },
  illustrationRegion: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: UI_SPACING.sm,
  },
  artworkFrame: {
    padding: ARTWORK_FRAME_PADDING,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#2B2138",
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  artworkClip: {
    flex: 1,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "#F5F1FA",
  },
  artworkImage: {
    width: "100%",
    height: "100%",
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 2,
  },
  tapZone: {
    flex: 1,
  },
  copyBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: UI_SPACING.md,
    paddingHorizontal: UI_SPACING.xs,
  },
  title: {
    color: "#272230",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 31,
    lineHeight: 37,
    letterSpacing: -0.65,
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 32,
  },
  body: {
    maxWidth: 480,
    marginTop: UI_SPACING.sm,
    color: "#686271",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  bodyCompact: {
    marginTop: UI_SPACING.xs,
    fontSize: 14,
    lineHeight: 20,
  },
  rtlText: {
    writingDirection: "rtl",
  },
  bottomBar: {
    minHeight: 76,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  nextButton: {
    width: 52,
    height: 52,
    borderRadius: UI_RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PREMIUM_VIOLET,
    shadowColor: PREMIUM_VIOLET,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  nextGlyph: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    lineHeight: 28,
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: UI_SPACING.sm,
    paddingHorizontal: UI_SPACING.lg,
    borderRadius: UI_RADIUS.card,
    backgroundColor: PREMIUM_VIOLET,
    shadowColor: PREMIUM_VIOLET,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
  primaryButtonWrap: {
    width: "100%",
  },
  primaryPressed: {
    backgroundColor: "#6D28D9",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  primaryArrow: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 21,
    lineHeight: 24,
  },
});

export default PremiumUnlockStories;
