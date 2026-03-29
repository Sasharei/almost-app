import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { BlurView as ExpoBlurView } from "expo-blur";
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect as SvgRect,
  Stop as SvgStop,
} from "react-native-svg";
import LiquidGlassNativeView, { canUseNativeLiquidGlassView } from "./LiquidGlassNativeView";

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

const resolveIconSize = (icon, size) => {
  if (icon === "+") return Math.round(size * 0.44);
  return Math.round(size * 0.48);
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
  const resolvedSize = Math.max(44, Number(size) || 64);
  const radius = resolvedSize / 2;
  const isAndroid = Platform.OS === "android";
  const nativeLiquidGlassAvailable = Platform.OS === "ios" && canUseNativeLiquidGlassView();
  const shimmer = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const prismId = useMemo(() => `fab-prism-${Math.random().toString(36).slice(2, 10)}`, []);

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();
    breatheLoop.start();
    return () => {
      shimmerLoop.stop();
      breatheLoop.stop();
    };
  }, [breathe, shimmer]);

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
  const renderSyntheticPrism = !nativeLiquidGlassAvailable && !isAndroid;
  const showSpecularArtifacts = !isAndroid;
  const ringOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: isAndroid ? [0.2, 0.34] : renderSyntheticPrism ? [0.62, 0.98] : [0.3, 0.54],
  });
  const auraOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: isAndroid
      ? [highlighted ? 0.24 : 0.06, highlighted ? 0.42 : 0.14]
      : [highlighted ? 0.52 : 0.18, highlighted ? 0.82 : 0.34],
  });
  const specularOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.56, 0.92],
  });

  const accent = isProTheme ? proThemeAccentColor : "#8EC5FF";
  const androidBorderColor = highlighted ? "rgba(14,23,40,0.22)" : "rgba(14,23,40,0.14)";
  const shellBorderColor = highlighted
    ? isAndroid
      ? androidBorderColor
      : isDarkTheme
      ? "rgba(255,229,156,0.92)"
      : colorWithAlpha(accent, 0.8)
    : isAndroid
    ? androidBorderColor
    : isDarkTheme
    ? "rgba(255,255,255,0.54)"
    : "rgba(255,255,255,0.86)";
  const tintOverlayColor = isAndroid
    ? isDarkTheme
      ? "rgba(9,13,22,0.14)"
      : "rgba(255,255,255,0.08)"
    : isDarkTheme
    ? "rgba(7,11,22,0.3)"
    : nativeLiquidGlassAvailable
    ? "rgba(255,255,255,0.03)"
    : isProTheme
    ? colorWithAlpha(accent, 0.18)
    : "rgba(255,255,255,0.24)";
  const auraColor = highlighted
    ? isAndroid
      ? "rgba(255,255,255,0.22)"
      : isDarkTheme
      ? "rgba(255,224,138,0.5)"
      : isProTheme
      ? colorWithAlpha(accent, 0.44)
      : "rgba(122,198,255,0.4)"
    : isAndroid
    ? "rgba(255,255,255,0.08)"
    : isDarkTheme
    ? "rgba(110,164,255,0.2)"
    : "rgba(139,189,255,0.16)";
  const topSpecularColor = isDarkTheme ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.8)";
  const bottomSpecularColor = isDarkTheme ? "rgba(173,229,255,0.24)" : "rgba(138,204,255,0.36)";
  const sparkleColor = isDarkTheme ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.88)";
  const nativeRimColor = isDarkTheme ? "rgba(255,255,255,0.44)" : isAndroid ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.76)";
  const iconSize = resolveIconSize(icon, resolvedSize);

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { width: resolvedSize, height: resolvedSize, borderRadius: radius }]}
    >
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

      <Animated.View
        style={[
          styles.shell,
          {
            borderRadius: radius,
            borderColor: shellBorderColor,
            transform: [{ scaleX: dropletScaleX }, { scaleY: dropletScaleY }],
            shadowColor: isDarkTheme ? "#050A16" : isAndroid ? "#8A98AE" : isProTheme ? proThemeAccentColor : "#8EAEE0",
            shadowOpacity: isAndroid ? (highlighted ? 0.2 : 0.14) : highlighted ? 0.48 : isDarkTheme ? 0.34 : 0.26,
            shadowRadius: isAndroid ? (highlighted ? 8 : 6) : highlighted ? 16 : 10,
            elevation: isAndroid ? (highlighted ? 6 : 4) : highlighted ? 12 : 8,
          },
        ]}
      >
        {nativeLiquidGlassAvailable ? (
          <LiquidGlassNativeView
            style={StyleSheet.absoluteFill}
            cornerRadius={radius}
            tintAlpha={isDarkTheme ? 0.26 : isProTheme ? 0.22 : 0.18}
            strokeOpacity={highlighted ? 0.76 : isDarkTheme ? 0.58 : 0.46}
          />
        ) : (
          <ExpoBlurView
            tint={isDarkTheme ? "dark" : "light"}
            intensity={isAndroid ? 32 : 62}
            blurReductionFactor={isAndroid ? 1 : undefined}
            experimentalBlurMethod={isAndroid ? "dimezisBlurView" : undefined}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: tintOverlayColor }]} />

        {renderSyntheticPrism ? (
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
              <SvgCircle cx="51.2" cy="49.4" r="45.8" fill="none" stroke="rgba(95,213,255,0.38)" strokeWidth="1.2" />
              <SvgCircle cx="48.8" cy="50.7" r="45.8" fill="none" stroke="rgba(255,173,125,0.34)" strokeWidth="1.2" />
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
        )}

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
                    inputRange: [0.56, 0.92],
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
              borderColor: isDarkTheme ? "rgba(255,224,138,0.94)" : colorWithAlpha(accent, 0.9),
              opacity: auraOpacity.interpolate({
                inputRange: [0.52, 0.82],
                outputRange: [0.56, 0.94],
              }),
            },
          ]}
        />
      )}

      <Text
        style={[
          styles.icon,
          {
            color: iconColor,
            fontSize: iconSize,
            lineHeight: iconSize,
            fontWeight: icon === "+" ? "700" : "800",
            textShadowColor: isAndroid ? "transparent" : isDarkTheme ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.42)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          },
        ]}
        numberOfLines={1}
      >
        {icon}
      </Text>
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
  icon: {
    textAlign: "center",
    includeFontPadding: false,
    letterSpacing: 0.3,
  },
});

export default React.memo(LiquidGlassFabOrb);
