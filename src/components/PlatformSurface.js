import React, { createContext, forwardRef, useContext } from "react";
import { Animated, Platform, StyleSheet, UIManager, View, requireNativeComponent } from "react-native";
import { AccessiblePressable as Pressable, AccessibleTouchableOpacity as TouchableOpacity } from "./AccessibleControls";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { useMotionPreferences } from "../hooks/useMotionPreferences";

let SwiftUISurface;
const SurfaceDepth = createContext(false);
const SurfaceAppearance = createContext(null);
function resolveSwiftUISurface() {
  if (Platform.OS !== "ios") return null;
  if (SwiftUISurface) return SwiftUISurface;
  try {
    if (UIManager.getViewManagerConfig("NativeSwiftUISurface")) {
      SwiftUISurface = requireNativeComponent("NativeSwiftUISurface");
    }
  } catch (_error) { /* Older installed builds use the Expo material below. */ }
  return SwiftUISurface || null;
}

function isDarkColor(color) {
  const match = typeof color === "string" && color.match(/^#([\da-f]{6})$/i);
  const rgb = typeof color === "string" && color.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/i);
  if (!match && !rgb) return false;
  const value = match ? parseInt(match[1], 16) : 0;
  const channels = rgb ? rgb.slice(1, 4).map(Number) : [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 < 110;
}

function resolveMaterialTint(background) {
  if (/^#[\da-f]{6}$/i.test(background || "")) return { hex: background, alpha: 1 };
  const rgba = typeof background === "string" && background.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/i);
  if (!rgba) return { hex: "", alpha: 1 };
  return {
    hex: `#${rgba.slice(1, 4).map((channel) => Math.min(255, Number(channel)).toString(16).padStart(2, "0")).join("")}`,
    alpha: rgba[4] == null ? 1 : Math.max(0, Math.min(1, Number(rgba[4]))),
  };
}

function resolveSurfaceAppearance(background, parentAppearance) {
  if (!background || background === "transparent") return parentAppearance ?? false;
  const tint = resolveMaterialTint(background);
  return tint.alpha < 0.5 && parentAppearance != null ? parentAppearance : isDarkColor(background);
}

function nativeGlassAvailable() {
  try { return Platform.OS === "ios" && isLiquidGlassAvailable() && isGlassEffectAPIAvailable(); }
  catch (_error) { return false; }
}

// Material is decorative: the original host owns layout, gestures, refs, and accessibility.
// Cards and nested content use native material; selected controls retain their semantic fill.
const SurfaceMaterial = React.memo(function SurfaceMaterial({ style, surfaceRole }) {
  const { reduceTransparency } = useMotionPreferences();
  const parentHasMaterial = useContext(SurfaceDepth);
  const parentIsDark = useContext(SurfaceAppearance);
  const flat = StyleSheet.flatten(style) || {};
  const background = flat.backgroundColor;
  if (!background || background === "transparent" || flat.display === "none") return null;
  const tint = resolveMaterialTint(background);
  const isDark = resolveSurfaceAppearance(background, parentIsDark);
  const radius = flat.borderRadius || 0;
  const shape = {
    borderRadius: radius,
    borderTopLeftRadius: flat.borderTopLeftRadius ?? radius,
    borderTopRightRadius: flat.borderTopRightRadius ?? radius,
    borderBottomLeftRadius: flat.borderBottomLeftRadius ?? radius,
    borderBottomRightRadius: flat.borderBottomRightRadius ?? radius,
    overflow: "hidden",
  };
  const solid = Platform.OS !== "ios" || reduceTransparency;
  const NativeSurface = !solid && tint.hex && resolveSwiftUISurface();
  const glass = !solid && nativeGlassAvailable();
  // Sheets retain a dense translucent backing; content cards use native material.
  // Preserve the exact control fill: every PRO accent's onPrimary contrast is validated
  // against that color. Lightening it with translucent glass can invalidate the contrast.
  // Neutral glass lets the system material show through. Saturated/selected controls
  // keep their validated foreground contrast on an opaque semantic tint.
  const nestedContent = (parentHasMaterial && surfaceRole !== "control" && surfaceRole !== "filter");
  const tintOpacity = surfaceRole === "control" ? 1 : surfaceRole === "filter" ? 1 : surfaceRole === "sheet" ? 0.82 : nestedContent ? 0.4 : 0.32;
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, shape]}>
      {solid ? <View style={[StyleSheet.absoluteFillObject, { backgroundColor: background }]} /> : NativeSurface ? (
        <NativeSurface style={StyleSheet.absoluteFillObject} cornerRadius={radius} tintColorHex={tint.hex} darkAppearance={isDark} tintOpacity={tintOpacity * tint.alpha} />
      ) : <>
        {glass ? <GlassView style={StyleSheet.absoluteFillObject} glassEffectStyle="regular" colorScheme={isDark ? "dark" : "light"} isInteractive={false} /> : <BlurView style={StyleSheet.absoluteFillObject} tint={isDark ? "dark" : "light"} intensity={36} />}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: background, opacity: tintOpacity }]} />
      </>}
      {!solid ? <View style={[StyleSheet.absoluteFillObject, shape, { borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.72)" }]} /> : null}
    </View>
  );
});

