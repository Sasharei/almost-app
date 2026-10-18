import React, { useEffect, useRef, useState } from "react";
import { Linking, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "../components/AccessibleControls";
import * as Crypto from "expo-crypto";
import * as Application from "expo-application";
import { shareDeletionRequest } from "./shareDeletionRequest";
import { readExistingPremiumInstallId } from "../analytics/installIdentity";
import { existingAnalyticsDeletionReaders } from "../../analytics";
import { existingRevenueCatDeletionIds } from "../monetization/purchasesClient";
// Pure preparation is shared with executable host tests.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildDeletionRequest, buildDeletionEmail, openDeletionEmail } = require("./deletionRequest.cjs");

export function CloudDeletionRow({ t, colors }) {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const insets = useSafeAreaInsets();
  const flight = useRef(false);
  const draft = useRef(null);
  const pending = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current = null; };
  }, []);
  const prepare = async (shareOnly) => {
    try {
      draft.current ??= await buildDeletionRequest({ app: "almost-savings", platform: Platform.OS,
        version: Application.nativeApplicationVersion, caseId: Crypto.randomUUID(), readers: {
          ...existingAnalyticsDeletionReaders(), firebase_user_ids: readExistingPremiumInstallId,
          amplitude_user_ids: readExistingPremiumInstallId, revenuecat_customer_ids: existingRevenueCatDeletionIds,
        } });
      if (!mounted.current) return;
      const email = buildDeletionEmail(draft.current, t("cloudDeletionTitle"));
      await openDeletionEmail(email, { openURL: Linking.openURL.bind(Linking), share: shareDeletionRequest }, shareOnly);
    } catch { if (mounted.current) setDialog("error"); }
    finally { flight.current = false; if (mounted.current) setBusy(false); }
  };
  const flushPending = () => {
    const action = pending.current;
    pending.current = null;
    if (action && mounted.current) void action();
  };
  // iOS Alert uses a separate key window. Presenting mail/Share from its button
  // callback races that window's teardown. Dismiss our app-owned modal first;
  // onDismiss is the native completion, not an assumed animation timeout.
  useEffect(() => {
    if (Platform.OS !== "ios" && !dialog) flushPending();
  });
  const choose = (shareOnly) => {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    pending.current = () => prepare(shareOnly);
    setDialog(null);
  };
  const cancel = () => { pending.current = null; setDialog(null); };
  const action = (id, label, onPress, primary = false) => <Pressable testID={id} accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => [styles.action, { backgroundColor: primary ? colors.primary : colors.card, opacity: pressed ? 0.6 : 1 }]}>
    <Text style={[styles.actionText, { color: primary ? colors.onPrimary : colors.text, fontWeight: primary ? "700" : "500" }]}>{label}</Text>
  </Pressable>;
  return <>
    <Pressable key="cloud-deletion" testID="request-cloud-deletion" accessibilityRole="button" disabled={busy}
      accessibilityState={{ disabled: busy, busy }} onPress={() => setDialog("confirm")}
      style={({ pressed }) => ({ minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, justifyContent: "center", opacity: pressed || busy ? 0.6 : 1,
        borderBottomWidth: 0.5, borderBottomColor: colors.border })}>
      <Text style={{ color: colors.text, fontSize: 16, flexShrink: 1 }}>{t(busy ? "cloudDeletionPreparing" : "cloudDeletionTitle")}</Text>
    </Pressable>
    <Modal transparent visible={!!dialog} animationType="none" onRequestClose={cancel} onDismiss={flushPending}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView bounces={false} contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t("cloudDeletionTitle")}</Text>
            <Text style={[styles.body, { color: colors.text }]}>{dialog === "error" ? t("cloudDeletionError") : t("cloudDeletionExplanation")}</Text>
            {action("cloud-deletion-prepare", t("cloudDeletionPrepare"), () => choose(false), true)}
            {action("cloud-deletion-share", t("cloudDeletionShare"), () => choose(true))}
            {action("cloud-deletion-cancel", t("profileCancel"), cancel)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, backgroundColor: "rgba(0,0,0,0.46)" },
  card: { width: "100%", maxWidth: 420, maxHeight: "100%", flexShrink: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "700", textAlign: "auto" },
  body: { fontSize: 16, lineHeight: 23, textAlign: "auto", marginBottom: 4 },
  action: { minHeight: 48, padding: 12, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  actionText: { fontSize: 16, textAlign: "center", flexShrink: 1 },
});
