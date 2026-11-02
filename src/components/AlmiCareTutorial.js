import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, TouchableOpacity, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/appBehavior";

// Pending survives process death between the chest payout and the menu handoff.
// Never infer eligibility from a balance: purchases and other rewards change it.
export function useAlmiCareTutorial() {
  const [status, setStatus] = useState("loading");
  const [step, setStep] = useState(0);
  const statusRef = useRef("loading");
  const scheduledDuringHydration = useRef(false);
  const transition = useCallback((value) => {
    statusRef.current = value;
    setStatus(value);
  }, []);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.multiGet([STORAGE_KEYS.ALMI_CARE_TUTORIAL, STORAGE_KEYS.TEMPTATION_SERIES]).then((entries) => {
      const values = Object.fromEntries(entries);
      const stored = values[STORAGE_KEYS.ALMI_CARE_TUTORIAL];
      let previouslyClaimed = false;
      try {
        const series = JSON.parse(values[STORAGE_KEYS.TEMPTATION_SERIES] || "null");
        previouslyClaimed = Number(series?.claimedAt) > 0 && Number(series?.claimedCoins) > 0;
      } catch (_error) { /* A corrupt series is not proof of a paid claim. */ }
      if (!mounted) return;
      const next = stored === "done" ? "done" : stored === "pending" || scheduledDuringHydration.current ? "pending" : previouslyClaimed ? "done" : "unseen";
      transition(next);
      if (next !== "unseen") AsyncStorage.setItem(STORAGE_KEYS.ALMI_CARE_TUTORIAL, next).catch(() => {});
    }).catch(() => {
      // A failed read cannot prove that the tutorial has never been completed.
      // Leave rewards untouched and retry hydration on the next app launch.
      if (mounted) transition("unavailable");
    });
    return () => { mounted = false; };
  }, [transition]);
  const schedule = useCallback(() => {
    if (statusRef.current === "loading") { scheduledDuringHydration.current = true; return; }
    if (statusRef.current !== "unseen") return;
    transition("pending");
    AsyncStorage.setItem(STORAGE_KEYS.ALMI_CARE_TUTORIAL, "pending").catch(() => {});
  }, [transition]);
  const start = useCallback(() => {
    if (statusRef.current !== "pending") return;
    transition("active");
    setStep(1);
  }, [transition]);
  const dismiss = useCallback(() => {
    if (statusRef.current !== "active") return;
    transition("done");
    setStep(0);
    AsyncStorage.setItem(STORAGE_KEYS.ALMI_CARE_TUTORIAL, "done").catch(() => {});
  }, [transition]);
  const next = useCallback(() => setStep((value) => value === 1 ? 2 : value), []);
  return { status, step, schedule, start, next, dismiss };
}

export default function AlmiCareTutorialCard({ step, colors, t, rtl, onNext, onDismiss }) {
  const heading = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const node = findNodeHandle(heading.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 400);
    return () => clearTimeout(timer);
  }, [step]);
  return <View testID={`almi-care-tutorial-${step}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[styles.progress, { color: colors.muted, textAlign: rtl ? "right" : "left" }]}>{t("almiTutorialProgress", { step, total: 2 })}</Text>
    <Text ref={heading} accessible accessibilityRole="header" style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t(step === 1 ? "almiTutorialWelcomeTitle" : "almiTutorialCareTitle")}</Text>
    <Text style={[styles.body, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t(step === 1 ? "almiTutorialWelcomeBody" : "almiTutorialCareBody")}</Text>
    <TouchableOpacity testID="almi-care-tutorial-next" accessibilityRole="button" onPress={onNext} activeOpacity={0.7} style={[styles.primary, { backgroundColor: colors.text }]}>
      <Text style={[styles.buttonText, { color: colors.card }]}>{t(step === 1 ? "almiTutorialShowCare" : "almiTutorialFinish")}</Text>
    </TouchableOpacity>
    <TouchableOpacity testID="almi-care-tutorial-skip" accessibilityRole="button" onPress={onDismiss} activeOpacity={0.6} style={styles.skip}>
      <Text style={[styles.buttonText, { color: colors.muted }]}>{t("almiTutorialSkip")}</Text>
    </TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 10 },
  progress: { fontSize: 13 }, title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 23 }, primary: { minHeight: 48, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonText: { fontSize: 16, fontWeight: "600", textAlign: "center" }, skip: { minHeight: 48, alignItems: "center", justifyContent: "center", padding: 10 },
});
