import React from "react";
import { Platform, UIManager, requireNativeComponent } from "react-native";

let NativeNavigation;
function resolveNavigation() {
  if (Platform.OS !== "android") return null;
  if (NativeNavigation) return NativeNavigation;
  try {
    if (UIManager.getViewManagerConfig("NativeMaterialNavigation")) {
      NativeNavigation = requireNativeComponent("NativeMaterialNavigation");
    }
  } catch (_error) { /* The existing navigation remains available in older builds. */ }
  return NativeNavigation || null;
}

export const canUseNativeMaterialNavigation = () => !!resolveNavigation();

export default function NativeMaterialNavigation({ items, palette, selectedKey, onTabPress, ...props }) {
  const NativeComponent = resolveNavigation();
  if (!NativeComponent) return null;
  return <NativeComponent {...props} itemsJson={JSON.stringify(items)} paletteJson={JSON.stringify(palette)} selectedKey={selectedKey} onTabPress={(event) => {
    const key = event.nativeEvent?.key;
    if (items.some((item) => item.key === key)) onTabPress?.(key);
  }} />;
}
