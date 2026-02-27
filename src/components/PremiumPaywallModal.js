import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const pickDefaultPlanId = (planCards = []) => {
  const availableCards = planCards.filter((card) => card?.available !== false);
  const preferred = availableCards.find((card) => card?.recommended);
  if (preferred?.id) return preferred.id;
  if (availableCards[0]?.id) return availableCards[0].id;
  return planCards[0]?.id || "yearly";
};

const PremiumPaywallModal = ({
  visible = false,
  copy = null,
  planCards = [],
  purchaseLoadingPlan = null,
  restoring = false,
  onPlanPress = () => {},
  onRestorePress = () => {},
  onClose = () => {},
  colors,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState(() => pickDefaultPlanId(planCards));
  const openProgress = useRef(new Animated.Value(0)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;

  const cardBg = colors?.card || "#FFFFFF";
  const textColor = colors?.text || "#0F1635";
  const mutedColor = colors?.muted || "#6C7289";
  const borderColor = colors?.border || "rgba(11,22,48,0.12)";
  const accent = "#4353FF";

  const comparisonRows = Array.isArray(copy?.comparisonRows) ? copy.comparisonRows : [];

  useEffect(() => {
    if (!visible) return;
    setSelectedPlanId(pickDefaultPlanId(planCards));
  }, [planCards, visible]);

  useEffect(() => {
    if (!visible) {
      openProgress.setValue(0);
      return;
    }
    openProgress.setValue(0);
    const open = Animated.timing(openProgress, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    open.start();
    return () => open.stop();
  }, [openProgress, visible]);

  useEffect(() => {
    if (!visible) {
      mascotFloat.setValue(0);
      ctaPulse.setValue(0);
      return;
    }
    mascotFloat.setValue(0);
    ctaPulse.setValue(0);

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(mascotFloat, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1050,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 0,
          duration: 1050,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [ctaPulse, mascotFloat, visible]);

  const selectedPlan = useMemo(
    () => planCards.find((plan) => plan.id === selectedPlanId) || null,
    [planCards, selectedPlanId]
  );

  const purchaseDisabled =
    restoring ||
    !!purchaseLoadingPlan ||
    !selectedPlan ||
    selectedPlan.available === false;

  const selectedPlanCtaPrice = selectedPlan?.ctaPriceLabel || selectedPlan?.priceLabel || "";
  const primaryButtonTitle = selectedPlan
    ? `${copy?.ctaPrimary || "Unlock Premium"} · ${selectedPlanCtaPrice}`
    : copy?.ctaPrimary || "Unlock Premium";

  const handlePrimaryPress = () => {
    if (purchaseDisabled || !selectedPlan?.id) return;
    onPlanPress(selectedPlan.id);
  };

  const backdropOpacity = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const shellOpacity = openProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.45, 1],
  });

  const shellTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  });

  const headerTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const sheetTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [52, 0],
  });

  const mascotTranslateY = mascotFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [-7, 7],
  });

  const ctaScale = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const getRowAnimatedStyle = (index, total) => {
    const safeTotal = Math.max(1, total);
    const start = 0.3 + (index / safeTotal) * 0.42;
    const end = Math.min(1, start + 0.18);
    return {
      opacity: openProgress.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
      transform: [
        {
          translateY: openProgress.interpolate({
            inputRange: [start, end],
            outputRange: [10, 0],
            extrapolate: "clamp",
          }),
        },
      ],
    };
  };

  if (!copy) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.shell,
            {
              opacity: shellOpacity,
              transform: [{ translateY: shellTranslateY }],
            },
          ]}
        >
          <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{copy.badgeLabel}</Text>
            </View>

            <Text style={styles.headerTitle}>{copy.title}</Text>
            <Text style={styles.headerSubtitle}>{copy.subtitle}</Text>

            {!!copy.psychologyLine && (
              <View style={styles.psychologyChip}>
                <Text style={styles.psychologyChipText}>{copy.psychologyLine}</Text>
              </View>
            )}

            <Animated.View
              style={[
                styles.mascotWrap,
                {
                  transform: [{ translateY: mascotTranslateY }],
                },
              ]}
            >
              <Text style={styles.mascot}>🪽💸</Text>
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: cardBg,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              <View style={[styles.comparisonCard, { borderColor }]}> 
                <View style={styles.comparisonHeader}>
                  <View style={styles.comparisonFeatureColumn} />
                  <Text style={[styles.comparisonHeaderText, { color: mutedColor }]}>
                    {copy.freeColumnLabel || "FREE"}
                  </Text>
                  <View style={styles.proHeaderPill}>
                    <Text style={styles.proHeaderPillText}>{copy.proColumnLabel || "PRO"}</Text>
                  </View>
                </View>

                {comparisonRows.map((row, index) => (
                  <Animated.View
                    key={`${row.label}_${index}`}
                    style={[
                      styles.comparisonRow,
                      index === comparisonRows.length - 1 && styles.comparisonRowLast,
                      getRowAnimatedStyle(index, comparisonRows.length),
                    ]}
                  >
                    <Text style={[styles.comparisonFeatureText, { color: textColor }]}>{row.label}</Text>
                    <Text style={[styles.comparisonMark, { color: row.free ? "#4D5A78" : "#B7BDCF" }]}>
                      {row.free ? "✓" : "—"}
                    </Text>
                    <View style={styles.proMarkWrap}>
                      <Text style={styles.proMark}>✓</Text>
                    </View>
                  </Animated.View>
                ))}
              </View>

              {!!copy.unlockLevelsLine && (
                <View style={styles.unlockLevelCard}>
                  <Text style={[styles.unlockLevelCardText, { color: textColor }]}>{copy.unlockLevelsLine}</Text>
                </View>
              )}

              <View style={styles.planSection}>
                <Text style={[styles.planSectionTitle, { color: textColor }]}>
                  {copy.planSectionTitle || "Choose your Premium plan"}
                </Text>
                <Text style={[styles.planSectionHint, { color: mutedColor }]}>
                  {copy.planHint || "Select a plan and tap the button below"}
                </Text>

                <View style={styles.planList}>
                  {planCards.map((plan) => {
                    const selected = plan.id === selectedPlanId;
                    const unavailable = plan.available === false;
                    const loading = purchaseLoadingPlan === plan.id;
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        activeOpacity={0.9}
                        onPress={() => setSelectedPlanId(plan.id)}
                        disabled={!!purchaseLoadingPlan || restoring}
                        style={[
                          styles.planCard,
                          {
                            borderColor: selected ? accent : borderColor,
                            backgroundColor: selected ? "rgba(67,83,255,0.1)" : "#FFFFFF",
                            opacity: unavailable ? 0.52 : 1,
                          },
                        ]}
                      >
                        <View style={styles.planTopRow}>
                          <Text style={[styles.planTitle, { color: textColor }]}>{plan.label}</Text>
                          {plan.badge ? (
                            <View
                              style={[
                                styles.planBadge,
                                { backgroundColor: selected ? accent : "rgba(11,22,48,0.08)" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.planBadgeText,
                                  { color: selected ? "#FFFFFF" : textColor },
                                ]}
                              >
                                {unavailable ? copy.planUnavailableLabel || "Unavailable" : plan.badge}
                              </Text>
                            </View>
                          ) : unavailable ? (
                            <View style={[styles.planBadge, { backgroundColor: "rgba(11,22,48,0.08)" }]}> 
                              <Text style={[styles.planBadgeText, { color: textColor }]}>
                                {copy.planUnavailableLabel || "Unavailable"}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.planBottomRow}>
                          <Text style={[styles.planPrice, { color: textColor }]}>{plan.priceLabel}</Text>
                          {!!plan.secondaryLabel && (
                            <Text
                              style={[
                                styles.planSecondary,
                                { color: mutedColor },
                                plan.secondaryKind === "strike" && styles.planSecondaryStrike,
                              ]}
                            >
                              {plan.secondaryLabel}
                            </Text>
                          )}
                        </View>
                        {!!plan.equivalentLabel && (
                          <Text style={[styles.planEquivalent, { color: selected ? "#313EEA" : mutedColor }]}>
                            {plan.equivalentLabel}
                          </Text>
                        )}
                        {loading && (
                          <View style={styles.planLoader}>
                            <ActivityIndicator size="small" color={accent} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </ScrollView>

            <View style={[styles.footer, { borderTopColor: borderColor }]}> 
              <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: purchaseDisabled ? "rgba(67,83,255,0.45)" : accent },
                  ]}
                  onPress={handlePrimaryPress}
                  disabled={purchaseDisabled}
                  activeOpacity={0.9}
                >
                  {purchaseLoadingPlan ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{primaryButtonTitle}</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={[styles.footerSecondaryButton, { borderColor }]}
                  onPress={onRestorePress}
                  disabled={!!purchaseLoadingPlan || restoring}
                  activeOpacity={0.85}
                >
                  {restoring ? (
                    <ActivityIndicator size="small" color={textColor} />
                  ) : (
                    <Text style={[styles.footerSecondaryButtonText, { color: textColor }]}>{copy.ctaRestore}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.footerGhostButton, { borderColor }]}
                  onPress={onClose}
                  disabled={!!purchaseLoadingPlan || restoring}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.footerGhostButtonText, { color: mutedColor }]}>{copy.ctaClose}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1,7,30,0.76)",
  },
  shell: {
    flex: 1,
    justifyContent: "flex-end",
  },
  header: {
    backgroundColor: "#0A1E72",
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 24,
    minHeight: 298,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 48,
    left: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 23,
  },
  headerBadge: {
    position: "absolute",
    top: 52,
    right: 18,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(136,103,255,0.95)",
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerTitle: {
    marginTop: 48,
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 10,
    color: "rgba(239,244,255,0.9)",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  psychologyChip: {
    alignSelf: "center",
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(21,225,141,0.48)",
    backgroundColor: "rgba(21,225,141,0.18)",
  },
  psychologyChipText: {
    color: "#B9FFE3",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  mascotWrap: {
    alignSelf: "center",
    marginTop: 14,
  },
  mascot: {
    fontSize: 56,
  },
  sheet: {
    flex: 1,
    marginTop: -18,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
    gap: 12,
  },
  comparisonCard: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#F5F7FF",
  },
  comparisonFeatureColumn: {
    flex: 1,
  },
  comparisonHeaderText: {
    width: 54,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  proHeaderPill: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#4A57FF",
    paddingVertical: 4,
    marginLeft: 8,
  },
  proHeaderPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(18,28,58,0.12)",
  },
  comparisonRowLast: {
    paddingBottom: 12,
  },
  comparisonFeatureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    paddingRight: 8,
  },
  comparisonMark: {
    width: 54,
    textAlign: "center",
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "500",
  },
  proMarkWrap: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  proMark: {
    color: "#4353FF",
    fontSize: 27,
    lineHeight: 27,
    fontWeight: "600",
  },
  unlockLevelCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(67,83,255,0.24)",
    backgroundColor: "rgba(67,83,255,0.08)",
  },
  unlockLevelCardText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  planSection: {
    gap: 8,
  },
  planSectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  planSectionHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  planList: {
    marginTop: 2,
    gap: 8,
  },
  planCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  planBottomRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  planTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },
  planBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  planBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  planPrice: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900",
  },
  planSecondary: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  planSecondaryStrike: {
    textDecorationLine: "line-through",
  },
  planEquivalent: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  planLoader: {
    position: "absolute",
    right: 10,
    bottom: 8,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 9,
    backgroundColor: "#FFFFFF",
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4353FF",
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  footerRow: {
    flexDirection: "row",
    gap: 8,
  },
  footerSecondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  footerSecondaryButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  footerGhostButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  footerGhostButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
});

export default PremiumPaywallModal;
