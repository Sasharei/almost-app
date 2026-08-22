import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView as AndroidBlurView } from "@react-native-community/blur";
import { BlurView as ExpoBlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import {
  ANDROID_LIVE_GLASS_BLUR_ENABLED,
} from "../constants/appBehavior";

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
  androidBlurMode = "frosted",
  iosFallbackIntensity = 54,
  nativeEffectOpacity = 1,
}) => {
  const { reduceTransparency } = useMotionPreferences();
  const nativeLiquidGlassAvailable = canUseNativeLiquidGlass();
  const resolvedNativeEffectOpacity = Math.max(
    0.01,
    Math.min(1, Number(nativeEffectOpacity) || 1)
  );
  const resolvedFallbackColor =
    fallbackColor || (isDarkTheme ? "rgba(11,17,29,0.58)" : "rgba(248,251,255,0.5)");
  const resolvedSolidColor =
    solidFallbackColor || (isDarkTheme ? "#20283A" : "#F4F6FA");
  const resolvedBorderColor =
    borderColor ||
    (isDarkTheme ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.72)");
  const isAndroid = Platform.OS === "android";
  const useAndroidLiveBlur =
    isAndroid && androidBlurMode === "live" && ANDROID_LIVE_GLASS_BLUR_ENABLED;
  const useAndroidFrostedFallback = isAndroid && androidBlurMode === "frosted";
  const useAndroidSolidFallback =
    isAndroid && !useAndroidLiveBlur && !useAndroidFrostedFallback;
  const androidBlurAmount = Math.max(
    8,
    Math.min(25, Math.round((Number(androidIntensity) || 0) * 0.56))
  );

  if (reduceTransparency || useAndroidSolidFallback) {
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

  if (useAndroidFrostedFallback) {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.frame,
          style,
          { backgroundColor: resolvedFallbackColor },
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
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.frame,
          style,
        ]}
      >
        <GlassView
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: resolvedNativeEffectOpacity },
          ]}
          glassEffectStyle={glassEffectStyle}
          tintColor={tintColor}
          colorScheme={isDarkTheme ? "dark" : "light"}
          isInteractive={false}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.frame,
        style,
      ]}
    >
      {isAndroid ? (
        <AndroidBlurView
          pointerEvents="none"
          blurType={isDarkTheme ? "dark" : "light"}
          blurAmount={androidBlurAmount}
          overlayColor="transparent"
          enabled
          autoUpdate
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <ExpoBlurView
          pointerEvents="none"
          tint={isDarkTheme ? "dark" : "light"}
          intensity={iosFallbackIntensity}
          style={StyleSheet.absoluteFillObject}
        />
      )}
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
