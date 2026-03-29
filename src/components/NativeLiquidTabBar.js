import React from "react";
import { Platform, UIManager, View, requireNativeComponent } from "react-native";

const COMPONENT_CANDIDATES = ["NativeLiquidTabBar", "NativeLiquidTabBarManager"];

const findRegisteredComponentName = () => {
  if (Platform.OS !== "ios") return null;
  if (!UIManager) return null;
  if (typeof UIManager.getViewManagerConfig === "function") {
    const match = COMPONENT_CANDIDATES.find((name) => !!UIManager.getViewManagerConfig(name));
    return match || null;
  }
  const match = COMPONENT_CANDIDATES.find((name) => !!UIManager[name]);
  return match || null;
};

let resolvedNativeComponent = null;

const resolveNativeComponent = () => {
  if (resolvedNativeComponent) return resolvedNativeComponent;
  const registeredName = findRegisteredComponentName();
  const candidates = registeredName
    ? [registeredName, ...COMPONENT_CANDIDATES.filter((name) => name !== registeredName)]
    : COMPONENT_CANDIDATES;
  // Retry on every call until native manager is available.
  for (const candidate of candidates) {
    try {
      resolvedNativeComponent = requireNativeComponent(candidate);
      return resolvedNativeComponent;
    } catch (error) {
      // no-op: keep trying candidate names
    }
  }
  resolvedNativeComponent = null;
  return null;
};

export const canUseNativeLiquidTabBar = () => !!resolveNativeComponent();

const NativeLiquidTabBar = ({ onTabPress, selectorOnly = false, ...restProps }) => {
  const NativeComponent = resolveNativeComponent();
  if (!NativeComponent) {
    return <View {...restProps} />;
  }
  return (
    <NativeComponent
      {...restProps}
      selectorOnly={selectorOnly}
      onTabPress={(event) => {
        const key = event?.nativeEvent?.key;
        if (typeof onTabPress === "function" && typeof key === "string" && key.trim()) {
          onTabPress(key);
        }
      }}
    />
  );
};

export default NativeLiquidTabBar;
