import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { AccessiblePressable as Pressable } from "./AccessibleControls";
import AlmiRoomDecor, { ALMI_ROOM_ITEM_IMAGES } from "./AlmiRoomDecor";
import AlmiCoinBreakdown, { getAlmiCoinAccessibilityLabel } from "./AlmiCoinBreakdown";
import AlmiDustOverlay from "./AlmiDustOverlay";
import { useMotionPreferences } from "../hooks/useMotionPreferences";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ROOM_ITEMS, normalizeRoomState } = require("../engagement/almiRoom");

export default function AlmiRoomShop({ visible, onClose, onBuy, onEquip, onRemove, room, balance, catSource, dirtyLevel = 0, colors, language, t, busy }) {
  const [selectedId, setSelectedId] = useState("bed");
  const [confirmingId, setConfirmingId] = useState(null);
  useEffect(() => {
    if (visible) {
      setSelectedId("bed");
      setConfirmingId(null);
    }
  }, [visible]);
  const { height } = useWindowDimensions();
  const { reduceMotion } = useMotionPreferences();
  const current = useMemo(() => normalizeRoomState(room), [room]);
  const selected = ROOM_ITEMS.find((item) => item.id === selectedId) || ROOM_ITEMS[0];
  const owned = current.owned.includes(selected.id);
  const placed = current.equipped[selected.slot] === selected.id;
  const shortfall = Math.max(0, selected.price - Math.max(0, Number(balance) || 0));
  const confirming = confirmingId === selected.id && !owned;
  const primaryLabel = placed ? t("almiRoomRemove") : owned ? t("almiRoomPlace") : shortfall
    ? t("almiRoomShortfall")
    : confirming ? t("almiRoomBuy") : t("almiRoomReview");
  const primaryDisabled = Boolean(busy || (!owned && shortfall));
  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType={reduceMotion || (Platform.OS === "android" && Number(Platform.Version) <= 25) ? "none" : "slide"} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("budgetModalClose")} />
        <View style={[styles.sheet, { maxHeight: Math.max(380, height * 0.9), backgroundColor: colors.card, borderColor: colors.border }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t("almiRoomTitle")}</Text>
              <Text style={[styles.balance, { color: colors.muted }]}>{t("almiRoomBalance")}</Text>
              <View accessible accessibilityLabel={`${t("almiRoomBalance")}: ${getAlmiCoinAccessibilityLabel(balance, language)}`}>
                <AlmiCoinBreakdown amount={balance} textColor={colors.text} />
              </View>
            </View>
            <Pressable testID="almi-room-close" onPress={onClose} accessibilityRole="button" accessibilityLabel={t("budgetModalClose")}
              style={({ pressed }) => [styles.close, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.closeText, { color: colors.text }]}>×</Text>
            </Pressable>
          </View>
          <View testID="almi-room-preview" style={[styles.preview, { borderColor: colors.border }]}>
            <AlmiRoomDecor equipped={current.equipped} previewItemId={selected.id} />
            <View style={styles.cat} pointerEvents="none">
              <Image source={catSource} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={styles.catImage} accessible={false} />
              <AlmiDustOverlay intensity={dirtyLevel} />
            </View>
          </View>
          <Text style={[styles.selectedTitle, { color: colors.text }]}>{t(selected.titleKey)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalog} accessibilityLabel={t("almiRoomTitle")}>
            {ROOM_ITEMS.map((item) => {
              const active = selected.id === item.id;
              const itemOwned = current.owned.includes(item.id);
              return (
                <Pressable key={item.id} testID={`almi-room-item-${item.id}`} onPress={() => { setSelectedId(item.id); setConfirmingId(null); }} accessibilityRole="button"
                  accessibilityLabel={`${t(item.titleKey)}. ${itemOwned ? t("almiRoomOwned") : getAlmiCoinAccessibilityLabel(item.price, language)}`}
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [styles.item, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySurface : colors.surfaceMuted, opacity: pressed ? 0.74 : 1 }]}>
                  <Image source={ALMI_ROOM_ITEM_IMAGES[item.id]} resizeMode={item.collectible ? "cover" : "contain"} resizeMethod="resize" fadeDuration={0} style={styles.thumbnail} accessible={false} />
                  <Text numberOfLines={2} style={[styles.itemName, { color: colors.text }]}>{t(item.titleKey)}</Text>
                  {itemOwned
                    ? <Text style={[styles.itemPrice, { color: colors.primary }]}>{t("almiRoomOwned")}</Text>
                    : <AlmiCoinBreakdown amount={item.price} compact textColor={colors.muted} />}
                </Pressable>
              );
            })}
          </ScrollView>
          {!owned && (
            <View style={styles.purchaseInfo} accessible accessibilityLabel={`${shortfall ? t("almiRoomShortfall") : t("almiRoomPrice")}: ${getAlmiCoinAccessibilityLabel(shortfall || selected.price, language)}`}>
              <Text style={[styles.purchaseInfoLabel, { color: colors.muted }]}>{shortfall ? t("almiRoomShortfall") : t("almiRoomPrice")}</Text>
              <AlmiCoinBreakdown amount={shortfall || selected.price} textColor={colors.text} />
            </View>
          )}
          {confirming && (
            <View style={styles.confirmation}>
              <Text style={[styles.confirmationText, { color: colors.text }]}>{t("almiRoomConfirmBody", { item: t(selected.titleKey) })}</Text>
              <Pressable onPress={() => setConfirmingId(null)} accessibilityRole="button" accessibilityLabel={t("profileCancel")} style={styles.cancel}>
                <Text style={[styles.cancelText, { color: colors.muted }]}>{t("profileCancel")}</Text>
              </Pressable>
            </View>
          )}
          <Pressable testID="almi-room-primary" onPress={() => placed ? onRemove(selected.id) : owned ? onEquip(selected.id) : confirming ? (onBuy(selected.id), setConfirmingId(null)) : setConfirmingId(selected.id)} disabled={primaryDisabled}
            accessibilityRole="button" accessibilityLabel={primaryLabel} accessibilityState={{ disabled: primaryDisabled, busy: Boolean(busy) }}
            style={({ pressed }) => [styles.primary, { backgroundColor: primaryDisabled ? colors.surfaceMuted : colors.primary, opacity: pressed ? 0.78 : 1 }]}>
            <Text style={[styles.primaryText, { color: primaryDisabled ? colors.muted : colors.onPrimary || "#FFFFFF" }]}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 22, lineHeight: 27, fontWeight: "800" },
  balance: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 26, lineHeight: 30 },
  preview: { height: 210, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, overflow: "hidden", position: "relative" },
  cat: { position: "absolute", width: 160, height: 180, bottom: 8, left: "50%", marginLeft: -80 },
  catImage: { width: "100%", height: "100%" },
  selectedTitle: { fontSize: 17, lineHeight: 23, fontWeight: "700" },
  catalog: { gap: 9, paddingBottom: 4 },
  item: { width: 112, minHeight: 132, borderWidth: 1.5, borderRadius: 16, alignItems: "center", padding: 8, gap: 3 },
  thumbnail: { width: 82, height: 58, borderRadius: 8 },
  itemName: { fontSize: 12, lineHeight: 16, fontWeight: "700", textAlign: "center", minHeight: 32 },
  itemPrice: { fontSize: 11, lineHeight: 15, fontWeight: "700", textAlign: "center" },
  purchaseInfo: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 7 },
  purchaseInfoLabel: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  confirmation: { flexDirection: "row", alignItems: "center", gap: 8 },
  confirmationText: { flex: 1, fontSize: 13, lineHeight: 18 },
  cancel: { minHeight: 44, minWidth: 58, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, fontWeight: "700" },
  primary: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  primaryText: { fontSize: 16, lineHeight: 22, fontWeight: "800", textAlign: "center" },
});
