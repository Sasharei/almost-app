import { BackHandler as NativeBackHandler } from "react-native";

// The same scoped stack serves hardware Back and the native iOS edge gesture.
const listeners = [];
export const dispatchScreenBack = () => {
  for (let index = listeners.length - 1; index >= 0; index -= 1) {
    if (listeners[index]()) return true;
  }
  return false;
};
export default {
  addEventListener(event, callback) {
    if (event !== "hardwareBackPress") return NativeBackHandler.addEventListener(event, callback);
    listeners.push(callback);
    const nativeSubscription = NativeBackHandler.addEventListener(event, callback);
    return { remove() {
      const index = listeners.lastIndexOf(callback);
      if (index >= 0) listeners.splice(index, 1);
      nativeSubscription.remove();
    } };
  },
};
