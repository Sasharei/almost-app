import React from "react";
import { Platform, UIManager, View, requireNativeComponent } from "react-native";

const COMPONENT_CANDIDATES = ["NativeLiquidTabBar", "NativeLiquidTabBarManager"];
const IOS_NATIVE_LIQUID_MIN_VERSION = 26;
const isFabricRendererActive = () => !!global?.nativeFabricUIManager;
const getIosMajorVersion = () => {
  if (Platform.OS !== "ios") return 0;
  const rawVersion = Platform.Version;
  if (typeof rawVersion === "string") {
    const major = Number.parseInt(rawVersion.split(".")[0], 10);
    return Number.isFinite(major) ? major : 0;
  }
  if (typeof rawVersion === "number") {
    return Number.isFinite(rawVersion) ? Math.floor(rawVersion) : 0;
  }
  return 0;
};
const canUseNativeLiquidTabBarRuntime = () =>
  Platform.OS === "ios" && getIosMajorVersion() >= IOS_NATIVE_LIQUID_MIN_VERSION;

const findRegisteredComponentName = () => {
  if (Platform.OS !== "ios") return null;
  if (!canUseNativeLiquidTabBarRuntime()) return null;
  if (isFabricRendererActive()) return null;
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
  if (!canUseNativeLiquidTabBarRuntime()) return null;
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
    } catch (_error) {
      // no-op: keep trying candidate names
    }
  }
  resolvedNativeComponent = null;
  return null;
};

export const canUseNativeLiquidTabBar = () =>
  canUseNativeLiquidTabBarRuntime() && !!resolveNativeComponent();

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
