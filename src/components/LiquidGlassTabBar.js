import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView as ExpoBlurView } from "expo-blur";
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
  RadialGradient as SvgRadialGradient,
  Rect as SvgRect,
  Stop as SvgStop,
} from "react-native-svg";
import LiquidGlassNativeView, { canUseNativeLiquidGlassView } from "./LiquidGlassNativeView";
import NativeLiquidTabBar, { canUseNativeLiquidTabBar } from "./NativeLiquidTabBar";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
const TAB_ROW_HORIZONTAL_PADDING = 8;
const TAB_ROW_VERTICAL_PADDING = 6;
const IOS_NATIVE_LIQUID_MIN_VERSION = 26;

const TAB_ICON_PATHS = {
  feed: ["M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.8v-5.2H9.8V21H5a1 1 0 0 1-1-1v-9.5z"],
  cart: ["M4 6.8h16M4 11.8h12.8M4 16.8h9.6", "M17.5 14.5l2.5 2.5-2.5 2.5"],
  pending: ["M12 5v7l4.2 2.4", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"],
  purchases: [
    "M4 7.5h16a1.5 1.5 0 0 1 1.5 1.5v9.2a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.2V7.5z",
    "M4 7.5V6.8A2.8 2.8 0 0 1 6.8 4h11.4M16.5 13.7h5M17.8 13.7a1 1 0 1 0 0 .1",
  ],
  profile: [
    "M12 12.5a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2z",
    "M4.5 20.5c1.8-3 4.2-4.5 7.5-4.5s5.7 1.5 7.5 4.5",
  ],
};

const TAB_SYMBOL_NAMES = {
  feed: "house",
  cart: "chart.line.uptrend.xyaxis",
  pending: "line.3.horizontal",
  purchases: "wallet.pass",
  profile: "person",
};

const areTabArraysEqual = (left = [], right = []) => {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

const areHighlightSetsEqual = (left, right) => {
  if (left === right) return true;
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (!(left instanceof Set) || !(right instanceof Set)) return false;
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
};

const toTitleCaseLabel = (value) => {
  const source = typeof value === "string" ? value.trim() : "";
  if (!source) return source;
  const normalized = source === source.toUpperCase() ? source.toLowerCase() : source;
  return normalized
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
};

const colorWithAlpha = (hex, alpha = 1) => {
  const clamped = Math.max(0, Math.min(1, Number(alpha) || 0));
  if (typeof hex !== "string") return `rgba(0,0,0,${clamped})`;
  const value = hex.replace("#", "").trim();
  if (value.length !== 6) return `rgba(0,0,0,${clamped})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if (![r, g, b].every((channel) => Number.isFinite(channel))) {
    return `rgba(0,0,0,${clamped})`;
  }
  return `rgba(${r},${g},${b},${clamped})`;
};

const getIosMajorVersion = () => {
  if (Platform.OS !== "ios") return 0;
  const rawVersion = Platform.Version;
  if (typeof rawVersion === "string") {
    const major = Number.parseInt(rawVersion.split(".")[0], 10);
    return Number.isFinite(major) ? major : 0;
  }
  if (typeof rawVersion === "number") {
    return Number.isFinite(rawVersion) ? Math.floor(rawVersion) : 0;
  }
  return 0;
};

const TabGlyph = React.memo(function TabGlyph({ tab, color }) {
  const paths = TAB_ICON_PATHS[tab] || TAB_ICON_PATHS.feed;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {paths.map((path, index) => (
        <SvgPath
          key={`${tab}_path_${index}`}
          d={path}
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
});

const resolveTabBadge = ({
  tab,
  challengeRewardsBadgeCount,
  challengesUnlocked,
  rewardsBadgeCount,
  rewardsUnlocked,
  reportsBadgeVisible,
  reportsUnlocked,
}) => {
  if (tab === "cart") {
    const challengeCount = challengesUnlocked ? Math.max(0, Number(challengeRewardsBadgeCount) || 0) : 0;
    const rewardCount = rewardsUnlocked ? Math.max(0, Number(rewardsBadgeCount) || 0) : 0;
    return challengeCount + rewardCount;
  }
  if (tab === "profile" && reportsUnlocked && reportsBadgeVisible) {
    return 1;
  }
  return 0;
};

const LiquidGlassTabBar = ({
  availableTabs = [],
  activeTab = "feed",
  onTabPress,
  onLayout,
  getLabel,
  isDarkTheme = false,
  isProTheme = false,
  proThemeAccentColor = "#4E6BFF",
  tutorialIsTemptation = false,
  tutorialHighlightTabs,
  isCompactAndroid = false,
  tabLabelFontSize = 11,
  tabLabelTopMargin = 6,
  tabLabelTextTransform = "uppercase",
  tabBarBottomInset = 0,
  tabBarTopPadding = 16,
  androidTabBarExtra = 10,
  safeAreaBottom = 0,
  rewardsUnlocked = true,
  challengesUnlocked = true,
  challengeRewardsBadgeCount = 0,
  rewardsBadgeCount = 0,
  reportsBadgeVisible = false,
  reportsUnlocked = true,
}) => {
  const { reduceMotion } = useMotionPreferences();
  const isIos = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const iosMajorVersion = getIosMajorVersion();
  const isLegacyIos = isIos && iosMajorVersion > 0 && iosMajorVersion < IOS_NATIVE_LIQUID_MIN_VERSION;
  const useAndroidLikeVisualStyle = isAndroid || isLegacyIos;
  const [nativeProbeTick, setNativeProbeTick] = useState(0);
  const nativeLiquidAvailable = isIos && canUseNativeLiquidGlassView();
  const useNativeLiquidBackground = nativeLiquidAvailable && !isLegacyIos;
  const nativeTabBarAvailable = isIos && !isLegacyIos && canUseNativeLiquidTabBar();
  const isLiquidGlassStyle = isIos && (useNativeLiquidBackground || nativeTabBarAvailable);
  const bubbleTranslate = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const [trackLayout, setTrackLayout] = useState({ width: 0, height: 0 });
  const [tabLayouts, setTabLayouts] = useState({});
  const prismRingId = useMemo(() => `liquid-tab-prism-${Math.random().toString(36).slice(2, 10)}`, []);
  const bubbleHorizontalInset = TAB_ROW_HORIZONTAL_PADDING;
  const bubbleVerticalInset = TAB_ROW_VERTICAL_PADDING + (useAndroidLikeVisualStyle ? 4 : 0);

  useEffect(() => {
    if (!isIos || isLegacyIos) return undefined;
    if ((useNativeLiquidBackground || nativeTabBarAvailable) || nativeProbeTick >= 4) {
      return undefined;
    }
    const timerId = setTimeout(() => {
      setNativeProbeTick((prev) => prev + 1);
    }, 160 + nativeProbeTick * 140);
    return () => clearTimeout(timerId);
  }, [isIos, isLegacyIos, useNativeLiquidBackground, nativeTabBarAvailable, nativeProbeTick]);

  const activeIndex = Math.max(0, availableTabs.indexOf(activeTab));
  const activeTabLayout = tabLayouts[activeTab] || null;
  const segments = Math.max(1, availableTabs.length);
  const innerTrackWidth =
    trackLayout.width > 0 ? Math.max(0, trackLayout.width - bubbleHorizontalInset * 2) : 0;
  const innerTrackHeight =
    trackLayout.height > 0 ? Math.max(0, trackLayout.height - bubbleVerticalInset * 2) : 0;
  const segmentWidth = innerTrackWidth > 0 ? innerTrackWidth / segments : 0;
  const activeSlotWidth = Number(activeTabLayout?.width) > 0 ? Number(activeTabLayout.width) : segmentWidth;
  const activeSlotHeight = Number(activeTabLayout?.height) > 0 ? Number(activeTabLayout.height) : innerTrackHeight;
  const hasMeasuredActiveTab = Number.isFinite(Number(activeTabLayout?.x)) && Number(activeTabLayout?.width) > 0;
  const rawBubbleWidth =
    activeSlotWidth > 0
      ? Math.max(
          useAndroidLikeVisualStyle ? 58 : 88,
          activeSlotWidth - (isLiquidGlassStyle ? 8 : useAndroidLikeVisualStyle ? 10 : 14)
        )
      : 96;
  const rawBubbleHeight =
    activeSlotHeight > 0
      ? Math.max(
          useAndroidLikeVisualStyle ? 50 : 54,
          activeSlotHeight - (isLiquidGlassStyle ? 2 : useAndroidLikeVisualStyle ? 4 : 2)
        )
      : 62;
  const bubbleWidth = useAndroidLikeVisualStyle ? Math.round(rawBubbleWidth) : rawBubbleWidth;
  const bubbleHeight = useAndroidLikeVisualStyle ? Math.round(rawBubbleHeight) : rawBubbleHeight;
  const activeCenterX = hasMeasuredActiveTab
    ? Number(activeTabLayout.x) + Number(activeTabLayout.width) / 2
    : segmentWidth > 0
    ? bubbleHorizontalInset + segmentWidth * activeIndex + segmentWidth / 2
    : bubbleHorizontalInset + bubbleWidth / 2;
  const bubbleMaxX = Math.max(
    bubbleHorizontalInset,
    trackLayout.width - bubbleHorizontalInset - bubbleWidth
  );
  const rawBubbleX = activeCenterX - bubbleWidth / 2;
  const bubbleTargetX =
    (hasMeasuredActiveTab || segmentWidth > 0)
      ? Math.min(
          Math.max(bubbleHorizontalInset, rawBubbleX),
          bubbleMaxX
        )
      : bubbleHorizontalInset;

  useEffect(() => {
    if (!Number.isFinite(bubbleTargetX)) return;
    if (reduceMotion) {
      bubbleTranslate.stopAnimation();
      bubbleScale.stopAnimation();
      bubbleTranslate.setValue(bubbleTargetX);
      bubbleScale.setValue(1);
      return;
    }
    Animated.spring(bubbleTranslate, {
      toValue: bubbleTargetX,
      damping: useAndroidLikeVisualStyle ? 24 : 17,
      stiffness: useAndroidLikeVisualStyle ? 260 : 220,
      mass: useAndroidLikeVisualStyle ? 0.9 : 0.92,
      useNativeDriver: true,
    }).start();
    Animated.sequence([
      Animated.timing(bubbleScale, {
        toValue: useAndroidLikeVisualStyle ? 1.015 : 1.04,
        duration: useAndroidLikeVisualStyle ? 100 : 140,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleScale, {
        toValue: 1,
        duration: useAndroidLikeVisualStyle ? 180 : 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    activeIndex,
    bubbleScale,
    bubbleTargetX,
    bubbleTranslate,
    reduceMotion,
    useAndroidLikeVisualStyle,
  ]);

  const handleTrackLayout = useCallback((event) => {
    const nextWidth = Number(event?.nativeEvent?.layout?.width) || 0;
    const nextHeight = Number(event?.nativeEvent?.layout?.height) || 0;
    if (nextWidth > 0 && nextHeight > 0) {
      setTrackLayout((prev) => {
        if (Math.abs(prev.width - nextWidth) < 0.5 && Math.abs(prev.height - nextHeight) < 0.5) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    }
  }, []);
  const handleTabLayout = useCallback((tab, event) => {
    const nextX = Number(event?.nativeEvent?.layout?.x) || 0;
    const nextWidth = Number(event?.nativeEvent?.layout?.width) || 0;
    const nextHeight = Number(event?.nativeEvent?.layout?.height) || 0;
    if (!(nextWidth > 0 && nextHeight > 0)) return;
    setTabLayouts((prev) => {
      const prevLayout = prev[tab];
      if (
        prevLayout &&
        Math.abs(prevLayout.x - nextX) < 0.5 &&
        Math.abs(prevLayout.width - nextWidth) < 0.5 &&
        Math.abs(prevLayout.height - nextHeight) < 0.5
      ) {
        return prev;
      }
      return {
        ...prev,
        [tab]: {
          x: nextX,
          width: nextWidth,
          height: nextHeight,
        },
      };
    });
  }, []);

  const handleRootLayout = useCallback(
    (event) => {
      if (typeof onLayout === "function") {
        onLayout(event);
      }
    },
    [onLayout]
  );

  const activeColor = isDarkTheme ? "#EEF1F6" : isProTheme ? "#18213D" : "#202129";
  const mutedColor = isDarkTheme ? "rgba(238,241,246,0.68)" : "rgba(32,33,41,0.64)";
  const highlightColor = isDarkTheme ? "#D7A84F" : isProTheme ? proThemeAccentColor : "#356A9A";
  const badgeBackground = isDarkTheme ? "#D7A84F" : isProTheme ? proThemeAccentColor : "#24262D";
  const badgeText = isDarkTheme ? "#211A0B" : "#FFFFFF";
  const resolvedTabLabelTextTransform =
    useAndroidLikeVisualStyle ? "none" : isLiquidGlassStyle ? "none" : tabLabelTextTransform;
  const resolvedTabLabelFontSize = useAndroidLikeVisualStyle
    ? Math.max(9, tabLabelFontSize - 1)
    : tabLabelFontSize;
  const resolvedTabLabelTopMargin = useAndroidLikeVisualStyle
    ? Math.max(2, tabLabelTopMargin - 1)
    : tabLabelTopMargin;

  const barBottomInset = isAndroid
    ? Math.max(0, Number(tabBarBottomInset) || 0) + Math.max(0, Number(androidTabBarExtra) || 0)
    : Math.max(0, Number(tabBarBottomInset) || 0);

  const rootStyle = {
    paddingBottom: barBottomInset,
    marginBottom: isIos && !useAndroidLikeVisualStyle ? -(Number(safeAreaBottom) || 0) : 0,
    paddingTop: tabBarTopPadding,
    paddingHorizontal: 14,
    opacity: tutorialIsTemptation ? 0.35 : 1,
    backgroundColor: "transparent",
  };
  const nativeOnlyRootStyle = {
    paddingBottom: barBottomInset,
    marginBottom: isIos && !useAndroidLikeVisualStyle ? -(Number(safeAreaBottom) || 0) : 0,
    paddingTop: tabBarTopPadding,
    paddingHorizontal: 8,
    opacity: tutorialIsTemptation ? 0.35 : 1,
  };

  const tabPayload = useMemo(
    () =>
      availableTabs.map((tab) => {
        const badgeValue = resolveTabBadge({
          tab,
          challengeRewardsBadgeCount,
          challengesUnlocked,
          rewardsBadgeCount,
          rewardsUnlocked,
          reportsBadgeVisible,
          reportsUnlocked,
        });
        return {
          key: tab,
          title: typeof getLabel === "function" ? getLabel(tab) : tab,
          symbolName: TAB_SYMBOL_NAMES[tab] || "circle",
          badgeValue: badgeValue > 0 ? (badgeValue > 99 ? "99+" : String(badgeValue)) : null,
        };
      }),
    [
      availableTabs,
      challengeRewardsBadgeCount,
      challengesUnlocked,
      getLabel,
      reportsBadgeVisible,
      reportsUnlocked,
      rewardsBadgeCount,
      rewardsUnlocked,
    ]
  );

  const trackBaseColor = isDarkTheme
    ? "rgba(20,25,35,0.84)"
    : isLiquidGlassStyle
    ? "rgba(244,247,252,0.84)"
    : isProTheme
    ? colorWithAlpha(proThemeAccentColor, 0.1)
    : "rgba(225,231,241,0.72)";
  const trackBorderColor = isDarkTheme
    ? "rgba(255,255,255,0.14)"
    : isLiquidGlassStyle
    ? "rgba(255,255,255,0.78)"
    : isProTheme
    ? colorWithAlpha(proThemeAccentColor, 0.24)
    : "rgba(14,23,40,0.14)";
  const bubbleBorderColor = isDarkTheme
    ? "rgba(255,255,255,0.28)"
    : isLiquidGlassStyle
    ? "rgba(255,255,255,0.92)"
    : "rgba(255,255,255,0.86)";
  const androidTrackBlurIntensity = isCompactAndroid ? 10 : 12;
  const androidTrackBlurReductionFactor = isCompactAndroid ? 4 : 3;
  const androidBubbleTintBase = isDarkTheme ? "rgba(30,37,50,0.64)" : "rgba(255,255,255,0.68)";
  const shouldUseAndroidBubbleTintFallback = useAndroidLikeVisualStyle && !useNativeLiquidBackground;
  const shouldUseNativeOnly = nativeTabBarAvailable;
  const shouldRenderInnerBubble = availableTabs.length > 0;

  if (shouldUseNativeOnly) {
    return (
      <View style={nativeOnlyRootStyle} onLayout={handleRootLayout}>
        <View style={styles.nativeOnlyBar}>
          <NativeLiquidTabBar
            style={StyleSheet.absoluteFill}
            items={tabPayload}
            selectedKey={activeTab}
            isDarkTheme={isDarkTheme}
            onTabPress={onTabPress}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={rootStyle} onLayout={handleRootLayout}>
      <View
        style={[styles.track, { backgroundColor: trackBaseColor, borderColor: trackBorderColor }]}
        onLayout={handleTrackLayout}
      >
        {useNativeLiquidBackground ? (
          <LiquidGlassNativeView
            style={StyleSheet.absoluteFill}
            cornerRadius={999}
            tintAlpha={isDarkTheme ? 0.16 : 0.12}
            strokeOpacity={isDarkTheme ? 0.24 : 0.2}
          />
        ) : (
          <ExpoBlurView
            tint={isDarkTheme ? "dark" : "extraLight"}
            intensity={useAndroidLikeVisualStyle ? androidTrackBlurIntensity : 34}
            blurReductionFactor={useAndroidLikeVisualStyle ? androidTrackBlurReductionFactor : undefined}
            experimentalBlurMethod={useAndroidLikeVisualStyle ? "dimezisBlurView" : undefined}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: isDarkTheme
                ? "rgba(0,0,0,0.12)"
                : isLiquidGlassStyle
                ? "rgba(255,255,255,0.08)"
                : useAndroidLikeVisualStyle
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.12)",
            },
          ]}
        />

        {shouldRenderInnerBubble && availableTabs.length > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeBubble,
              {
                top: bubbleVerticalInset,
                width: bubbleWidth,
                height: bubbleHeight,
                borderRadius: bubbleHeight / 2,
                borderColor: bubbleBorderColor,
                transform: [{ translateX: bubbleTranslate }, { scale: bubbleScale }],
              },
            ]}
          >
            {useNativeLiquidBackground ? (
              <LiquidGlassNativeView
                style={StyleSheet.absoluteFill}
                cornerRadius={bubbleHeight / 2}
                tintAlpha={isDarkTheme ? 0.22 : 0.16}
                strokeOpacity={isDarkTheme ? 0.34 : 0.36}
              />
            ) : shouldUseAndroidBubbleTintFallback ? (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: androidBubbleTintBase,
                  },
                ]}
              />
            ) : (
              <ExpoBlurView
                tint={isDarkTheme ? "dark" : "light"}
                intensity={useAndroidLikeVisualStyle ? 34 : 56}
                blurReductionFactor={useAndroidLikeVisualStyle ? 2 : undefined}
                experimentalBlurMethod={useAndroidLikeVisualStyle ? "dimezisBlurView" : undefined}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View
              pointerEvents="none"
              style={[
                styles.activeBubbleOverlay,
                {
                  backgroundColor: isDarkTheme
                    ? "rgba(255,255,255,0.045)"
                    : isLiquidGlassStyle
                    ? "rgba(255,255,255,0.18)"
                    : useAndroidLikeVisualStyle
                    ? "rgba(255,255,255,0.16)"
                    : "rgba(255,255,255,0.28)",
                },
              ]}
            />
            {!useAndroidLikeVisualStyle && (
              <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
                <Defs>
                  <SvgRadialGradient id={prismRingId} cx="50%" cy="50%" r="50%">
                    <SvgStop offset="0%" stopColor="rgba(255,255,255,0)" />
                    <SvgStop offset="64%" stopColor="rgba(255,255,255,0)" />
                    <SvgStop offset="74%" stopColor={isDarkTheme ? "rgba(123,180,218,0.24)" : "rgba(123,199,235,0.4)"} />
                    <SvgStop offset="83%" stopColor={isDarkTheme ? "rgba(126,205,177,0.2)" : "rgba(126,220,190,0.36)"} />
                    <SvgStop offset="90%" stopColor={isDarkTheme ? "rgba(211,159,108,0.2)" : "rgba(228,169,112,0.34)"} />
                    <SvgStop offset="100%" stopColor={isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.16)"} />
                  </SvgRadialGradient>
                  <SvgLinearGradient id={`${prismRingId}_shine`} x1="0" y1="0" x2="1" y2="1">
                    <SvgStop offset="0%" stopColor={isDarkTheme ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.4)"} />
                    <SvgStop offset="40%" stopColor="rgba(255,255,255,0.08)" />
                    <SvgStop offset="100%" stopColor={isDarkTheme ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.28)"} />
                  </SvgLinearGradient>
                </Defs>
                <SvgRect x="4" y="4" width="92" height="92" rx="46" fill={`url(#${prismRingId}_shine)`} opacity="0.32" />
                <SvgCircle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke={`url(#${prismRingId})`}
                  strokeWidth="2.8"
                  opacity={isDarkTheme ? 0.62 : 0.82}
                />
              </Svg>
            )}
            {!useAndroidLikeVisualStyle && <View style={styles.bubbleSpecularTop} />}
            {!useAndroidLikeVisualStyle && <View style={styles.bubbleSpecularBottom} />}
          </Animated.View>
        )}

        <View style={styles.tabRow}>
          {availableTabs.map((tab) => {
            const isActive = tab === activeTab;
            const isHighlighted = !tutorialIsTemptation && !!tutorialHighlightTabs?.has(tab);
            const rawTabLabel = typeof getLabel === "function" ? getLabel(tab) : tab;
            const tabLabel = useAndroidLikeVisualStyle ? toTitleCaseLabel(rawTabLabel) : rawTabLabel;
            const badgeValue = resolveTabBadge({
              tab,
              challengeRewardsBadgeCount,
              challengesUnlocked,
              rewardsBadgeCount,
              rewardsUnlocked,
              reportsBadgeVisible,
              reportsUnlocked,
            });
            const tabTextColor = isActive ? activeColor : isHighlighted ? highlightColor : mutedColor;

            return (
              <Pressable
                key={tab}
                style={[styles.tabButton, isCompactAndroid && styles.tabButtonCompact]}
                onPress={() => onTabPress?.(tab)}
                onLayout={(event) => handleTabLayout(tab, event)}
                accessibilityRole="tab"
                accessibilityLabel={tabLabel}
                accessibilityState={{ selected: isActive }}
                accessibilityHint={isActive ? undefined : tabLabel}
                hitSlop={4}
              >
                {isHighlighted && !isActive && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.highlightHalo,
                      {
                        backgroundColor: isDarkTheme
                          ? "rgba(255,255,255,0.07)"
                          : isProTheme
                          ? colorWithAlpha(proThemeAccentColor, 0.2)
                          : "rgba(255,255,255,0.34)",
                        borderColor: isDarkTheme
                          ? "rgba(255,255,255,0.18)"
                          : isProTheme
                          ? colorWithAlpha(proThemeAccentColor, 0.4)
                          : "rgba(0,0,0,0.1)",
                      },
                    ]}
                  />
                )}

                <TabGlyph tab={tab} color={tabTextColor} />
                <Text
                  numberOfLines={1}
                  allowFontScaling
                  maxFontSizeMultiplier={1.2}
                  ellipsizeMode="tail"
                  style={[
                    styles.tabLabel,
                    {
                      color: tabTextColor,
                      fontSize: resolvedTabLabelFontSize,
                      letterSpacing: useAndroidLikeVisualStyle ? 0.02 : 0.2,
                      marginTop: resolvedTabLabelTopMargin,
                      textTransform: resolvedTabLabelTextTransform,
                      fontWeight: isActive || isHighlighted ? "700" : "500",
                    },
                  ]}
                >
                  {tabLabel}
                </Text>

                {badgeValue > 0 && (
                  <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
                    <Text
                      allowFontScaling
                      maxFontSizeMultiplier={1.2}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={[styles.badgeText, { color: badgeText }]}
                    >
                      {badgeValue > 99 ? "99+" : `${badgeValue}`}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden",
    justifyContent: "center",
  },
  nativeOnlyBar: {
    minHeight: 84,
    borderRadius: 42,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  activeBubble: {
    position: "absolute",
    left: 0,
    borderWidth: 1,
    overflow: "hidden",
  },
  activeBubbleOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bubbleSpecularTop: {
    position: "absolute",
    top: 8,
    left: "18%",
    right: "18%",
    height: 12,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.26)",
  },
  bubbleSpecularBottom: {
    position: "absolute",
    bottom: 8,
    left: "24%",
    right: "24%",
    height: 7,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: TAB_ROW_HORIZONTAL_PADDING,
    paddingVertical: TAB_ROW_VERTICAL_PADDING,
    zIndex: 3,
  },
  tabButton: {
    flex: 1,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  tabButtonCompact: {
    minHeight: 56,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  highlightHalo: {
    ...StyleSheet.absoluteFillObject,
    top: 6,
    bottom: 6,
    left: 4,
    right: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
});

export default React.memo(
  LiquidGlassTabBar,
  (prevProps, nextProps) =>
    areTabArraysEqual(prevProps.availableTabs, nextProps.availableTabs) &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.onTabPress === nextProps.onTabPress &&
    prevProps.onLayout === nextProps.onLayout &&
    prevProps.getLabel === nextProps.getLabel &&
    prevProps.isDarkTheme === nextProps.isDarkTheme &&
    prevProps.isProTheme === nextProps.isProTheme &&
    prevProps.proThemeAccentColor === nextProps.proThemeAccentColor &&
    prevProps.tutorialIsTemptation === nextProps.tutorialIsTemptation &&
    areHighlightSetsEqual(prevProps.tutorialHighlightTabs, nextProps.tutorialHighlightTabs) &&
    prevProps.isCompactAndroid === nextProps.isCompactAndroid &&
    prevProps.tabLabelFontSize === nextProps.tabLabelFontSize &&
    prevProps.tabLabelTopMargin === nextProps.tabLabelTopMargin &&
    prevProps.tabLabelTextTransform === nextProps.tabLabelTextTransform &&
    prevProps.tabBarBottomInset === nextProps.tabBarBottomInset &&
    prevProps.tabBarTopPadding === nextProps.tabBarTopPadding &&
    prevProps.androidTabBarExtra === nextProps.androidTabBarExtra &&
    prevProps.safeAreaBottom === nextProps.safeAreaBottom &&
    prevProps.rewardsUnlocked === nextProps.rewardsUnlocked &&
    prevProps.challengesUnlocked === nextProps.challengesUnlocked &&
    prevProps.challengeRewardsBadgeCount === nextProps.challengeRewardsBadgeCount &&
    prevProps.rewardsBadgeCount === nextProps.rewardsBadgeCount &&
    prevProps.reportsBadgeVisible === nextProps.reportsBadgeVisible &&
    prevProps.reportsUnlocked === nextProps.reportsUnlocked
);
