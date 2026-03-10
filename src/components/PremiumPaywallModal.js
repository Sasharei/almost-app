import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const pickDefaultPlanId = (planCards = []) => {
  const availableCards = planCards.filter((card) => card?.available !== false);
  const yearly = availableCards.find((card) => card?.id === "yearly");
  if (yearly?.id) return yearly.id;
  const preferred = availableCards.find((card) => card?.recommended);
  if (preferred?.id) return preferred.id;
  const monthly = availableCards.find((card) => card?.id === "monthly");
  if (monthly?.id) return monthly.id;
  if (availableCards[0]?.id) return availableCards[0].id;
  return planCards[0]?.id || "yearly";
};

const PremiumPaywallModal = ({
  visible = false,
  copy = null,
  planCards = [],
  purchaseLoadingPlan = null,
  restoring = false,
  onPlanSelect = () => {},
  onPlanPress = () => {},
  onFeatureInsightPress = () => {},
  onRestorePress = () => {},
  onManagePress = () => {},
  onTermsPress = () => {},
  onPrivacyPress = () => {},
  onClose = () => {},
  colors,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState(() => pickDefaultPlanId(planCards));
  const [selectedComparisonRowId, setSelectedComparisonRowId] = useState(null);
  const openProgress = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;

  const cardBg = colors?.card || "#FFFFFF";
  const textColor = colors?.text || "#0F1635";
  const mutedColor = colors?.muted || "#6C7289";
  const borderColor = colors?.border || "rgba(11,22,48,0.12)";
  const accent = "#4353FF";
  const isAndroid = Platform.OS === "android";
  const isNativeMobile = Platform.OS === "android" || Platform.OS === "ios";
  const { height: viewportHeight } = useWindowDimensions();
  const isCompactAndroid = isNativeMobile && viewportHeight <= 860;
  const isVeryCompactAndroid = isNativeMobile && viewportHeight <= 760;
  const showSecondaryLegalNotice = !isVeryCompactAndroid;
  const disableAndroidMotion = Platform.OS === "android";

  const comparisonRows = Array.isArray(copy?.comparisonRows) ? copy.comparisonRows : [];
  const visibleComparisonRows = comparisonRows;

  const activeInsightRow = useMemo(() => {
    if (!selectedComparisonRowId) return null;
    return (
      comparisonRows.find(
        (row) =>
          row?.interactive &&
          String(row?.id || "") === selectedComparisonRowId
      ) || null
    );
  }, [comparisonRows, selectedComparisonRowId]);

  const headerTitle = activeInsightRow?.lossTitle || copy?.title || "";
  const headerSubtitle = activeInsightRow?.lossSubtitle || copy?.subtitle || "";
  const showPsychologyChip = !!copy?.psychologyLine && !activeInsightRow;
  const headerBenefitValue = activeInsightRow
    ? activeInsightRow?.lossAmountLabel || copy?.lossAmountLabel || ""
    : "";

  const renderBenefitHighlight = useCallback((value = "", benefitValue = "") => {
    const text = String(value || "");
    const token = String(benefitValue || "");
    if (!token || !text.includes(token)) return text;
    const chunks = text.split(token);
    return chunks.map((chunk, index) => (
      <React.Fragment key={`benefit_chunk_${index}`}>
        {chunk}
        {index < chunks.length - 1 ? (
          <Text style={styles.headerBenefitHighlight}>{token}</Text>
        ) : null}
      </React.Fragment>
    ));
  }, []);

  useEffect(() => {
    if (!visible) return;
    setSelectedPlanId(pickDefaultPlanId(planCards));
  }, [planCards, visible]);

  useEffect(() => {
    if (!visible) {
      setSelectedComparisonRowId(null);
      return;
    }
    const activeFeatureKey =
      typeof copy?.activeFeatureKey === "string" && copy.activeFeatureKey.trim().length
        ? copy.activeFeatureKey.trim()
        : "";
    if (!activeFeatureKey) {
      setSelectedComparisonRowId(null);
      return;
    }
    const matchingRow =
      comparisonRows.find((row) => {
        if (!row?.interactive) return false;
        if (Array.isArray(row?.featureKeys) && row.featureKeys.includes(activeFeatureKey)) return true;
        return row?.featureKey === activeFeatureKey;
      }) || null;
    setSelectedComparisonRowId(matchingRow ? String(matchingRow.id || "") : null);
  }, [comparisonRows, copy?.activeFeatureKey, visible]);

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
      ctaPulse.setValue(0);
      return;
    }
    ctaPulse.setValue(0);

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

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [ctaPulse, visible]);

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
  const selectedPlanTrialNotice = selectedPlan?.trialNoticeLabel || "";
  const selectedPlanCurrencyCode =
    (typeof selectedPlan?.currencyCode === "string" && selectedPlan.currencyCode.trim().toUpperCase()) ||
    (planCards.find((entry) => typeof entry?.currencyCode === "string" && entry.currencyCode.trim())?.currencyCode
      ?.trim()
      .toUpperCase()) ||
    (typeof selectedPlanCtaPrice === "string" && (selectedPlanCtaPrice.match(/[A-Z]{3}/) || [])[0]) ||
    "USD";
  const primaryButtonTitle = `Попробуйте за ${selectedPlanCurrencyCode} 0.00`;

  const handlePrimaryPress = () => {
    if (purchaseDisabled || !selectedPlan?.id) return;
    onPlanPress(selectedPlan.id, { source: "primary_button" });
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

  const ctaScale = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const getRowAnimatedStyle = (index, total) => {
    if (disableAndroidMotion) return null;
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

  const footerContent = (
    <>
      <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isCompactAndroid ? styles.primaryButtonCompactAndroid : null,
            { backgroundColor: purchaseDisabled ? "rgba(67,83,255,0.45)" : accent },
          ]}
          onPress={handlePrimaryPress}
          disabled={purchaseDisabled}
          activeOpacity={0.9}
        >
          {purchaseLoadingPlan ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={[styles.primaryButtonText, isCompactAndroid ? styles.primaryButtonTextCompactAndroid : null]}>
              {primaryButtonTitle}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <View style={[styles.footerRow, isCompactAndroid ? styles.footerRowCompactAndroid : null]}>
        <TouchableOpacity
          style={[
            styles.footerSecondaryButton,
            isCompactAndroid ? styles.footerSecondaryButtonCompactAndroid : null,
            { borderColor },
          ]}
          onPress={() => onRestorePress({ source: "restore_button" })}
          disabled={!!purchaseLoadingPlan || restoring}
          activeOpacity={0.85}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <Text
              style={[
                styles.footerSecondaryButtonText,
                isCompactAndroid ? styles.footerSecondaryButtonTextCompactAndroid : null,
                { color: textColor },
              ]}
            >
              {copy.ctaRestore}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerGhostButton, isCompactAndroid ? styles.footerGhostButtonCompactAndroid : null, { borderColor }]}
          onPress={() => onClose("footer_close")}
          disabled={!!purchaseLoadingPlan || restoring}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.footerGhostButtonText,
              isCompactAndroid ? styles.footerGhostButtonTextCompactAndroid : null,
              { color: mutedColor },
            ]}
          >
            {copy.ctaClose}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.footerManageButton, isCompactAndroid ? styles.footerManageButtonCompactAndroid : null, { borderColor }]}
        onPress={() => onManagePress({ source: "manage_button" })}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.footerManageButtonText,
            isCompactAndroid ? styles.footerManageButtonTextCompactAndroid : null,
            { color: textColor },
          ]}
        >
          {copy?.ctaManage || "Manage subscription"}
        </Text>
      </TouchableOpacity>

      <View style={[styles.footerLegalBlock, isCompactAndroid ? styles.footerLegalBlockCompactAndroid : null]}>
        {!!copy?.billingNotice && (
          <Text
            style={[styles.footerLegalNotice, isCompactAndroid ? styles.footerLegalNoticeCompactAndroid : null, { color: mutedColor }]}
            numberOfLines={isCompactAndroid ? 2 : undefined}
          >
            {copy.billingNotice}
          </Text>
        )}
        {!!selectedPlanTrialNotice && (
          <Text
            style={[styles.footerLegalNotice, isCompactAndroid ? styles.footerLegalNoticeCompactAndroid : null, { color: mutedColor }]}
            numberOfLines={isCompactAndroid ? 3 : undefined}
          >
            {selectedPlanTrialNotice}
          </Text>
        )}
        {!!copy?.legalNotice && showSecondaryLegalNotice && (
          <Text
            style={[styles.footerLegalNotice, isCompactAndroid ? styles.footerLegalNoticeCompactAndroid : null, { color: mutedColor }]}
            numberOfLines={isCompactAndroid ? 2 : undefined}
          >
            {copy.legalNotice}
          </Text>
        )}

        <View style={[styles.footerLegalLinksRow, isCompactAndroid ? styles.footerLegalLinksRowCompactAndroid : null]}>
          <TouchableOpacity
            onPress={() => onTermsPress({ source: "terms_link" })}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.footerLegalLinkText, isCompactAndroid ? styles.footerLegalLinkTextCompactAndroid : null, { color: textColor }]}>
              {copy?.legalTermsLabel || "Terms"}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.footerLegalDot, isCompactAndroid ? styles.footerLegalDotCompactAndroid : null, { color: mutedColor }]}>
            •
          </Text>
          <TouchableOpacity
            onPress={() => onPrivacyPress({ source: "privacy_link" })}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.footerLegalLinkText, isCompactAndroid ? styles.footerLegalLinkTextCompactAndroid : null, { color: textColor }]}>
              {copy?.legalPrivacyLabel || "Privacy"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const headerContent = (
    <Animated.View
      style={[
        styles.header,
        isNativeMobile ? styles.headerCompactAndroid : null,
        isCompactAndroid ? styles.headerCompactAndroidSmall : null,
        isVeryCompactAndroid ? styles.headerCompactAndroidTiny : null,
        disableAndroidMotion ? null : { transform: [{ translateY: headerTranslateY }] },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.closeButton,
          isNativeMobile ? styles.closeButtonAndroid : null,
          isCompactAndroid ? styles.closeButtonCompactAndroid : null,
          isVeryCompactAndroid ? styles.closeButtonVeryCompactAndroid : null,
        ]}
        onPress={() => onClose("header_close")}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.closeButtonText,
            isCompactAndroid ? styles.closeButtonTextCompactAndroid : null,
          ]}
        >
          ✕
        </Text>
      </TouchableOpacity>

      <View
        style={[
          styles.headerBadge,
          isNativeMobile ? styles.headerBadgeAndroid : null,
          isCompactAndroid ? styles.headerBadgeCompactAndroid : null,
          isVeryCompactAndroid ? styles.headerBadgeVeryCompactAndroid : null,
        ]}
      >
        <Text
          style={[
            styles.headerBadgeText,
            isCompactAndroid ? styles.headerBadgeTextCompactAndroid : null,
          ]}
        >
          {copy.badgeLabel}
        </Text>
      </View>

      <View style={styles.headerTextWrap}>
        <Text
          style={[
            styles.headerTitle,
            isNativeMobile ? styles.headerTitleAndroid : null,
            isCompactAndroid ? styles.headerTitleCompactAndroid : null,
            isVeryCompactAndroid ? styles.headerTitleVeryCompactAndroid : null,
          ]}
        >
          {renderBenefitHighlight(headerTitle, headerBenefitValue)}
        </Text>
        {!!headerSubtitle && !showPsychologyChip && (
          <Text
            style={[
              styles.headerSubtitle,
              isCompactAndroid ? styles.headerSubtitleCompactAndroid : null,
              isVeryCompactAndroid ? styles.headerSubtitleVeryCompactAndroid : null,
            ]}
          >
            {renderBenefitHighlight(headerSubtitle, headerBenefitValue)}
          </Text>
        )}

        {showPsychologyChip && (
          <View
            style={[
              styles.psychologyChip,
              isCompactAndroid ? styles.psychologyChipCompactAndroid : null,
              isVeryCompactAndroid ? styles.psychologyChipVeryCompactAndroid : null,
            ]}
          >
            <Text
              style={[
                styles.psychologyChipText,
                isCompactAndroid ? styles.psychologyChipTextCompactAndroid : null,
              ]}
            >
              {copy.psychologyLine}
            </Text>
          </View>
        )}
      </View>

    </Animated.View>
  );

  const sheetContent = (
    <>
      <View style={[styles.comparisonCard, isCompactAndroid ? styles.comparisonCardCompactAndroid : null, { borderColor }]}>
        <View style={styles.comparisonHeader}>
          <View style={styles.comparisonFeatureColumn} />
          <Text style={[styles.comparisonHeaderText, { color: mutedColor }]}>
            {copy.freeColumnLabel || "FREE"}
          </Text>
          <View style={styles.proHeaderPill}>
            <Text style={styles.proHeaderPillText}>{copy.proColumnLabel || "PRO"}</Text>
          </View>
        </View>
        {!!copy?.comparisonTapHint && (
          <Text style={[styles.comparisonTapHint, isCompactAndroid ? styles.comparisonTapHintCompactAndroid : null, { color: mutedColor }]}>
            {copy.comparisonTapHint}
          </Text>
        )}

        {visibleComparisonRows.map((row, index) => {
          const rowId = String(row?.id || `${row?.label || "row"}_${index}`);
          const isInteractive = !!row?.interactive && !row?.isCosmetic;
          const isSelected = isInteractive && rowId === selectedComparisonRowId;
          const rowContent = (
            <>
              <Text
                style={[
                  styles.comparisonFeatureText,
                  isCompactAndroid ? styles.comparisonFeatureTextCompactAndroid : null,
                  isSelected ? styles.comparisonFeatureTextActive : null,
                  { color: isSelected ? "#2F3ADE" : textColor },
                ]}
              >
                {row.label}
              </Text>
              <Text
                style={[
                  styles.comparisonMark,
                  isSelected
                    ? styles.comparisonMarkActive
                    : { color: row.free ? "#4D5A78" : "#B7BDCF" },
                ]}
              >
                {row.free ? "✓" : "—"}
              </Text>
              <View style={styles.proMarkWrap}>
                <Text style={[styles.proMark, isSelected ? styles.proMarkActive : null]}>✓</Text>
              </View>
            </>
          );
          const rowStyles = [
            styles.comparisonRow,
            isCompactAndroid ? styles.comparisonRowCompactAndroid : null,
            index === visibleComparisonRows.length - 1 && styles.comparisonRowLast,
            isInteractive ? styles.comparisonRowInteractive : null,
            isSelected ? styles.comparisonRowSelected : null,
          ];

          return (
            <Animated.View
              key={rowId}
              style={getRowAnimatedStyle(index, visibleComparisonRows.length)}
            >
              {isInteractive ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={rowStyles}
                  onPress={() => {
                    setSelectedComparisonRowId(rowId);
                    onFeatureInsightPress(row?.featureKey || rowId, {
                      source: "comparison_row",
                      rowId,
                    });
                  }}
                >
                  {rowContent}
                </TouchableOpacity>
              ) : (
                <View style={rowStyles}>{rowContent}</View>
              )}
            </Animated.View>
          );
        })}
      </View>

      {!!copy.unlockLevelsLine && !isVeryCompactAndroid && (
        <View style={[styles.unlockLevelCard, isCompactAndroid ? styles.unlockLevelCardCompactAndroid : null]}>
          <Text style={[styles.unlockLevelCardText, { color: textColor }]}>{copy.unlockLevelsLine}</Text>
        </View>
      )}

      <View style={styles.planSection}>
        <Text style={[styles.planSectionTitle, isCompactAndroid ? styles.planSectionTitleCompactAndroid : null, { color: textColor }]}>
          {copy.planSectionTitle || "Choose your Premium plan"}
        </Text>
        {!isVeryCompactAndroid && (
          <Text style={[styles.planSectionHint, isCompactAndroid ? styles.planSectionHintCompactAndroid : null, { color: mutedColor }]}>
            {copy.planHint || "Select a plan and tap the button below"}
          </Text>
        )}

        <View style={[styles.planList, isCompactAndroid ? styles.planListCompactAndroid : null]}>
          {planCards.map((plan) => {
            const selected = plan.id === selectedPlanId;
            const unavailable = plan.available === false;
            const loading = purchaseLoadingPlan === plan.id;
            const showBillingMeta =
              !!plan.billingLabel &&
              plan.billingLabel !== plan.secondaryLabel &&
              plan.billingLabel !== plan.secondarySubLabel;
            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedPlanId(plan.id);
                  onPlanSelect(plan.id, { source: "plan_card" });
                }}
                disabled={!!purchaseLoadingPlan || restoring}
                style={[
                  styles.planCard,
                  isCompactAndroid ? styles.planCardCompactAndroid : null,
                  {
                    borderColor: selected ? accent : borderColor,
                    backgroundColor: selected ? "rgba(67,83,255,0.1)" : "#FFFFFF",
                    opacity: unavailable ? 0.52 : 1,
                  },
                ]}
              >
                <View style={styles.planTopRow}>
                  <Text style={[styles.planTitle, isCompactAndroid ? styles.planTitleCompactAndroid : null, { color: textColor }]}>
                    {plan.label}
                  </Text>
                  {plan.badge ? (
                    <View
                      style={[
                        styles.planBadge,
                        isCompactAndroid ? styles.planBadgeCompactAndroid : null,
                        { backgroundColor: selected ? accent : "rgba(11,22,48,0.08)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.planBadgeText,
                          isCompactAndroid ? styles.planBadgeTextCompactAndroid : null,
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
                  <Text style={[styles.planPrice, isCompactAndroid ? styles.planPriceCompactAndroid : null, { color: textColor }]}>
                    {plan.priceLabel}
                  </Text>
                  <View style={styles.planPriceMeta}>
                    {!!plan.secondaryLabel && (
                      <Text
                        style={[
                          styles.planSecondary,
                          isCompactAndroid ? styles.planSecondaryCompactAndroid : null,
                          { color: mutedColor },
                          plan.secondaryKind === "strike" && styles.planSecondaryStrike,
                        ]}
                      >
                        {plan.secondaryLabel}
                      </Text>
                    )}
                    {!!plan.secondarySubLabel && (
                      <Text
                        style={[
                          styles.planSecondarySub,
                          isCompactAndroid ? styles.planSecondarySubCompactAndroid : null,
                          { color: selected ? "#313EEA" : mutedColor },
                        ]}
                      >
                        {plan.secondarySubLabel}
                      </Text>
                    )}
                    {showBillingMeta && (
                      <Text
                        style={[
                          styles.planBillingMeta,
                          isCompactAndroid ? styles.planBillingMetaCompactAndroid : null,
                          { color: mutedColor },
                        ]}
                      >
                        {plan.billingLabel}
                      </Text>
                    )}
                  </View>
                </View>
                {!!plan.equivalentLabel && (
                  <Text
                    style={[
                      styles.planEquivalent,
                      isCompactAndroid ? styles.planEquivalentCompactAndroid : null,
                      { color: selected ? "#313EEA" : mutedColor },
                    ]}
                  >
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
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => onClose("system_back")}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdropPressable} onPress={() => onClose("backdrop")}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.shell,
            disableAndroidMotion
              ? null
              : {
                  opacity: shellOpacity,
                  transform: [{ translateY: shellTranslateY }],
                },
          ]}
        >
          {headerContent}
          <Animated.View
            style={[
              styles.sheet,
              isCompactAndroid ? styles.sheetCompactAndroid : null,
              {
                backgroundColor: cardBg,
              },
              disableAndroidMotion ? null : { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              scrollEnabled
              nestedScrollEnabled={isAndroid}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.sheetScrollContent,
                isCompactAndroid ? styles.sheetScrollContentCompactAndroid : null,
                isVeryCompactAndroid ? styles.sheetScrollContentVeryCompactAndroid : null,
              ]}
            >
              {sheetContent}
            </ScrollView>
            <View
              style={[
                styles.footer,
                styles.footerSticky,
                isCompactAndroid ? styles.footerCompactAndroid : null,
                isVeryCompactAndroid ? styles.footerVeryCompactAndroid : null,
                { borderTopColor: borderColor },
              ]}
            >
              {footerContent}
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
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  shell: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    minHeight: 0,
    zIndex: 2,
  },
  header: {
    backgroundColor: "#0A1E72",
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 24,
    minHeight: 298,
    position: "relative",
  },
  headerCompactAndroid: {
    paddingTop: 48,
    paddingBottom: 16,
    minHeight: 244,
  },
  headerCompactAndroidSmall: {
    paddingTop: 42,
    paddingBottom: 12,
    minHeight: 212,
  },
  headerCompactAndroidTiny: {
    paddingTop: 40,
    paddingBottom: 10,
    minHeight: 188,
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
  closeButtonAndroid: {
    top: 42,
  },
  closeButtonCompactAndroid: {
    top: 34,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  closeButtonVeryCompactAndroid: {
    top: 30,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 23,
  },
  closeButtonTextCompactAndroid: {
    fontSize: 19,
    lineHeight: 20,
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
  headerBadgeAndroid: {
    top: 44,
  },
  headerBadgeCompactAndroid: {
    top: 34,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerBadgeVeryCompactAndroid: {
    top: 30,
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerBadgeTextCompactAndroid: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  headerTextWrap: {
    width: "100%",
    alignItems: "center",
  },
  headerTitle: {
    marginTop: 48,
    width: "100%",
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
  },
  headerTitleAndroid: {
    marginTop: 40,
    fontSize: 30,
    lineHeight: 35,
  },
  headerTitleCompactAndroid: {
    marginTop: 32,
    fontSize: 26,
    lineHeight: 30,
  },
  headerTitleVeryCompactAndroid: {
    marginTop: 30,
    fontSize: 24,
    lineHeight: 28,
  },
  headerBenefitHighlight: {
    color: "#8AF3BC",
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 10,
    width: "100%",
    color: "rgba(239,244,255,0.9)",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  headerSubtitleCompactAndroid: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 18,
  },
  headerSubtitleVeryCompactAndroid: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
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
  psychologyChipCompactAndroid: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  psychologyChipVeryCompactAndroid: {
    marginTop: 6,
  },
  psychologyChipText: {
    color: "#B9FFE3",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  psychologyChipTextCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  sheet: {
    flex: 1,
    minHeight: 0,
    marginTop: -18,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  sheetCompactAndroid: {
    marginTop: -12,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  sheetScrollContentCompactAndroid: {
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  sheetScrollContentVeryCompactAndroid: {
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  comparisonCard: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  comparisonCardCompactAndroid: {
    borderRadius: 16,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#F5F7FF",
  },
  comparisonTapHint: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  comparisonTapHintCompactAndroid: {
    paddingTop: 4,
    paddingBottom: 6,
    fontSize: 10,
    lineHeight: 13,
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
  comparisonRowInteractive: {
    backgroundColor: "rgba(67,83,255,0.035)",
  },
  comparisonRowSelected: {
    backgroundColor: "rgba(67,83,255,0.12)",
    borderTopColor: "rgba(67,83,255,0.42)",
  },
  comparisonRowCompactAndroid: {
    paddingVertical: 8,
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
  comparisonFeatureTextActive: {
    fontWeight: "700",
  },
  comparisonFeatureTextCompactAndroid: {
    fontSize: 12,
    lineHeight: 16,
  },
  comparisonMark: {
    width: 54,
    textAlign: "center",
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "500",
  },
  comparisonMarkActive: {
    color: "#3643D7",
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
  proMarkActive: {
    color: "#2D38CC",
  },
  unlockLevelCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(67,83,255,0.24)",
    backgroundColor: "rgba(67,83,255,0.08)",
  },
  unlockLevelCardCompactAndroid: {
    paddingVertical: 8,
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
  planSectionTitleCompactAndroid: {
    fontSize: 16,
    lineHeight: 21,
  },
  planSectionHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  planSectionHintCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  planList: {
    marginTop: 2,
    gap: 8,
  },
  planListCompactAndroid: {
    gap: 7,
  },
  planCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  planCardCompactAndroid: {
    borderRadius: 12,
    paddingVertical: 8,
    gap: 6,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  planBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  planPriceMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  planTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },
  planTitleCompactAndroid: {
    fontSize: 14,
    lineHeight: 17,
  },
  planBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  planBadgeCompactAndroid: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  planBadgeTextCompactAndroid: {
    fontSize: 9,
    lineHeight: 11,
  },
  planPrice: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900",
  },
  planPriceCompactAndroid: {
    fontSize: 21,
    lineHeight: 23,
  },
  planSecondary: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  planSecondaryCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  planSecondaryStrike: {
    textDecorationLine: "line-through",
  },
  planSecondarySub: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  planSecondarySubCompactAndroid: {
    fontSize: 10,
    lineHeight: 13,
  },
  planBillingMeta: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
  },
  planBillingMetaCompactAndroid: {
    fontSize: 9,
    lineHeight: 12,
  },
  planEquivalent: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  planEquivalentCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
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
    paddingBottom: Platform.OS === "android" ? 20 : 12,
    gap: 9,
    backgroundColor: "#FFFFFF",
    marginTop: 4,
  },
  footerCompactAndroid: {
    paddingTop: 9,
    paddingBottom: 14,
    gap: 7,
  },
  footerVeryCompactAndroid: {
    paddingTop: 8,
    gap: 6,
  },
  footerSticky: {
    flexShrink: 0,
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
  primaryButtonCompactAndroid: {
    minHeight: 48,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  primaryButtonTextCompactAndroid: {
    fontSize: 14,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    gap: 8,
  },
  footerRowCompactAndroid: {
    gap: 6,
  },
  footerSecondaryButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  footerSecondaryButtonCompactAndroid: {
    minHeight: 33,
    borderRadius: 11,
  },
  footerSecondaryButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  footerSecondaryButtonTextCompactAndroid: {
    fontSize: 12,
    lineHeight: 16,
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
  footerGhostButtonCompactAndroid: {
    minHeight: 38,
    borderRadius: 11,
  },
  footerGhostButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  footerGhostButtonTextCompactAndroid: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerManageButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  footerManageButtonCompactAndroid: {
    minHeight: 30,
    borderRadius: 9,
  },
  footerManageButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  footerManageButtonTextCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  footerLegalBlock: {
    gap: 4,
    marginTop: -2,
  },
  footerLegalBlockCompactAndroid: {
    gap: 3,
    marginTop: -2,
  },
  footerLegalNotice: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  footerLegalNoticeCompactAndroid: {
    fontSize: 8,
    lineHeight: 11,
  },
  footerLegalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerLegalLinksRowCompactAndroid: {
    gap: 6,
  },
  footerLegalDot: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: "600",
  },
  footerLegalDotCompactAndroid: {
    fontSize: 9,
    lineHeight: 10,
  },
  footerLegalLinkText: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  footerLegalLinkTextCompactAndroid: {
    fontSize: 9,
    lineHeight: 10,
  },
});

export default PremiumPaywallModal;
