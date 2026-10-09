import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "./AccessibleControls";
import { formatShoppingCycleAmount } from "../shoppingBlocker/amounts";
import { resolveForegroundForColor } from "../utils/themeColors";
import { parseShoppingGoal } from "../shoppingBlocker/eligibleSavings";

export function ShoppingBlockerEntry({ controller, t, colors, formatAmount, formatLocalAmount, language }) {
  if (Platform.OS !== "ios") return null;
  const { status, showPrompt, setVisible, dismissPrompt, busy, errorKey } = controller;
  const cycleAmount = (amount) => formatShoppingCycleAmount(amount, status, formatLocalAmount, formatAmount);
  const rtl = language?.startsWith("ar");
  const direction = { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" };
  const progress = Math.min(100, Math.max(0, (status?.progressUSD || 0) / (status?.goalUSD || 1) * 100));
  const openPass = status?.unlockUntil > Date.now();
  const unlockReady = status?.active && status.authorized && !status.needsSelection && status.ready && !openPass && !errorKey;
  const actionKey = !status?.active ? "blockSelectApps" : !status.authorized ? "blockPermission"
    : status.needsSelection ? "blockSelectApps" : status.needsNextGoal ? "blockNextGoal" : status.ready && !openPass ? "blockChooseStore" : null;
  const onAction = !status?.active ? () => setVisible(true) : !status.authorized ? controller.authorize
    : status.needsSelection ? controller.selectApps : status.needsNextGoal ? () => setVisible(true) : controller.unlock;
  const recoveryAction = actionKey && !errorKey ? <Pressable onPress={onAction} disabled={busy || status === null} accessibilityRole="button" accessibilityState={{ disabled: busy || status === null }} style={{ minHeight: 48, justifyContent: "center", alignItems: unlockReady ? "center" : "flex-start", borderRadius: 12, paddingHorizontal: unlockReady ? 16 : 0, backgroundColor: unlockReady ? (busy ? colors.disabled : colors.primary) : "transparent", maxWidth: "100%" }}>
    <Text style={[direction, { color: unlockReady ? (busy ? colors.text : colors.onPrimary) : busy || status === null ? colors.muted : colors.primary, fontSize: 14, fontWeight: "600" }]}>{t(busy ? "blockWorking" : actionKey)}</Text>
  </Pressable> : null;
  return <View testID="today-shopping-pause" style={[styles.entry, { borderColor: unlockReady ? colors.primaryBorder : colors.border, backgroundColor: unlockReady ? colors.primarySurface : colors.card }]}>
    <View style={[styles.entryHeading, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <ShoppingPauseIcon type="lock" color={colors.primary} size={20} />
      <Pressable testID="shopping-pause-details" onPress={() => setVisible(true)} accessibilityRole="button" accessibilityLabel={t("blockTitle")} style={{ flex: 1, minHeight: 48, justifyContent: "center" }}>
        <Text style={[direction, { color: colors.text, fontSize: 16, fontWeight: "600" }]}>{t("blockTitle")} ›</Text>
      </Pressable>
    </View>
    {status?.active && !status.needsNextGoal ? <Pressable testID="shopping-pause-progress-details" onPress={() => setVisible(true)} accessibilityRole="button" accessibilityLabel={t("blockProgress", { saved: cycleAmount(status.progressUSD || 0), goal: cycleAmount(status.goalUSD) })} style={{ gap: 6 }}>
      <Text style={[direction, { color: colors.text, fontSize: 14, fontVariant: ["tabular-nums"] }]}>{t("blockProgress", { saved: cycleAmount(status.progressUSD || 0), goal: cycleAmount(status.goalUSD) })}</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: status?.ready ? 100 : Math.floor(progress) }} style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={{ width: `${progress}%`, height: 8, backgroundColor: colors.primary, alignSelf: rtl ? "flex-end" : "flex-start" }} />
      </View>
      <Text style={[direction, { color: unlockReady ? colors.text : colors.muted, fontWeight: unlockReady ? "600" : "400", fontSize: 13, lineHeight: 18 }]}>{openPass
        ? t("blockOpenUntil", { time: new Date(status.unlockUntil).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }) })
        : status.needsNextGoal ? t("blockNextGoalHint") : t(status.ready ? "blockReady" : "blockRemaining", { amount: cycleAmount(Math.max(0, status.goalUSD - (status.progressUSD || 0))) })}</Text>
    </Pressable> : status?.needsNextGoal ? <>
      {openPass ? <Text style={[direction, { color: colors.text, fontSize: 13, lineHeight: 18 }]}>{t("blockOpenUntil", { time: new Date(status.unlockUntil).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }) })}</Text> : null}
      <Text style={[direction, { color: colors.muted, fontSize: 13, lineHeight: 18 }]}>{t("blockNextGoalHint")}</Text>
    </> : !errorKey ? <Text style={[direction, { color: colors.muted, fontSize: 13, lineHeight: 18 }]}>{t(status === null ? "blockWorking" : "blockEntryHint")}</Text> : null}
    {recoveryAction}
    {errorKey ? <>
      <Text accessibilityLiveRegion="polite" style={[direction, { color: colors.error, fontSize: 13 }]}>{t(errorKey)}</Text>
      <Pressable onPress={controller.refresh} disabled={busy} accessibilityRole="button" style={styles.button}><Text style={{ color: colors.primary }}>{t("blockRetry")}</Text></Pressable>
    </> : null}
    {showPrompt && !status?.active ? <Pressable onPress={dismissPrompt} accessibilityRole="button" style={styles.button}>
      <Text style={{ color: colors.muted }}>{t("blockLater")}</Text>
    </Pressable> : null}
  </View>;
}

