import React from "react";
import { Image, Platform, StyleSheet } from "react-native";

const DUST = require("../../assets/almi_room/dust_smudges.png");
const ANDROID_DUST = require("../../assets/almi_android_previews/dust.png");

export default function AlmiDustOverlay({ intensity = 0, testID }) {
  const strength = Math.max(0, Math.min(1, Number(intensity) || 0));
  if (strength < 0.08) return null;

  return (
    <Image
      testID={testID}
      pointerEvents="none"
      accessible={false}
      source={Platform.OS === "android" && Number(Platform.Version) <= 25 ? ANDROID_DUST : DUST}
      resizeMode="stretch"
      resizeMethod="resize"
      fadeDuration={0}
      style={[styles.overlay, { opacity: Math.min(0.94, 0.32 + strength * 0.62) }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", zIndex: 3 },
});
