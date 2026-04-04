import React from "react";
import { Platform, UIManager, View, requireNativeComponent } from "react-native";

const COMPONENT_CANDIDATES = ["NativeLiquidGlassButton", "NativeLiquidGlassButtonManager"];
const isFabricRendererActive = () => !!global?.nativeFabricUIManager;

const findRegisteredComponentName = () => {
  if (Platform.OS !== "ios") return false;
  if (isFabricRendererActive()) return false;
  if (!UIManager) return false;
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
  for (const candidate of candidates) {
    try {
      resolvedNativeComponent = requireNativeComponent(candidate);
      return resolvedNativeComponent;
    } catch (error) {
      // keep trying candidates
    }
  }
  resolvedNativeComponent = null;
  return null;
};

export const canUseNativeLiquidGlassButton = () => !!resolveNativeComponent();

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
