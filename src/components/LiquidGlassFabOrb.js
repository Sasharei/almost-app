import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect as SvgRect,
  Stop as SvgStop,
} from "react-native-svg";
import PlatformGlassBackground, {
  isNativeLiquidGlassAvailable,
} from "./PlatformGlassBackground";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import { createMotionLoop } from "../utils/motion";
import { UI_TOUCH_TARGET } from "../constants/designSystem";

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

const INVISIBLE_ICON_MARKS_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;
const CURRENCY_SYMBOL_HINT_REGEX = /[€£¥₽₸₩₺₫฿₦₹₱₪₭₲₡₵₼₾₥₳₣₤₰¢$﷼]/;
const CURRENCY_CODE_ABBREVIATION_REGEX = /^[A-Za-z]{2,5}$/;

const normalizeIconLabel = (icon) => {
  const normalized =
    (typeof icon === "string" ? icon : String(icon || ""))
      .replace(INVISIBLE_ICON_MARKS_REGEX, "")
      .replace(/\s+/g, " ")
      .trim();
  return normalized || "$";
};

const getVisibleGlyphCount = (label = "") =>
  Math.max(1, Array.from(String(label).replace(/\s+/g, "")).length);

const getIconKind = (label = "") => {
  if (label === "+") return "plus";
  const compact = String(label).replace(/\s+/g, "");
  if (!compact) return "symbol";
  if (CURRENCY_CODE_ABBREVIATION_REGEX.test(compact)) return "abbreviation";
  const hasLatinLetters = /[A-Za-z]/.test(compact);
  const hasDigits = /\d/.test(compact);
  if (CURRENCY_SYMBOL_HINT_REGEX.test(compact)) return "symbol";
  if (!hasLatinLetters && !hasDigits) return "symbol";
  return "mixed";
};

const resolveIconSize = (icon, size) => {
  const iconLabel = normalizeIconLabel(icon);
  const iconKind = getIconKind(iconLabel);
  const glyphCount = getVisibleGlyphCount(iconLabel);

  if (iconKind === "plus") return Math.round(size * 0.44);
  if (iconKind === "symbol") {
    if (glyphCount <= 1) return Math.round(size * 0.48);
    if (glyphCount === 2) return Math.round(size * 0.43);
    return Math.round(size * 0.4);
  }
  if (iconKind === "abbreviation") {
    if (glyphCount <= 2) return Math.round(size * 0.41);
    if (glyphCount === 3) return Math.round(size * 0.37);
    if (glyphCount === 4) return Math.round(size * 0.34);
    return Math.round(size * 0.31);
  }
  if (glyphCount <= 1) return Math.round(size * 0.46);
  if (glyphCount === 2) return Math.round(size * 0.4);
  if (glyphCount === 3) return Math.round(size * 0.36);
  return Math.round(size * 0.33);
};

const snapEvenSize = (value = 0) => {
  const rounded = Math.max(0, Math.round(Number(value) || 0));
  return rounded % 2 === 0 ? rounded : rounded + 1;
};

