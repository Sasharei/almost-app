import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView as ExpoBlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useMotionPreferences } from "../hooks/useMotionPreferences";

const canUseNativeLiquidGlass = () => {
  if (Platform.OS !== "ios") return false;
  try {
    return Boolean(isLiquidGlassAvailable() && isGlassEffectAPIAvailable());
  } catch (_error) {
    return false;
  }
};

export const isNativeLiquidGlassAvailable = () => canUseNativeLiquidGlass();

const PlatformGlassBackground = ({
  style,
  isDarkTheme = false,
  glassEffectStyle = "clear",
  tintColor,
  fallbackColor,
  solidFallbackColor,
  borderColor,
  androidIntensity = 42,
  iosFallbackIntensity = 54,
}) => {
  const { reduceTransparency } = useMotionPreferences();
  const nativeLiquidGlassAvailable = canUseNativeLiquidGlass();
  const resolvedFallbackColor =
    fallbackColor || (isDarkTheme ? "rgba(11,17,29,0.58)" : "rgba(248,251,255,0.5)");
  const resolvedSolidColor =
    solidFallbackColor || (isDarkTheme ? "#20283A" : "#F4F6FA");
  const resolvedBorderColor =
    borderColor ||
    (isDarkTheme ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.72)");

  if (reduceTransparency) {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.frame,
          style,
          { backgroundColor: resolvedSolidColor },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.edge, { borderColor: resolvedBorderColor }]}
        />
      </View>
    );
  }

  if (nativeLiquidGlassAvailable) {
    return (
      <GlassView
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.frame, style]}
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        colorScheme={isDarkTheme ? "dark" : "light"}
        isInteractive={false}
      />
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, styles.frame, style]}
    >
      <ExpoBlurView
        pointerEvents="none"
        tint={isDarkTheme ? "dark" : "light"}
        intensity={Platform.OS === "android" ? androidIntensity : iosFallbackIntensity}
        blurReductionFactor={Platform.OS === "android" ? 2 : undefined}
        experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: resolvedFallbackColor }]}
      />
      <View
        pointerEvents="none"
        style={[styles.edge, { borderColor: resolvedBorderColor }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default React.memo(PlatformGlassBackground);
