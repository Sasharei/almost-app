import { classifyMerchant } from "../bankExpenses/walletHistory";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "./AccessibleControls";
import { resolveForegroundForColor } from "../utils/themeColors";

export default function BankExpensesPanel({ controller: c, colors, language, categories = [], onUpgrade }) {
  const [walletSetup, setWalletSetup] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState("things");
  const [categoryPicker, setCategoryPicker] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { if (!c.visible) { setEditing(null); setCategoryPicker(false); setChoosing(false); setWalletSetup(false); setInvalid(false); setSearch(""); } }, [c.visible]);
  useEffect(() => { if (!c.isPremium) { setChoosing(false); setWalletSetup(false); } }, [c.isPremium]);
  if (!c.supported) return null;
  const copy = c.copy;
  const walletConnected = !!c.status?.walletConnected;
  const categoryLabel = (id) => categories.find((entry) => entry.id === id)?.label || copy.categoryUnknown;
  const walletAvailable = !!c.status?.walletAvailable;
  const walletTemplateAvailable = !!c.status?.walletTemplateAvailable;
  const iosSetup = Number.parseInt(String(Platform.Version), 10) >= 27 ? copy.walletReadySetup : copy.iosSetup;
  const rtl = language?.startsWith("ar");
  const text = { color: colors.text, textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" };
  const button = (label, onPress, primary = false, disabled = false, testID) => <Pressable testID={testID} onPress={onPress} disabled={c.busy || disabled} accessibilityRole="button" accessibilityState={{ disabled: c.busy || disabled }} style={[styles.button, { backgroundColor: primary ? c.busy || disabled ? colors.disabled : colors.primary : "transparent", borderColor: primary ? "transparent" : colors.border, borderWidth: primary ? 0 : 1 }]}>
    <Text style={[text, { fontWeight: "600", color: primary ? c.busy || disabled ? resolveForegroundForColor(colors.disabled, "#000000") : colors.onPrimary : c.busy || disabled ? colors.muted : colors.text }]}>{label}</Text>
  </Pressable>;
  const edit = (item) => { setEditing(item); setCategory(item.category || classifyMerchant(item.merchant).category); setCategoryPicker(false); setAmount(item.amount); setCurrency(item.currency); setInvalid(false); };
  const save = async () => {
    if (!amount.trim() || !/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) { setInvalid(true); return; }
    const saved = await c.update(editing.id, amount.trim(), currency.trim().toUpperCase(), false, Platform.OS === "ios" ? category : null);
    if (saved) setEditing(null); else setInvalid(true);
  };
  const remove = (item) => Alert.alert(copy.delete, `${item.label} · ${item.amount} ${item.currency}`, [
    { text: copy.close, style: "cancel" }, { text: copy.delete, style: "destructive", onPress: async () => { if (await c.update(item.id, "", "", true)) setEditing(null); } },
  ]);
  const close = () => { if (c.busy) return; if (categoryPicker) setCategoryPicker(false); else if (editing) setEditing(null); else if (choosing) setChoosing(false); else if (walletSetup) setWalletSetup(false); else c.setVisible(false); };
  const needsSources = Platform.OS === "android" && !c.selected.length;
  const needsPermission = Platform.OS === "android" && c.status && !c.status.authorized;
  const primary = !c.isPremium ? button(copy.upgrade, onUpgrade, true, false, "expenses-upgrade") : c.error ? null : needsSources ? button(copy.source, () => setChoosing(true), true, false, "expenses-select-sources")
    : !c.status?.enabled ? button(copy.enable, () => c.configure(true), true, !c.status || (Platform.OS === "ios" && !walletAvailable), "expenses-enable")
      : needsPermission ? button(copy.permission, c.permission, true, false, "expenses-permission")
        : Platform.OS === "ios" ? button(copy.walletSetup, () => setWalletSetup(true), !walletConnected || !c.items.length, !walletAvailable, "expenses-wallet-setup") : null;
  const header = <View style={styles.header}>
    <Text style={[styles.title, text]} accessibilityRole="header">{walletSetup ? copy.walletSetup : copy.title}</Text>
    {!c.isPremium ? <Text testID="expenses-premium-badge" style={[text, { color: colors.primary, fontWeight: "700" }]}>{copy.premiumLabel}</Text> : null}
    {editing ? <>
      <Text style={text}>{editing.label}</Text>
      {editing.text ? <Text selectable style={[text, styles.body, { color: colors.muted }]}>{editing.text}</Text> : null}
      <Text style={text}>{copy.amount}</Text>
      <TextInput style={[styles.input, text, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel={copy.amount} keyboardType="decimal-pad" value={amount} onChangeText={(value) => { setAmount(value); setInvalid(false); }} maxLength={24} />
      <Text style={text}>{copy.currency}</Text>
      <TextInput style={[styles.input, text, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel={copy.currency} autoCapitalize="characters" autoCorrect={false} value={currency} onChangeText={(value) => { setCurrency(value); setInvalid(false); }} maxLength={3} />
      {invalid ? <Text accessibilityLiveRegion="polite" style={{ color: colors.error }}>{copy.invalid}</Text> : null}
      {Platform.OS === "ios" ? <>
        <Text style={text}>{copy.category}</Text>
        {button(categoryLabel(category), () => setCategoryPicker((value) => !value), false, false, "expenses-category")}
        {categoryPicker ? <View style={{ gap: 4 }}>{categories.map((entry) => <Pressable key={entry.id} accessibilityRole="radio" disabled={c.busy} accessibilityState={{ checked: category === entry.id, disabled: c.busy }} onPress={() => { setCategory(entry.id); setCategoryPicker(false); }} style={[styles.button, { borderColor: colors.border, borderWidth: 1, backgroundColor: category === entry.id ? colors.primarySurface : colors.card }]}><Text style={text}>{entry.label}</Text></Pressable>)}</View> : null}
      </> : null}
      {button(copy.save, save, true, false, "expenses-save")}
      {Platform.OS === "ios" && editing.duplicateCount > 0 ? <>
        <Text style={[text, styles.body, { color: colors.muted }]}>{copy.duplicateExplanation}</Text>
        {button(copy.separatePayment, async () => { if (await c.separateDuplicate(editing.id)) setEditing(null); }, false, false, "expenses-separate-payment")}
      </> : null}
      {button(copy.delete, () => remove(editing))}
    </> : walletSetup ? <>
      <Text style={[text, styles.body]}>{walletTemplateAvailable ? iosSetup : copy.walletReadyUnavailable}</Text>
      <Text style={[text, styles.body, { color: colors.muted }]}>{copy.walletCoverage}</Text>
      {button(copy.walletOpenAutomation, c.openWalletAutomation, true, !walletAvailable || !walletTemplateAvailable, "expenses-wallet-open-automation")}
    </> : choosing ? <>
      <Text style={[text, styles.body]}>{copy.androidSetup}</Text>
      <TextInput accessibilityLabel={copy.search} placeholder={copy.search} placeholderTextColor={colors.muted} style={[styles.input, text, { borderColor: colors.border, backgroundColor: colors.card }]} value={search} onChangeText={setSearch} />
      {button(copy.save, async () => { if (await c.configure(!!c.status?.enabled)) setChoosing(false); }, true, !c.selected.length)}
    </> : <>
      <Text style={[text, styles.body]}>{Platform.OS === "ios" ? copy.walletAccounting : copy.intro}</Text>
      {!c.isPremium ? <Text style={[text, styles.body]}>{copy.premiumRequired}</Text> : null}
      <Text style={[text, styles.body, { color: colors.muted }]}>{c.isPremium ? Platform.OS === "ios" ? copy.walletIntro : copy.androidSetup : copy.premiumDetail}</Text>
      <Text style={text} accessibilityLiveRegion="polite">{c.isPremium && c.status?.enabled && !needsPermission ? Platform.OS === "ios" ? walletConnected ? copy.walletConnected : copy.walletSetupPending : copy.active : copy.paused}</Text>
      {c.isPremium && Platform.OS === "ios" && c.status && !walletAvailable ? <Text style={[text, styles.body, { color: colors.muted }]}>{copy.walletUnavailable}</Text> : null}
      {walletConnected && c.status?.enabled && c.isPremium && !c.error && c.items.length ? button(copy.reviewExpenses, () => edit(c.items.find((item) => item.status === "review") || c.items[0]), true, false, "expenses-review") : null}
      {primary}
      {c.isPremium && Platform.OS === "android" && c.selected.length ? button(`${copy.source} · ${c.selected.length}`, () => setChoosing(true)) : null}
      {c.status?.enabled ? button(copy.disable, () => c.configure(false), false, false, "expenses-disable") : null}
    </>}
    {c.error ? <Text accessibilityLiveRegion="polite" style={{ color: colors.error }}>{copy.error}</Text> : null}
    {c.error && !editing && !choosing && !walletSetup ? button(copy.retry, c.refresh, c.isPremium) : null}
    {c.busy ? <ActivityIndicator color={colors.primary} accessibilityLabel={copy.title} /> : null}
    {!c.busy && !editing && !choosing && !walletSetup && !c.items.length ? <Text style={[text, styles.body, { color: colors.muted }]}>{Platform.OS === "ios" ? copy.walletEmpty : copy.empty}</Text> : null}
  </View>;
  const rows = editing || walletSetup ? [] : choosing ? c.apps.filter((app) => app.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()) || app.id.includes(search)) : c.items;
  return <Modal visible={c.visible} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
    <SafeAreaProvider>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Pressable testID="expenses-close" onPress={close} disabled={c.busy} accessibilityRole="button" style={[styles.close, { alignItems: rtl ? "flex-end" : "flex-start", paddingHorizontal: 18, width: "100%", maxWidth: 620, alignSelf: "center" }]}><Text style={[text, { color: colors.muted }]}>{copy.close}</Text></Pressable>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList data={rows} key={choosing ? "sources" : "expenses"} keyExtractor={(item) => item.id} ListHeaderComponent={header} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
          renderItem={({ item }) => choosing ? <Pressable disabled={c.busy} accessibilityRole="checkbox" accessibilityState={{ checked: c.selected.includes(item.id), disabled: c.busy }} onPress={() => c.setSelected((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])} style={[styles.receipt, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={text}>{c.selected.includes(item.id) ? "✓  " : "○  "}{item.label}</Text>
            <Text style={[text, { color: colors.muted, fontSize: 12 }]}>{item.id}</Text>
          </Pressable> : <Pressable onPress={() => edit(item)} accessibilityRole="button" accessibilityLabel={`${item.label}, ${item.amount} ${item.currency}, ${Platform.OS === "ios" ? categoryLabel(item.category || classifyMerchant(item.merchant).category) : ""}, ${item.status === "review" ? copy.review : copy.saved}, ${copy.edit}`} style={[styles.receipt, { borderColor: item.status === "review" ? colors.primaryBorder : colors.border, backgroundColor: colors.card }]}>
            <Text style={text}>{item.label}</Text>
            {Platform.OS === "ios" ? <Text style={[text, { color: colors.muted }]}>{categoryLabel(item.category || classifyMerchant(item.merchant).category)}{!item.category && !classifyMerchant(item.merchant).recognized ? ` · ${copy.categoryUnknown}` : ""}</Text> : null}
            <Text style={[text, { fontSize: 19, fontVariant: ["tabular-nums"] }]}>{item.amount ? `${item.amount} ${item.currency}` : copy.review}</Text>
            <Text style={[text, { color: colors.muted }]}>{new Date(item.created).toLocaleString(language)} · {item.status === "review" ? copy.review : copy.saved} · {copy.edit}</Text>
          </Pressable>}
          ListFooterComponent={!choosing && !editing && !walletSetup && c.hasMore ? button(copy.more, c.more) : null} />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({
  list: { width: "100%", maxWidth: 620, alignSelf: "center", padding: 18, paddingBottom: 40 }, header: { gap: 12, marginBottom: 16 },
  title: { fontSize: 25, fontWeight: "700" }, body: { fontSize: 15, lineHeight: 22 },
  button: { minHeight: 48, borderRadius: 14, padding: 14, alignItems: "center", justifyContent: "center" },
  close: { minHeight: 48, justifyContent: "center", alignItems: "center" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 17 },
  receipt: { minHeight: 60, borderWidth: 1, borderRadius: 14, padding: 16, gap: 8, marginBottom: 12 },
});
