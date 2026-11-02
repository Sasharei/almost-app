import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { HEALTH_COIN_TIERS } from "../constants/appStaticConfig";
import { HEALTH_COIN_LABELS } from "../constants/localizedUiCopy";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getVisibleCoinDenominationEntries } = require("../engagement/coinBalance");

export const getAlmiCoinAccessibilityLabel = (amount, language = "en") => {
  const labelLanguage = String(language).startsWith("ar") ? "ar" : language;
  const labels = HEALTH_COIN_LABELS[labelLanguage] || HEALTH_COIN_LABELS.en;
  return getVisibleCoinDenominationEntries(amount, HEALTH_COIN_TIERS)
    .map(({ id, count }) => `${new Intl.NumberFormat(language).format(count)} ${labels[id]}`)
    .join(", ");
};

export default function AlmiCoinBreakdown({ amount, textColor, compact = false, style }) {
  const entries = getVisibleCoinDenominationEntries(amount, HEALTH_COIN_TIERS);
  return (
    <View style={[styles.row, compact && styles.compactRow, style]}>
      {entries.map((coin) => (
        <View key={coin.id} style={styles.token}>
          <Image source={coin.asset} style={compact ? styles.compactIcon : styles.icon} accessible={false} />
          <Text style={[compact ? styles.compactCount : styles.count, { color: textColor }]}>×{coin.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 9 },
  compactRow: { justifyContent: "center", gap: 5 },
  token: { flexDirection: "row", alignItems: "center", gap: 2 },
  icon: { width: 20, height: 20, resizeMode: "contain" },
  compactIcon: { width: 14, height: 14, resizeMode: "contain" },
  count: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  compactCount: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
});
