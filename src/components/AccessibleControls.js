import React, { forwardRef } from "react";
import { Platform, Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { resolveControlGeometry } from "../utils/controlGeometry";

const target = Platform.OS === "android" ? 48 : 44;
const hasContent = (children) => children != null && children !== false;
function controlStyle(style, interactive, role) {
  if (!interactive) return style;
  return [style, resolveControlGeometry(StyleSheet.flatten(style) || {}, target, role)];
}

// The original host retains every callback, ref, gesture and accessibility override.
// Backdrop-only pressables deliberately keep their existing absolute-fill geometry.
export const AccessiblePressable = forwardRef(function AccessiblePressable(
  { style, children, ...props }, ref
) {
  const interactive = typeof props.onPress === "function" && hasContent(children);
  const role = props.accessibilityRole || (interactive ? "button" : undefined);
  const resolvedStyle = typeof style === "function" ? (state) => controlStyle(style(state), interactive, role) : controlStyle(style, interactive, role);
  return (
    <Pressable
      {...props}
      ref={ref}
      accessibilityRole={role}
      accessibilityState={{ ...props.accessibilityState, ...(props.disabled != null ? { disabled: !!props.disabled } : {}) }}
      hitSlop={props.hitSlop ?? (role === "switch" ? 12 : undefined)}
      style={(state) => [
        typeof resolvedStyle === "function" ? resolvedStyle(state) : resolvedStyle,
        // Custom state styles already own their feedback. Static controls get an
        // immediate highlight without moving their hit area or committing early.
        interactive && !props.disabled && typeof style !== "function" && state.pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
});

export const AccessibleTouchableOpacity = forwardRef(function AccessibleTouchableOpacity(
  { style, children, ...props }, ref
) {
  const interactive = typeof props.onPress === "function" && hasContent(children);
  const role = props.accessibilityRole || (interactive ? "button" : undefined);
  return (
    <TouchableOpacity
      {...props}
      ref={ref}
      accessibilityRole={role}
      accessibilityState={{ ...props.accessibilityState, ...(props.disabled != null ? { disabled: !!props.disabled } : {}) }}
      hitSlop={props.hitSlop ?? (role === "switch" ? 12 : undefined)}
      style={controlStyle(style, interactive, role)}
    >
      {children}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({ pressed: { opacity: 0.72 } });