const LiquidGlassFabOrb = ({
  size = 64,
  icon = "$",
  iconColor = "#0D1930",
  isDarkTheme = false,
  isProTheme = false,
  proThemeAccentColor = "#4E6BFF",
  highlighted = false,
}) => {
  const { reduceMotion, reduceTransparency } = useMotionPreferences();
  const resolvedSize = Math.max(UI_TOUCH_TARGET.current, Number(size) || 64);
  const radius = resolvedSize / 2;
  const isAndroid = Platform.OS === "android";
  const nativeLiquidGlassAvailable = isNativeLiquidGlassAvailable();
  const suppressArtificialHighlights = reduceTransparency || nativeLiquidGlassAvailable;
  const useMutedIosLightStyle = suppressArtificialHighlights && !isDarkTheme;
  const shouldUseNativeLiquidGlass = nativeLiquidGlassAvailable;
  const useTransparentIosNativeStyle = useMutedIosLightStyle && shouldUseNativeLiquidGlass;
  const shimmer = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const prismId = useMemo(() => `fab-prism-${Math.random().toString(36).slice(2, 10)}`, []);

  useEffect(() => {
    if (reduceMotion || !highlighted) {
      shimmer.stopAnimation();
      breathe.stopAnimation();
      shimmer.setValue(0.5);
      breathe.setValue(0);
      return undefined;
    }
    const shouldAnimateShimmer = !isAndroid;
    let shimmerLoop = null;
    if (shouldAnimateShimmer) {
      shimmerLoop = createMotionLoop(
        Animated.sequence([
          Animated.timing(shimmer, {
            toValue: 1,
            duration: 2700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(shimmer, {
            toValue: 0,
            duration: 3200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
            isInteraction: false,
          }),
        ])
      );
      shimmerLoop.start();
    } else {
      // Keep static specular alignment on Android while avoiding an extra perpetual loop.
      shimmer.setValue(0.5);
    }
    const breatheLoop = createMotionLoop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );
    breatheLoop.start();
    return () => {
      shimmerLoop?.stop?.();
      breatheLoop.stop();
    };
  }, [breathe, highlighted, isAndroid, reduceMotion, shimmer]);

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-resolvedSize * 0.08, resolvedSize * 0.1],
  });
  const shimmerY = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-resolvedSize * 0.03, resolvedSize * 0.03],
  });
  const sparkleX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-resolvedSize * 0.09, resolvedSize * 0.06],
  });
  const dropletScaleX = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.028],
  });
  const dropletScaleY = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.987],
  });
  const showOuterAura = highlighted && !suppressArtificialHighlights;
  const showPrismOrRim = !shouldUseNativeLiquidGlass && !suppressArtificialHighlights;
  const renderSyntheticPrism = !shouldUseNativeLiquidGlass && !isAndroid && !suppressArtificialHighlights;
  const showSpecularArtifacts = !shouldUseNativeLiquidGlass && !isAndroid && !suppressArtificialHighlights;
  const ringOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: isAndroid ? [0.16, 0.28] : renderSyntheticPrism ? [0.38, 0.64] : [0.24, 0.42],
  });
  const auraOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: isAndroid
      ? [highlighted ? 0.24 : 0.06, highlighted ? 0.42 : 0.14]
      : [highlighted ? 0.3 : 0.12, highlighted ? 0.5 : 0.24],
  });
  const specularOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.7],
  });

  const accent = isProTheme ? proThemeAccentColor : isDarkTheme ? "#82A8CE" : "#6F9BC7";
  const androidBorderColor = highlighted ? "rgba(14,23,40,0.22)" : "rgba(14,23,40,0.14)";
  const shellBorderColor = highlighted
    ? isAndroid
      ? androidBorderColor
      : isDarkTheme
      ? colorWithAlpha(accent, 0.62)
      : colorWithAlpha(accent, 0.68)
    : isAndroid
    ? androidBorderColor
    : isDarkTheme
    ? "rgba(255,255,255,0.3)"
    : "rgba(255,255,255,0.72)";
  const tintOverlayColor = isAndroid
    ? isDarkTheme
      ? "rgba(9,13,22,0.14)"
      : "rgba(255,255,255,0.08)"
    : useTransparentIosNativeStyle
    ? isProTheme
      ? colorWithAlpha(accent, 0.08)
      : "rgba(255,255,255,0.06)"
    : useMutedIosLightStyle
    ? isProTheme
      ? colorWithAlpha(accent, 0.12)
      : "rgba(244,247,252,0.46)"
    : isDarkTheme
    ? "rgba(7,11,22,0.3)"
    : nativeLiquidGlassAvailable
    ? "rgba(255,255,255,0.03)"
    : isProTheme
    ? colorWithAlpha(accent, 0.18)
    : "rgba(255,255,255,0.24)";
  const androidShellFillColor = isDarkTheme
    ? highlighted
      ? "rgba(31,45,70,0.9)"
      : "rgba(24,37,58,0.82)"
    : isProTheme
    ? colorWithAlpha(accent, highlighted ? 0.34 : 0.24)
    : highlighted
    ? "rgba(243,248,255,0.96)"
    : "rgba(236,243,253,0.9)";
  const auraColor = highlighted
    ? isAndroid
      ? "rgba(255,255,255,0.22)"
      : isDarkTheme
      ? colorWithAlpha(accent, 0.28)
      : isProTheme
      ? colorWithAlpha(accent, 0.44)
      : "rgba(122,198,255,0.4)"
    : isAndroid
    ? "rgba(255,255,255,0.08)"
    : isDarkTheme
    ? "rgba(110,164,255,0.2)"
    : "rgba(139,189,255,0.16)";
  const topSpecularColor = isDarkTheme ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.68)";
  const bottomSpecularColor = isDarkTheme ? "rgba(173,229,255,0.14)" : "rgba(138,204,255,0.28)";
  const sparkleColor = isDarkTheme ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.7)";
  const nativeRimColor = isDarkTheme ? "rgba(255,255,255,0.28)" : isAndroid ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.64)";
  const iconLabel = useMemo(() => normalizeIconLabel(icon), [icon]);
  const iconKind = useMemo(() => getIconKind(iconLabel), [iconLabel]);
  const iconGlyphCount = getVisibleGlyphCount(iconLabel);
  const iconHasLatinLetters = /[A-Za-z]/.test(iconLabel);
  const iconSize = snapEvenSize(resolveIconSize(iconLabel, resolvedSize));
  const iconMinimumScale = useMemo(() => {
    if (iconKind === "plus") return 1;
    if (iconKind === "symbol") return 0.94;
    if (iconKind === "abbreviation") return iconGlyphCount <= 3 ? 0.88 : 0.84;
    return iconGlyphCount <= 2 ? 0.88 : 0.82;
  }, [iconGlyphCount, iconKind]);
  const shouldAutoFitIcon = iconKind === "abbreviation" || iconKind === "mixed";
  const iconLayerSize = snapEvenSize(resolvedSize * 0.76);
  const iconLetterSpacing =
    iconGlyphCount <= 1
      ? 0
      : iconHasLatinLetters
      ? 0.12
      : 0.22;

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { width: resolvedSize, height: resolvedSize, borderRadius: radius }]}
    >
      {showOuterAura && (
        <Animated.View
          style={[
            styles.aura,
            {
              width: resolvedSize * 1.22,
              height: resolvedSize * 1.22,
              borderRadius: resolvedSize * 0.61,
              top: (resolvedSize - resolvedSize * 1.22) / 2,
              left: (resolvedSize - resolvedSize * 1.22) / 2,
              backgroundColor: auraColor,
              opacity: auraOpacity,
            },
          ]}
        />
      )}

      <View
        pointerEvents="none"
        style={[
          styles.shadowPlate,
          {
            borderRadius: radius,
            backgroundColor: isAndroid
              ? isDarkTheme
                ? "rgba(10,16,28,0.28)"
                : "rgba(244,248,255,0.18)"
              : "rgba(255,255,255,0.01)",
            shadowColor: "#020713",
            shadowOpacity: highlighted ? 0.34 : isDarkTheme ? 0.32 : 0.24,
            shadowRadius: highlighted ? 10 : 8,
            shadowOffset: { width: 0, height: highlighted ? 7 : 5 },
            elevation: isAndroid ? (highlighted ? 12 : 10) : 0,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.shell,
          {
            borderRadius: radius,
            borderColor: shellBorderColor,
            transform: [{ scaleX: dropletScaleX }, { scaleY: dropletScaleY }],
          },
        ]}
      >
        <PlatformGlassBackground
          style={{ borderRadius: radius }}
          isDarkTheme={isDarkTheme}
          glassEffectStyle="regular"
          tintColor={
            isProTheme
              ? colorWithAlpha(accent, 0.14)
              : isDarkTheme
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.1)"
          }
          fallbackColor={
            isAndroid
              ? isDarkTheme
                ? "rgba(9,13,22,0.42)"
                : isProTheme
                ? colorWithAlpha(accent, 0.14)
                : "rgba(244,248,255,0.28)"
              : useMutedIosLightStyle
              ? "rgba(244,247,252,0.22)"
              : tintOverlayColor
          }
          solidFallbackColor={androidShellFillColor}
          borderColor="transparent"
          androidIntensity={36}
          iosFallbackIntensity={58}
        />

        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: tintOverlayColor }]} />

        {showPrismOrRim &&
          (renderSyntheticPrism ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: ringOpacity }]}>
              <Svg width="100%" height="100%" viewBox="0 0 100 100">
                <Defs>
                  <SvgLinearGradient id={`${prismId}_fill`} x1="0" y1="0" x2="1" y2="1">
                    <SvgStop offset="0%" stopColor="rgba(255,255,255,0.56)" />
                    <SvgStop offset="42%" stopColor="rgba(193,226,255,0.22)" />
                    <SvgStop offset="78%" stopColor="rgba(136,194,255,0.2)" />
                    <SvgStop offset="100%" stopColor="rgba(255,255,255,0.06)" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id={`${prismId}_rim`} x1="0" y1="0" x2="1" y2="1">
                    <SvgStop offset="0%" stopColor="rgba(112,220,255,0.9)" />
                    <SvgStop offset="34%" stopColor="rgba(155,255,213,0.84)" />
                    <SvgStop offset="68%" stopColor="rgba(255,197,144,0.82)" />
                    <SvgStop offset="100%" stopColor="rgba(205,170,255,0.84)" />
                  </SvgLinearGradient>
                </Defs>

                <SvgRect x="0" y="0" width="100" height="100" rx="50" fill={`url(#${prismId}_fill)`} opacity="0.34" />
                <SvgCircle cx="50" cy="50" r="46.8" fill="none" stroke={`url(#${prismId}_rim)`} strokeWidth="2" />
                <SvgCircle
                  cx="51.2"
                  cy="49.4"
                  r="45.8"
                  fill="none"
                  stroke="rgba(95,213,255,0.38)"
                  strokeWidth="1.2"
                />
                <SvgCircle
                  cx="48.8"
                  cy="50.7"
                  r="45.8"
                  fill="none"
                  stroke="rgba(255,173,125,0.34)"
                  strokeWidth="1.2"
                />
              </Svg>
            </Animated.View>
          ) : (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.nativeRim,
                {
                  borderRadius: radius,
                  borderColor: nativeRimColor,
                  opacity: ringOpacity,
                },
              ]}
            />
          ))}

        {showSpecularArtifacts && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.specular,
                {
                  top: resolvedSize * 0.13,
                  width: resolvedSize * 0.56,
                  height: Math.max(7, resolvedSize * 0.15),
                  left: (resolvedSize - resolvedSize * 0.56) / 2,
                  borderRadius: resolvedSize,
                  backgroundColor: topSpecularColor,
                  opacity: specularOpacity,
                  transform: [{ translateX: shimmerX }, { translateY: shimmerY }],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.specular,
                {
                  bottom: resolvedSize * 0.11,
                  width: resolvedSize * 0.46,
                  height: Math.max(5, resolvedSize * 0.1),
                  left: (resolvedSize - resolvedSize * 0.46) / 2,
                  borderRadius: resolvedSize,
                  backgroundColor: bottomSpecularColor,
                  opacity: specularOpacity.interpolate({
                    inputRange: [0.56, 0.92],
                    outputRange: [0.28, 0.56],
                  }),
                  transform: [{ translateX: Animated.multiply(shimmerX, -0.45) }],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sparkle,
                {
                  width: Math.max(5, resolvedSize * 0.13),
                  height: Math.max(5, resolvedSize * 0.13),
                  borderRadius: resolvedSize,
                  top: resolvedSize * 0.26,
                  right: resolvedSize * 0.18,
                  backgroundColor: sparkleColor,
                  opacity: specularOpacity.interpolate({
                    inputRange: [0.4, 0.7],
                    outputRange: [0.2, 0.44],
                  }),
                  transform: [{ translateX: sparkleX }],
                },
              ]}
            />
          </>
        )}
      </Animated.View>

      {highlighted && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tutorialRing,
            {
              width: resolvedSize + 4,
              height: resolvedSize + 4,
              borderRadius: radius + 2,
              borderColor: colorWithAlpha(accent, isDarkTheme ? 0.68 : 0.76),
              opacity: auraOpacity,
            },
          ]}
        />
      )}

      <View pointerEvents="none" style={styles.iconLayer}>
        <Text
          style={[
            styles.icon,
            {
              color: iconColor,
              fontSize: iconSize,
              lineHeight: iconLayerSize,
              fontWeight: iconLabel === "+" ? "700" : "800",
              letterSpacing: iconLetterSpacing,
              width: iconLayerSize,
              height: iconLayerSize,
              textShadowColor:
                isAndroid || suppressArtificialHighlights
                  ? "transparent"
                  : isDarkTheme
                  ? "rgba(0,0,0,0.42)"
                  : "rgba(255,255,255,0.42)",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 2,
            },
          ]}
          adjustsFontSizeToFit={Platform.OS !== "android" && shouldAutoFitIcon}
          minimumFontScale={Platform.OS === "android" ? undefined : iconMinimumScale}
          allowFontScaling={false}
          ellipsizeMode="clip"
          numberOfLines={1}
        >
          {iconLabel}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  aura: {
    position: "absolute",
  },
  shadowPlate: {
    ...StyleSheet.absoluteFillObject,
  },
  shell: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    overflow: "hidden",
  },
  specular: {
    position: "absolute",
  },
  sparkle: {
    position: "absolute",
  },
  nativeRim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  tutorialRing: {
    position: "absolute",
    borderWidth: 1.6,
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    letterSpacing: 0,
  },
});

export default React.memo(
  LiquidGlassFabOrb,
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size &&
    prevProps.icon === nextProps.icon &&
    prevProps.iconColor === nextProps.iconColor &&
    prevProps.isDarkTheme === nextProps.isDarkTheme &&
    prevProps.isProTheme === nextProps.isProTheme &&
    prevProps.proThemeAccentColor === nextProps.proThemeAccentColor &&
    prevProps.highlighted === nextProps.highlighted
);