function ShoppingPauseIcon({ type, color, size = 24 }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    {type === "lock" ? <><Rect x={5} y={10} width={14} height={11} rx={3} fill="none" stroke={color} strokeWidth={1.8} /><Path d="M8 10V7a4 4 0 018 0v3M12 15v2" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" /></>
      : type === "goal" ? <><Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} /><Circle cx={12} cy={12} r={4} fill="none" stroke={color} strokeWidth={1.8} /><Circle cx={12} cy={12} r={1} fill={color} /></>
        : <><Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} /><Path d="M12 7v5l3 2" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></>}
  </Svg>;
}

export function ShoppingPauseIntroduction({ t, colors, language }) {
  const rtl = language?.startsWith("ar");
  const direction = { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" };
  return <View style={styles.introduction}>
    <Image source={require("../../assets/shopping-pause/hero.png")} resizeMode="contain" style={styles.heroArt} accessible={false} />
    <Text style={[styles.offerTitle, direction, { color: colors.text }]}>{t("blockTitle")}</Text>
    <Text style={[styles.offerBody, direction, { color: colors.muted }]}>{t("blockOfferIntro")}</Text>
    <View style={styles.explanation}>
      {[["lock", "blockSelectApps", "blockExplainApps"], ["goal", "blockGoal", "blockExplainGoal"], ["time", "blockEarnVisit", "blockExplainVisit"]].map(([icon, title, body]) =>
        <View key={icon} style={[styles.explanationRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={[styles.explanationIcon, { backgroundColor: colors.primarySurface }]}><ShoppingPauseIcon type={icon} color={colors.primary} /></View>
          <View style={styles.explanationCopy}>
            <Text style={[styles.explanationTitle, direction, { color: colors.text }]}>{t(title)}</Text>
            <Text style={[styles.explanationBody, direction, { color: colors.muted }]}>{t(body)}</Text>
          </View>
        </View>)}
    </View>
  </View>;
}

export default function ShoppingBlockerPanel({ controller, t, colors, currency, formatAmount, formatLocalAmount, toUSD, language }) {
  const { status, visible, busy, errorKey, offering } = controller;
  const [step, setStep] = useState("apps");
  const [goal, setGoal] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [validation, setValidation] = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  useEffect(() => {
    setEditingGoal(!!status?.needsNextGoal);
    setGoal(""); setValidation(null);
    const count = status?.needsSelection ? 0 : status?.appCount || 0;
    setSelectedCount(count);
    setStep(count > 0 ? "goal" : "apps");
  }, [visible, status?.appCount, status?.needsSelection, status?.needsNextGoal]);
  if (Platform.OS !== "ios") return null;
  const rtl = language?.startsWith("ar");
  const textStyle = { color: colors.text, textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" };
  const close = () => { if (!busy) controller.setVisible(false); };
  const action = (label, onPress, primary = false, disabled = false) => <Pressable
    onPress={onPress} accessibilityRole="button" accessibilityState={{ disabled: busy || disabled }}
    disabled={busy || disabled} style={[styles.button, {
      backgroundColor: primary ? (disabled || busy ? colors.disabled : colors.primary) : "transparent",
      borderColor: primary ? "transparent" : colors.border, borderWidth: primary ? 0 : 1,
    }]}><Text style={[styles.buttonText, { color: primary ? (disabled || busy ? resolveForegroundForColor(colors.disabled, "#000000") : colors.onPrimary) : disabled || busy ? colors.muted : colors.text, fontWeight: disabled || busy ? "400" : "600" }]}>{t(label)}</Text></Pressable>;
  const choose = async () => {
    const result = await controller.selectApps();
    if (result?.appCount > 0) { setSelectedCount(result.appCount); setStep("goal"); }
  };
  const start = async () => {
    const value = parseShoppingGoal(goal);
    const amountUSD = toUSD(value);
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(amountUSD) || amountUSD < 0.01 || amountUSD > 1e9) {
      setValidation("blockInvalidGoal"); return;
    }
    setValidation(null);
    if (status?.active) {
      const result = await controller.updateGoal(amountUSD, currency, value);
      if (result?.active && !result.needsNextGoal) { setEditingGoal(false); setGoal(""); }
    } else await controller.start(amountUSD, currency, value);
  };
  const stop = () => { if (!controller.settings) return; Alert.alert(t("blockStop"), t("blockStopHint"), [
    { text: t("blockCancel"), style: "cancel" },
    { text: t("blockStop"), style: "destructive", onPress: () => controller.stop() },
  ]); };
  const authorized = status?.authorized;
  const openPass = status?.unlockUntil > Date.now();
  const cycleAmount = (amount) => formatShoppingCycleAmount(amount, status, formatLocalAmount, formatAmount);
  const canEditGoal = status?.needsNextGoal || Date.now() >= status?.goalChangeAvailableAt;
  const goalEditor = <>
    <Text style={[styles.heading, textStyle]}>{t(status?.needsNextGoal ? "blockNextGoal" : "blockGoal")} · {currency}</Text>
    <TextInput accessibilityLabel={`${t("blockGoal")} ${currency}`} keyboardType="decimal-pad" value={goal}
      onChangeText={(value) => { setGoal(value); setValidation(null); }}
      style={[styles.input, textStyle, { borderColor: colors.border, backgroundColor: colors.card }]}
      maxLength={16} autoFocus />
    <Text style={[styles.body, { color: colors.muted }, rtl && { textAlign: "right" }]}>{t(status?.needsNextGoal ? "blockNextGoalHint" : status?.active ? "blockGoalEditHint" : "blockGoalHint")}</Text>
    {action(status?.active ? "blockSaveGoal" : "blockStart", start, true, !goal.trim() || (status?.active && !canEditGoal))}
    {status?.active && !status.needsNextGoal ? action("blockCancel", () => { setEditingGoal(false); setValidation(null); }) : null}
  </>;
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Pressable onPress={close} accessibilityRole="button" disabled={busy} style={[styles.close, { alignSelf: rtl ? "flex-end" : "flex-start" }]}>
            <Text style={textStyle}>{t("blockClose")}</Text>
          </Pressable>
          {!offering ? <Text style={[styles.title, textStyle]}>{t("blockTitle")}</Text> : null}
          {!offering && status?.supported ? <Image source={require("../../assets/shopping-pause/hero.png")} resizeMode="contain" style={styles.detailArt} accessible={false} /> : null}
          {offering ? <>
            <ShoppingPauseIntroduction t={t} colors={colors} language={language} />
          </> : null}
          {!offering && status?.supported && !status.active ? <Text style={{ color: colors.muted }}>
            {t("blockSetupProgress", { step: !authorized ? 1 : step === "apps" ? 2 : 3, total: 3 })}
          </Text> : null}
          {busy ? <View accessibilityLiveRegion="polite" style={styles.loading}>
            <ActivityIndicator color={colors.primary} /><Text style={textStyle}>{t("blockWorking")}</Text>
          </View> : null}
          {status === null && !errorKey ? <ActivityIndicator color={colors.primary} /> : null}
          {status?.supported === false ? <Text style={textStyle}>{t("blockUnsupported")}</Text> : null}
          {!offering && status?.supported && !authorized ? <>
            <Text style={[styles.body, textStyle]}>{t("blockPermissionHint")}</Text>
            {action("blockPermission", controller.authorize, true)}
            {action("profileSettingsTab", () => Linking.openSettings().catch(() => {}))}
          </> : null}
          {!offering && status?.supported && authorized && !status.active ? <>
            <Text style={[styles.body, textStyle]}>{t("blockIntro")}</Text>
            {step === "apps" ? action("blockSelectApps", choose, true) : <>
              <Text style={textStyle}>{t("blockSelectedApps", { count: selectedCount })}</Text>
              {goalEditor}
              {action("blockSelectApps", choose)}
            </>}
          </> : null}
          {status?.active && authorized && status.needsSelection ? <>
            <Text style={[styles.body, textStyle]}>{t("blockPickerHint")}</Text>
            {action("blockSelectApps", controller.selectApps, true)}
          </> : null}
          {status?.active && authorized && !status.needsSelection && !editingGoal ? <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heading, textStyle]}>{t("blockProgress", { saved: cycleAmount(status.progressUSD), goal: cycleAmount(status.goalUSD) })}</Text>
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.round(status.progressUSD / status.goalUSD * 100)) }}
              style={[styles.track, { backgroundColor: colors.border }]}>
              <View style={{ width: `${Math.min(100, status.progressUSD / status.goalUSD * 100)}%`, height: 8, backgroundColor: colors.primary, alignSelf: rtl ? "flex-end" : "flex-start" }} />
            </View>
            <Text style={[styles.body, textStyle]}>{openPass
              ? t("blockOpenUntil", { time: new Date(status.unlockUntil).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }) })
              : status.ready ? t("blockReady") : t("blockRemaining", { amount: cycleAmount(Math.max(0, status.goalUSD - status.progressUSD)) })}</Text>
            <Text style={[styles.body, { color: colors.muted }, rtl && { textAlign: "right" }]}>{t("blockGoalHint")}</Text>
            {status.ready && !openPass ? action("blockChooseStore", controller.unlock, true) : action("blockContinue", close, true)}
          </View> : null}
          {status?.active && authorized && !status.needsSelection && editingGoal ? <>
            {openPass ? <Text style={[styles.body, textStyle]}>{t("blockOpenUntil", { time: new Date(status.unlockUntil).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }) })}</Text> : null}
            {goalEditor}
          </> : null}
          {status?.active && !editingGoal ? <>
            {action("blockLimitSettings", () => { setGoal(String(status.goalAmount || "")); setValidation(null); setEditingGoal(true); }, false, !canEditGoal)}
            <Text style={[styles.body, { color: colors.muted }, rtl && { textAlign: "right" }]}>{canEditGoal ? t("blockGoalEditHint") : t("blockGoalEditLocked", { date: new Date(status.goalChangeAvailableAt).toLocaleDateString(language) })}</Text>
          </> : null}
          {validation || errorKey ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.error }]}>{t(validation || errorKey)}</Text> : null}
          {errorKey ? action("blockRetry", controller.refresh, !status) : null}
          {controller.settings && status?.active ? action("blockStop", stop) : null}
        </ScrollView>
        {offering ? <View style={[styles.offerFooter, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {action("blockSelectApps", controller.acceptOffer, true)}
          <Pressable onPress={controller.declineOffer} accessibilityRole="button" disabled={busy} style={styles.button}>
            <Text style={[styles.buttonText, { color: colors.muted }]}>{t("blockLater")}</Text>
          </Pressable>
        </View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48, gap: 20 },
  title: { fontSize: 30, fontWeight: "700" },
  heading: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24 },
  button: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  close: { minHeight: 48, minWidth: 48, justifyContent: "center" },
  input: { minHeight: 56, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 24 },
  summary: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 16 },
  entry: { marginTop: 0, marginBottom: 10, padding: 12, gap: 6, borderWidth: 1, borderRadius: 16 },
  entryAction: { minHeight: 48, gap: 8 },
  entryHeading: { alignItems: "center", gap: 12 },
  entryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  entryBody: { fontSize: 15, lineHeight: 21 },
  entryLink: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  introduction: { gap: 16 },
  heroArt: { height: 190, width: "100%" },
  detailArt: { height: 120, width: "100%" },
  offerTitle: { fontSize: 32, fontWeight: "700", letterSpacing: -0.5 },
  offerBody: { fontSize: 17, lineHeight: 25 },
  explanation: { gap: 22, marginTop: 8 },
  explanationRow: { alignItems: "flex-start", gap: 14 },
  explanationIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  explanationCopy: { flex: 1, gap: 4 },
  explanationTitle: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  explanationBody: { fontSize: 14, lineHeight: 21 },
  offerFooter: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  loading: { flexDirection: "row", alignItems: "center", gap: 12 },
});
