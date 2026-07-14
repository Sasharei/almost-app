import { Animated, Easing } from "react-native";
import { UI_MOTION } from "../constants/designSystem";

let reduceMotionEnabled = false;
const activeLoops = new Set();

export const MOTION_EASING = Object.freeze({
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
});

export const MOTION_DURATION = UI_MOTION;

export const isReduceMotionEnabled = () => reduceMotionEnabled;

export const setReduceMotionEnabled = (enabled) => {
  reduceMotionEnabled = Boolean(enabled);
  if (!reduceMotionEnabled) return;
  activeLoops.forEach((loop) => {
    try {
      loop.stop();
    } catch (_error) {
      // A stopped or unmounted animation is already in the desired state.
    }
  });
  activeLoops.clear();
};

export const createMotionLoop = (animation, config) => {
  const loop = Animated.loop(animation, config);
  return {
    start(callback) {
      if (reduceMotionEnabled) {
        animation?.stop?.();
        callback?.({ finished: true, reducedMotion: true });
        return;
      }
      activeLoops.add(loop);
      loop.start((result) => {
        activeLoops.delete(loop);
        callback?.(result);
      });
    },
    stop() {
      activeLoops.delete(loop);
      loop.stop();
    },
    reset() {
      activeLoops.delete(loop);
      loop.reset?.();
    },
  };
};

export const startMotionAnimation = (animation, callback) => {
  if (!animation) return;
  if (reduceMotionEnabled) {
    animation.stop?.();
    callback?.({ finished: true, reducedMotion: true });
    return;
  }
  animation.start(callback);
};

