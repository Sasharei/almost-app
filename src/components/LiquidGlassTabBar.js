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
const TAB_ROW_HORIZONTAL_PADDING = 8;
const TAB_ROW_VERTICAL_PADDING = 6;

const TAB_ICON_PATHS = {
  feed: ["M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.8v-5.2H9.8V21H5a1 1 0 0 1-1-1v-9.5z"],
  cart: ["M4 6.8h16M4 11.8h12.8M4 16.8h9.6", "M17.5 14.5l2.5 2.5-2.5 2.5"],
  pending: ["M12 5v7l4.2 2.4", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"],
  purchases: [
    "M4 9.5h16V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z",
    "M12 9.5V21M4 13.4h16M7.4 9.5c-1.3 0-2.4-1-2.4-2.3S6.1 5 7.4 5c2.2 0 3.3 2.2 4.6 4.5M16.6 9.5c1.3 0 2.4-1 2.4-2.3S17.9 5 16.6 5c-2.2 0-3.3 2.2-4.6 4.5",
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
  purchases: "gift",
  profile: "person",
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
  if (tab === "cart" && challengesUnlocked && challengeRewardsBadgeCount > 0) {
    return challengeRewardsBadgeCount;
  }
  if (tab === "purchases" && rewardsUnlocked && rewardsBadgeCount > 0) {
    return rewardsBadgeCount;
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
  const isIos = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const [nativeProbeTick, setNativeProbeTick] = useState(0);
  const nativeLiquidAvailable = isIos && canUseNativeLiquidGlassView();
  const nativeTabBarAvailable = isIos && canUseNativeLiquidTabBar();
  const isLiquidGlassStyle = isIos && (nativeLiquidAvailable || nativeTabBarAvailable);
  const bubbleTranslate = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const [trackLayout, setTrackLayout] = useState({ width: 0, height: 0 });
  const [tabLayouts, setTabLayouts] = useState({});
  const prismRingId = useMemo(() => `liquid-tab-prism-${Math.random().toString(36).slice(2, 10)}`, []);
  const bubbleHorizontalInset = TAB_ROW_HORIZONTAL_PADDING;
  const bubbleVerticalInset = TAB_ROW_VERTICAL_PADDING + (isAndroid ? 4 : 0);

  useEffect(() => {
    if (!isIos) return undefined;
    if ((nativeLiquidAvailable || nativeTabBarAvailable) || nativeProbeTick >= 4) {
      return undefined;
    }
    const timerId = setTimeout(() => {
      setNativeProbeTick((prev) => prev + 1);
    }, 160 + nativeProbeTick * 140);
    return () => clearTimeout(timerId);
  }, [isIos, nativeLiquidAvailable, nativeTabBarAvailable, nativeProbeTick]);

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
      ? Math.max(isAndroid ? 82 : 88, activeSlotWidth - (isLiquidGlassStyle ? 8 : isAndroid ? 10 : 14))
      : 96;
  const rawBubbleHeight =
    activeSlotHeight > 0
      ? Math.max(isAndroid ? 50 : 54, activeSlotHeight - (isLiquidGlassStyle ? 2 : isAndroid ? 4 : 2))
      : 62;
  const bubbleWidth = isAndroid ? Math.round(rawBubbleWidth) : rawBubbleWidth;
  const bubbleHeight = isAndroid ? Math.round(rawBubbleHeight) : rawBubbleHeight;
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
    Animated.spring(bubbleTranslate, {
      toValue: bubbleTargetX,
      damping: isAndroid ? 24 : 17,
      stiffness: isAndroid ? 260 : 220,
      mass: isAndroid ? 0.9 : 0.92,
      useNativeDriver: true,
    }).start();
    Animated.sequence([
      Animated.timing(bubbleScale, {
        toValue: isAndroid ? 1.015 : 1.04,
        duration: isAndroid ? 100 : 140,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleScale, {
        toValue: 1,
        duration: isAndroid ? 180 : 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeIndex, bubbleScale, bubbleTargetX, bubbleTranslate, isAndroid]);

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

  const activeColor = isDarkTheme ? "#FFFFFF" : isProTheme ? "#142564" : "#0E1728";
  const mutedColor = isDarkTheme ? "rgba(255,255,255,0.78)" : "rgba(12,20,36,0.62)";
  const highlightColor = isDarkTheme ? "#FFFFFF" : isProTheme ? proThemeAccentColor : "#1C2F86";
  const badgeBackground = isDarkTheme ? "#FEE5A8" : isProTheme ? proThemeAccentColor : "#0E1728";
  const badgeText = isDarkTheme ? "#05070D" : "#FFFFFF";
  const resolvedTabLabelTextTransform =
    Platform.OS === "android" ? "none" : isLiquidGlassStyle ? "none" : tabLabelTextTransform;
  const resolvedTabLabelFontSize = Platform.OS === "android" ? Math.max(9, tabLabelFontSize - 1) : tabLabelFontSize;
  const resolvedTabLabelTopMargin = Platform.OS === "android" ? Math.max(2, tabLabelTopMargin - 1) : tabLabelTopMargin;

  const barBottomInset =
    Platform.OS === "ios"
      ? Math.max(0, Number(tabBarBottomInset) || 0)
      : Math.max(0, Number(tabBarBottomInset) || 0) + (Platform.OS === "android" ? androidTabBarExtra : 0);

  const rootStyle = {
    paddingBottom: barBottomInset,
    marginBottom: Platform.OS === "ios" ? -(Number(safeAreaBottom) || 0) : 0,
    paddingTop: tabBarTopPadding,
    paddingHorizontal: 14,
    opacity: tutorialIsTemptation ? 0.35 : 1,
  };
  const nativeOnlyRootStyle = {
    paddingBottom: barBottomInset,
    marginBottom: Platform.OS === "ios" ? -(Number(safeAreaBottom) || 0) : 0,
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
    ? "rgba(33,36,44,0.72)"
    : isLiquidGlassStyle
    ? "rgba(244,247,252,0.84)"
    : isProTheme
    ? colorWithAlpha(proThemeAccentColor, 0.16)
    : "rgba(225,231,241,0.72)";
  const trackBorderColor = isDarkTheme
    ? "rgba(255,255,255,0.24)"
    : isLiquidGlassStyle
    ? "rgba(255,255,255,0.78)"
    : isProTheme
    ? colorWithAlpha(proThemeAccentColor, 0.34)
    : "rgba(14,23,40,0.14)";
  const bubbleBorderColor = isDarkTheme
    ? "rgba(255,255,255,0.55)"
    : isLiquidGlassStyle
    ? "rgba(255,255,255,0.92)"
    : "rgba(255,255,255,0.86)";
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
        {nativeLiquidAvailable ? (
          <LiquidGlassNativeView
            style={StyleSheet.absoluteFill}
            cornerRadius={999}
            tintAlpha={isDarkTheme ? 0.22 : 0.14}
            strokeOpacity={isDarkTheme ? 0.36 : 0.24}
          />
        ) : (
          <ExpoBlurView
            tint={isDarkTheme ? "dark" : "extraLight"}
            intensity={Platform.OS === "android" ? 18 : 34}
            blurReductionFactor={Platform.OS === "android" ? 1 : undefined}
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
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
                : Platform.OS === "android"
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
            {nativeLiquidAvailable ? (
              <LiquidGlassNativeView
                style={StyleSheet.absoluteFill}
                cornerRadius={bubbleHeight / 2}
                tintAlpha={isDarkTheme ? 0.32 : 0.2}
                strokeOpacity={isDarkTheme ? 0.65 : 0.46}
              />
            ) : (
              <ExpoBlurView
                tint={isDarkTheme ? "dark" : "light"}
                intensity={Platform.OS === "android" ? 34 : 56}
                blurReductionFactor={Platform.OS === "android" ? 1 : undefined}
                experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View
              pointerEvents="none"
              style={[
                styles.activeBubbleOverlay,
                {
                  backgroundColor: isDarkTheme
                    ? "rgba(255,255,255,0.08)"
                    : isLiquidGlassStyle
                    ? "rgba(255,255,255,0.18)"
                    : Platform.OS === "android"
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.28)",
                },
              ]}
            />
            {!isAndroid && (
              <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
                <Defs>
                  <SvgRadialGradient id={prismRingId} cx="50%" cy="50%" r="50%">
                    <SvgStop offset="0%" stopColor="rgba(255,255,255,0)" />
                    <SvgStop offset="64%" stopColor="rgba(255,255,255,0)" />
                    <SvgStop offset="74%" stopColor="rgba(123,219,255,0.55)" />
                    <SvgStop offset="83%" stopColor="rgba(126,255,198,0.5)" />
                    <SvgStop offset="90%" stopColor="rgba(255,183,112,0.5)" />
                    <SvgStop offset="100%" stopColor="rgba(255,255,255,0.18)" />
                  </SvgRadialGradient>
                  <SvgLinearGradient id={`${prismRingId}_shine`} x1="0" y1="0" x2="1" y2="1">
                    <SvgStop offset="0%" stopColor="rgba(255,255,255,0.48)" />
                    <SvgStop offset="40%" stopColor="rgba(255,255,255,0.08)" />
                    <SvgStop offset="100%" stopColor="rgba(255,255,255,0.34)" />
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
                  opacity="0.95"
                />
              </Svg>
            )}
            {!isAndroid && <View style={styles.bubbleSpecularTop} />}
            {!isAndroid && <View style={styles.bubbleSpecularBottom} />}
          </Animated.View>
        )}

        <View style={styles.tabRow}>
          {availableTabs.map((tab) => {
            const isActive = tab === activeTab;
            const isHighlighted = !tutorialIsTemptation && !!tutorialHighlightTabs?.has(tab);
            const rawTabLabel = typeof getLabel === "function" ? getLabel(tab) : tab;
            const tabLabel = Platform.OS === "android" ? toTitleCaseLabel(rawTabLabel) : rawTabLabel;
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
              >
                {isHighlighted && !isActive && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.highlightHalo,
                      {
                        backgroundColor: isDarkTheme
                          ? "rgba(255,255,255,0.12)"
                          : isProTheme
                          ? colorWithAlpha(proThemeAccentColor, 0.2)
                          : "rgba(255,255,255,0.34)",
                        borderColor: isDarkTheme
                          ? "rgba(255,255,255,0.28)"
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
                  adjustsFontSizeToFit={Platform.OS !== "android"}
                  minimumFontScale={Platform.OS === "android" ? 0.9 : 0.72}
                  ellipsizeMode={Platform.OS === "android" ? "tail" : "clip"}
                  style={[
                    styles.tabLabel,
                    {
                      color: tabTextColor,
                      fontSize: resolvedTabLabelFontSize,
                      letterSpacing: Platform.OS === "android" ? 0.02 : 0.2,
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
                    <Text style={[styles.badgeText, { color: badgeText }]}>
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

export default React.memo(LiquidGlassTabBar);
