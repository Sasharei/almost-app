import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BlurView as ExpoBlurView } from "expo-blur";
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Rect as SvgRect,
  Stop as SvgStop,
} from "react-native-svg";
import LiquidGlassNativeView, { canUseNativeLiquidGlassView } from "./LiquidGlassNativeView";
import NativeLiquidGlassButton, { canUseNativeLiquidGlassButton } from "./NativeLiquidGlassButton";

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

const LiquidGlassPillButton = React.memo(function LiquidGlassPillButton({
  label = "Edit",
  onPress,
  disabled = false,
  isDarkTheme = false,
  isProTheme = false,
  proThemeAccentColor = "#4E6BFF",
  style,
  textStyle,
  activeOpacity = 0.85,
}) {
  const isIos = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const nativeLiquidButtonAvailable = isIos && canUseNativeLiquidGlassButton();
  // Don't memoize this: native manager can become available after initial render.
  const nativeLiquidGlassAvailable =
    !nativeLiquidButtonAvailable && isIos && canUseNativeLiquidGlassView();
  const isLiquidGlassStyle = Platform.OS === "ios" && nativeLiquidGlassAvailable;
  const prismRingId = useMemo(
    () => `liquid-pill-prism-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const accent = isProTheme ? proThemeAccentColor : "#8EC5FF";
  const shellBorderColor = isAndroid
    ? "rgba(14,23,40,0.16)"
    : isDarkTheme
    ? "rgba(255,255,255,0.55)"
    : isLiquidGlassStyle
    ? "rgba(255,255,255,0.92)"
    : "rgba(255,255,255,0.86)";
  const tintOverlayColor = isDarkTheme
    ? "rgba(255,255,255,0.08)"
    : isLiquidGlassStyle
    ? "rgba(255,255,255,0.18)"
    : isAndroid
    ? "rgba(255,255,255,0.2)"
    : "rgba(255,255,255,0.28)";
  const auraColor = isAndroid
    ? isDarkTheme
      ? "rgba(100,150,230,0.14)"
      : "rgba(150,190,255,0.12)"
    : isDarkTheme
    ? "rgba(110,164,255,0.24)"
    : isProTheme
    ? colorWithAlpha(accent, 0.2)
    : "rgba(139,189,255,0.2)";
  const shadowColor = isDarkTheme ? "#050A16" : isAndroid ? "#8A98AE" : isProTheme ? proThemeAccentColor : "#8EAEE0";
  const labelColor = isDarkTheme ? "#FFFFFF" : isProTheme ? "#F8FBFF" : "#0B1630";
  const resolvedLabel = typeof label === "string" ? label.trim() : String(label || "").trim();
  const renderedLabel = resolvedLabel || "Edit";
  const labelLength = Array.from(renderedLabel).length;
  const longestWordLength = renderedLabel
    .split(/\s+/)
    .filter(Boolean)
    .reduce((max, word) => Math.max(max, Array.from(word).length), 0);
  const effectiveWordLength = Math.max(labelLength, longestWordLength);
  // Grow width conservatively, then prefer text shrinking instead of oversized buttons.
  const adaptiveButtonMinWidth = Math.max(106, Math.min(128, 106 + Math.max(0, effectiveWordLength - 6) * 2));
  const adaptiveHorizontalPadding =
    effectiveWordLength >= 12 ? 11 : effectiveWordLength >= 10 ? 13 : effectiveWordLength >= 8 ? 15 : 18;
  const adaptiveLabelFontSize = Math.max(11.5, Math.min(16, 16 - Math.max(0, effectiveWordLength - 8) * 0.6));
  const adaptiveLabelLineHeight = Math.max(14, Math.round(adaptiveLabelFontSize + 3));

  if (nativeLiquidButtonAvailable) {
    return (
      <View pointerEvents="box-none" style={[styles.wrapper, style, { minWidth: adaptiveButtonMinWidth }]}>
        <NativeLiquidGlassButton
          style={styles.nativeLiquidButton}
          title={renderedLabel}
          enabled={!disabled}
          onPress={onPress}
        />
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, style, { minWidth: adaptiveButtonMinWidth }]}>
      {!isAndroid && (
        <View
          pointerEvents="none"
          style={[
            styles.aura,
            {
              backgroundColor: auraColor,
              shadowColor,
              shadowOpacity: isDarkTheme ? 0.28 : 0.22,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 0,
            },
          ]}
        />
      )}
      <TouchableOpacity
        style={[
          styles.root,
          {
            paddingHorizontal: adaptiveHorizontalPadding,
            borderColor: shellBorderColor,
            shadowColor,
            shadowOpacity: isAndroid ? 0 : isDarkTheme ? 0.34 : 0.28,
            shadowRadius: isAndroid ? 0 : 14,
            shadowOffset: { width: 0, height: isAndroid ? 0 : 7 },
            elevation: isAndroid ? 0 : 9,
          },
          disabled ? styles.disabled : null,
        ]}
        onPress={onPress}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        {nativeLiquidGlassAvailable ? (
          <LiquidGlassNativeView
            style={StyleSheet.absoluteFill}
            cornerRadius={999}
            tintAlpha={isDarkTheme ? 0.32 : 0.2}
            strokeOpacity={isDarkTheme ? 0.65 : 0.46}
          />
        ) : (
          <ExpoBlurView
            tint={isDarkTheme ? "dark" : "light"}
            intensity={isAndroid ? 18 : 56}
            blurReductionFactor={isAndroid ? 1 : undefined}
            experimentalBlurMethod={isAndroid ? "dimezisBlurView" : undefined}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View
          pointerEvents="none"
          style={[
            styles.overlay,
            {
              backgroundColor: tintOverlayColor,
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
        {!isAndroid && <View style={styles.specularTop} />}
        {!isAndroid && <View style={styles.specularBottom} />}

        <Text
          style={[
            styles.label,
            { color: labelColor, fontSize: adaptiveLabelFontSize, lineHeight: adaptiveLabelLineHeight },
            textStyle,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          ellipsizeMode="tail"
        >
          {renderedLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    minWidth: 106,
    height: 42,
    overflow: "visible",
  },
  aura: {
    ...StyleSheet.absoluteFillObject,
    top: -4,
    bottom: -6,
    left: -5,
    right: -5,
    borderRadius: 999,
  },
  root: {
    width: "100%",
    height: "100%",
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  nativeLiquidButton: {
    width: "100%",
    height: "100%",
  },
  disabled: {
    opacity: 0.7,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  specularTop: {
    position: "absolute",
    top: 8,
    left: "18%",
    right: "18%",
    height: 12,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.26)",
  },
  specularBottom: {
    position: "absolute",
    bottom: 8,
    left: "24%",
    right: "24%",
    height: 7,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
});

export default LiquidGlassPillButton;