function resolveSurfaceStyle(style, surfaceRole) {
  const flat = StyleSheet.flatten(style) || {};
  const radius = Number(flat.borderRadius) || 0;
  const geometry = (surfaceRole === "card" || surfaceRole === "row") && radius > 18 && radius < 100
    ? { borderRadius: Platform.OS === "android" ? 16 : 18 }
    : surfaceRole === "control" && !flat.height ? { minHeight: Math.max(Platform.OS === "android" ? 48 : 44, Number(flat.minHeight) || 0) } : null;
  return [style, geometry, Platform.OS === "ios" && flat.backgroundColor && flat.backgroundColor !== "transparent" ? { borderWidth: 0 } : null];
}

const PlatformSurface = forwardRef(function PlatformSurface({ style, children, surfaceRole = "card", opaque = false, ...props }, ref) {
  const parentAppearance = useContext(SurfaceAppearance);
  const materialStyle = resolveSurfaceStyle(style, surfaceRole);
  const flat = StyleSheet.flatten(materialStyle) || {};
  if (opaque) return <View {...props} ref={ref} style={style}><SurfaceAppearance.Provider value={resolveSurfaceAppearance(flat.backgroundColor, parentAppearance)}><SurfaceDepth.Provider value={false}>{children}</SurfaceDepth.Provider></SurfaceAppearance.Provider></View>;
  return <View {...props} ref={ref} style={[materialStyle, flat.backgroundColor && { backgroundColor: "transparent" }]}>
    <SurfaceMaterial style={materialStyle} surfaceRole={surfaceRole} />
    <SurfaceAppearance.Provider value={resolveSurfaceAppearance(flat.backgroundColor, parentAppearance)}><SurfaceDepth.Provider value={!!flat.backgroundColor}>{children}</SurfaceDepth.Provider></SurfaceAppearance.Provider>
  </View>;
});

export const PlatformPressable = forwardRef(function PlatformPressable({ style, children, surfaceRole = "control", android_ripple, ...props }, ref) {
  const parentAppearance = useContext(SurfaceAppearance);
  const resolveStyle = (state) => resolveSurfaceStyle(typeof style === "function" ? style(state) : style, surfaceRole);
  return <Pressable {...props} ref={ref} android_ripple={android_ripple || (Platform.OS === "android" ? { color: "rgba(128,128,128,0.16)", foreground: true } : undefined)} style={(state) => {
    const resolved = resolveStyle(state);
    const flat = StyleSheet.flatten(resolved) || {};
    return [resolved, flat.backgroundColor && { backgroundColor: "transparent" }, state.pressed && !props.disabled && { opacity: 0.86 }];
  }}>
    {(state) => <><SurfaceMaterial style={resolveStyle(state)} surfaceRole={surfaceRole} /><SurfaceAppearance.Provider value={resolveSurfaceAppearance(StyleSheet.flatten(resolveStyle(state))?.backgroundColor, parentAppearance)}><SurfaceDepth.Provider value={!!StyleSheet.flatten(resolveStyle(state))?.backgroundColor}>{typeof children === "function" ? children(state) : children}</SurfaceDepth.Provider></SurfaceAppearance.Provider></>}
  </Pressable>;
});

export const PlatformTouchableOpacity = forwardRef(function PlatformTouchableOpacity({ style, children, surfaceRole = "control", ...props }, ref) {
  const parentAppearance = useContext(SurfaceAppearance);
  const resolved = resolveSurfaceStyle(style, surfaceRole);
  const flat = StyleSheet.flatten(resolved) || {};
  return <TouchableOpacity {...props} ref={ref} style={[resolved, flat.backgroundColor && { backgroundColor: "transparent" }]}>
    <SurfaceMaterial style={resolved} surfaceRole={surfaceRole} /><SurfaceAppearance.Provider value={resolveSurfaceAppearance(flat.backgroundColor, parentAppearance)}><SurfaceDepth.Provider value={!!flat.backgroundColor}>{children}</SurfaceDepth.Provider></SurfaceAppearance.Provider>
  </TouchableOpacity>;
});

export const AnimatedPlatformSurface = Animated.createAnimatedComponent(PlatformSurface);
export default PlatformSurface;
