import React, { useId } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

const GLOW = require("../../assets/almi_room/care_glow.png");

export default function AlmiCareBackdrop({ colors }) {
  const glowId = `almi-care-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFillObject}>
      {Platform.OS === "android" ? (
        // Android 7 counts SVG's screen-sized backing bitmap against its Java heap.
        // Tint and scale a 256px alpha mask instead: the same glow uses only 256 KiB.
        <Image source={GLOW} tintColor={colors.primary} resizeMode="stretch" resizeMethod="scale"
          fadeDuration={0} accessible={false} style={StyleSheet.absoluteFillObject} />
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={glowId} cx="70%" cy="28%" rx="65%" ry="55%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.16} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100" height="100" fill={`url(#${glowId})`} />
        </Svg>
      )}
    </View>
  );
}
