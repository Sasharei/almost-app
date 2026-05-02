import React from "react";
import { Platform, UIManager, View, requireNativeComponent } from "react-native";

const COMPONENT_CANDIDATES = ["NativeLiquidGlassButton", "NativeLiquidGlassButtonManager"];
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
const canUseNativeLiquidButtonRuntime = () =>
  Platform.OS === "ios" && getIosMajorVersion() >= IOS_NATIVE_LIQUID_MIN_VERSION;

const findRegisteredComponentName = () => {
  if (Platform.OS !== "ios") return null;
  if (!canUseNativeLiquidButtonRuntime()) return null;
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
  if (!canUseNativeLiquidButtonRuntime()) return null;
  if (resolvedNativeComponent) return resolvedNativeComponent;
  const registeredName = findRegisteredComponentName();
  const candidates = registeredName
    ? [registeredName, ...COMPONENT_CANDIDATES.filter((name) => name !== registeredName)]
    : COMPONENT_CANDIDATES;
  for (const candidate of candidates) {
    try {
      resolvedNativeComponent = requireNativeComponent(candidate);
      return resolvedNativeComponent;
    } catch (_error) {
      // keep trying candidates
    }
  }
  resolvedNativeComponent = null;
  return null;
};

export const canUseNativeLiquidGlassButton = () =>
  canUseNativeLiquidButtonRuntime() && !!resolveNativeComponent();

const NativeLiquidGlassButton = ({ title, enabled = true, onPress, ...restProps }) => {
  const NativeComponent = resolveNativeComponent();
  if (!NativeComponent) {
    return <View {...restProps} />;
  }
  return (
    <NativeComponent
      {...restProps}
      title={title}
      enabled={enabled ? 1 : 0}
      onPress={typeof onPress === "function" ? onPress : undefined}
    />
  );
};

export default NativeLiquidGlassButton;
