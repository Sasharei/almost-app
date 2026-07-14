import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { setReduceMotionEnabled } from "../utils/motion";

const MotionPreferencesContext = createContext({
  reduceMotion: false,
  reduceTransparency: false,
});

const readAccessibilityPreference = async (reader, fallback = false) => {
  try {
    const value = await reader?.();
    return Boolean(value);
  } catch (_error) {
    return fallback;
  }
};

export const MotionPreferenceProvider = ({ children }) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let mounted = true;
    readAccessibilityPreference(AccessibilityInfo?.isReduceMotionEnabled).then((value) => {
      if (mounted) setReduceMotion(value);
    });
    readAccessibilityPreference(AccessibilityInfo?.isReduceTransparencyEnabled).then((value) => {
      if (mounted) setReduceTransparency(value);
    });

    const motionSubscription = AccessibilityInfo?.addEventListener?.(
      "reduceMotionChanged",
      setReduceMotion
    );
    const transparencySubscription = AccessibilityInfo?.addEventListener?.(
      "reduceTransparencyChanged",
      setReduceTransparency
    );

    return () => {
      mounted = false;
      motionSubscription?.remove?.();
      transparencySubscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    setReduceMotionEnabled(reduceMotion);
  }, [reduceMotion]);

  const value = useMemo(
    () => ({ reduceMotion, reduceTransparency }),
    [reduceMotion, reduceTransparency]
  );

  return (
    <MotionPreferencesContext.Provider value={value}>
      {children}
    </MotionPreferencesContext.Provider>
  );
};

export const useMotionPreferences = () => useContext(MotionPreferencesContext);

