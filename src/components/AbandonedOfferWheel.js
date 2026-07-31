import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Circle as SvgCircle,
  Path as SvgPath,
  Text as SvgText,
  TSpan as SvgTSpan,
} from "react-native-svg";
import { UI_MOTION, UI_RADIUS, UI_TOUCH_TARGET } from "../constants/designSystem";
import { CLASSIC_TAMAGOTCHI_ANIMATIONS } from "../constants/tamagotchiSkins";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import { resolveFabricAutoFitMinimumFontSize } from "../utils/textAutoFit";

const WHEEL_VIEWBOX_SIZE = 320;
const WHEEL_CENTER = WHEEL_VIEWBOX_SIZE / 2;
const WHEEL_RADIUS = 148;
const SEGMENT_COUNT = 8;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const WINNING_SEGMENT_INDEX = 2;
const FREE_SEGMENT_INDEX = 3;
const SPIN_TURN_COUNT = 8;
const FINAL_ROTATION_DEGREES =
  SPIN_TURN_COUNT * 360 + (360 - (WINNING_SEGMENT_INDEX + 0.5) * SEGMENT_ANGLE);
const FULL_SPIN_DURATION_MS = 5200;
const WHEEL_DARK_TEXT = "#0B0F19";
const CAT_STATIC_ASSET = require("../../assets/Cat_mascot.png");

const clampPercent = (value = 0) => {
  const parsed = Math.round(Number(value) || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 35;
  return Math.min(99, parsed);
};

const applyTemplate = (value = "", replacements = {}) => {
  let result = String(value || "");
  Object.entries(replacements).forEach(([key, replacement]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(replacement ?? ""));
  });
  return result;
};

const polarPoint = (angleDegrees, radius = WHEEL_RADIUS) => {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: WHEEL_CENTER + radius * Math.cos(angleRadians),
    y: WHEEL_CENTER + radius * Math.sin(angleRadians),
  };
};

const buildSegmentPath = (index) => {
  const startAngle = index * SEGMENT_ANGLE;
  const endAngle = startAngle + SEGMENT_ANGLE;
  const start = polarPoint(startAngle);
  const end = polarPoint(endAngle);
  return [
    `M ${WHEEL_CENTER} ${WHEEL_CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 0 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const parseHexColor = (value = "") => {
  const match = String(value || "")
    .trim()
    .match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const raw = match[1];
  const hex = raw.length === 3 ? raw.split("").map((digit) => `${digit}${digit}`).join("") : raw;
  return {
    r: Number.parseInt(hex.slice(0, 2), 16) / 255,
    g: Number.parseInt(hex.slice(2, 4), 16) / 255,
    b: Number.parseInt(hex.slice(4, 6), 16) / 255,
  };
};

const linearizeChannel = (channel) =>
  channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const relativeLuminance = (color) =>
  0.2126 * linearizeChannel(color.r) +
  0.7152 * linearizeChannel(color.g) +
  0.0722 * linearizeChannel(color.b);

const contrastRatio = (left, right) => {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  return (
    (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05)
  );
};

const resolveReadableTextColor = (backgroundColor = "", fallbackColor = WHEEL_DARK_TEXT) => {
  const background = parseHexColor(backgroundColor);
  const dark = parseHexColor(WHEEL_DARK_TEXT);
  const light = parseHexColor("#FFFFFF");
  if (!background || !dark || !light) return fallbackColor;
  return contrastRatio(dark, background) >= contrastRatio(light, background)
    ? WHEEL_DARK_TEXT
    : "#FFFFFF";
};

const splitWheelLabel = (value = "") => {
  const parts = String(value || "")
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parts.length ? parts : [""];
};

const AbandonedOfferWheel = ({
  active = false,
  copy = null,
  winningDiscountPercent = 35,
  palette,
  safeAreaTopInset = 0,
  safeAreaBottomInset = 0,
  rtl = false,
  onClaim = () => {},
  onDismiss = () => {},
  onEvent = () => {},
  onStageChange = () => {},
}) => {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { reduceMotion } = useMotionPreferences();
  const [stage, setStage] = useState("idle");
  const spinProgress = useRef(new Animated.Value(0)).current;
  const catEntryProgress = useRef(new Animated.Value(0)).current;
  const catFloatProgress = useRef(new Animated.Value(0)).current;
  const spinAnimationRef = useRef(null);
  const reducedMotionTimerRef = useRef(null);
  const normalizedWinningPercent = clampPercent(winningDiscountPercent);

  const wheelSize = useMemo(() => {
    const horizontalLimit = Math.max(220, viewportWidth - 56);
    const compactLimit = viewportHeight <= 730 ? 260 : viewportHeight <= 820 ? 292 : 318;
    return Math.min(324, horizontalLimit, compactLimit);
  }, [viewportHeight, viewportWidth]);
  const catSize = Math.min(170, Math.max(138, wheelSize * 0.52));

  const percentLabel = useCallback(
    (percent) =>
      applyTemplate(copy?.wheelPercentTemplate, {
        percent: clampPercent(percent),
      }),
    [copy?.wheelPercentTemplate]
  );

  const segments = useMemo(() => {
    const labels = [
      percentLabel(5),
      percentLabel(90),
      "",
      "",
      percentLabel(20),
      percentLabel(50),
      percentLabel(10),
      percentLabel(3),
    ];
    labels[WINNING_SEGMENT_INDEX] = percentLabel(normalizedWinningPercent);
    labels[FREE_SEGMENT_INDEX] = String(copy?.wheelFreeSegment || "");
    const fills = [
      palette.chipBg,
      palette.accent,
      palette.cardBg,
      palette.featureAccent,
      palette.chipBg,
      palette.accent,
      palette.cardBg,
      palette.featureAccent,
    ];
    fills[WINNING_SEGMENT_INDEX] = palette.cardBg;
    return labels.map((label, index) => ({
      fill: fills[index],
      index,
      label,
      textColor: resolveReadableTextColor(fills[index], palette.text),
    }));
  }, [copy?.wheelFreeSegment, normalizedWinningPercent, palette, percentLabel]);

  const resultTitle = useMemo(
    () =>
      applyTemplate(copy?.wheelResultTitleTemplate, {
        percent: normalizedWinningPercent,
      }),
    [copy?.wheelResultTitleTemplate, normalizedWinningPercent]
  );
  const resultSubtitle = useMemo(
    () =>
      applyTemplate(copy?.wheelResultSubtitleTemplate, {
        percent: normalizedWinningPercent,
      }),
    [copy?.wheelResultSubtitleTemplate, normalizedWinningPercent]
  );

  const stopPendingAnimation = useCallback(() => {
    spinAnimationRef.current?.stop?.();
    spinAnimationRef.current = null;
    if (reducedMotionTimerRef.current) {
      clearTimeout(reducedMotionTimerRef.current);
      reducedMotionTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    stopPendingAnimation();
    spinProgress.setValue(0);
    setStage("idle");
    return stopPendingAnimation;
  }, [active, spinProgress, stopPendingAnimation]);

  useEffect(() => {
    catEntryProgress.stopAnimation();
    catEntryProgress.setValue(reduceMotion ? 1 : 0);
    if (!active || reduceMotion) return undefined;
    const animation = Animated.timing(catEntryProgress, {
      toValue: 1,
      duration: UI_MOTION.sheet,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, catEntryProgress, reduceMotion]);

  useEffect(() => {
    catFloatProgress.stopAnimation();
    catFloatProgress.setValue(0);
    if (!active || reduceMotion) return undefined;
    const floatDuration = stage === "spinning" ? 720 : 1500;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(catFloatProgress, {
          toValue: 1,
          duration: floatDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(catFloatProgress, {
          toValue: 0,
          duration: floatDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, catFloatProgress, reduceMotion, stage]);

  useEffect(() => {
    onStageChange(stage);
  }, [onStageChange, stage]);

  const finishSpin = useCallback(() => {
    spinAnimationRef.current = null;
    reducedMotionTimerRef.current = null;
    setStage("result");
    onEvent("result_shown", { discountPercent: normalizedWinningPercent });
    const announcement = [resultTitle, resultSubtitle].filter(Boolean).join(". ");
    if (announcement) {
      AccessibilityInfo.announceForAccessibility?.(announcement);
    }
  }, [normalizedWinningPercent, onEvent, resultSubtitle, resultTitle]);

  const handleSpin = useCallback(() => {
    if (stage !== "idle") return;
    stopPendingAnimation();
    setStage("spinning");
    onEvent("spin_started", { discountPercent: normalizedWinningPercent });
    if (reduceMotion) {
      spinProgress.setValue(1);
      reducedMotionTimerRef.current = setTimeout(finishSpin, UI_MOTION.reduced);
      return;
    }
    spinProgress.setValue(0);
    const animation = Animated.timing(spinProgress, {
      toValue: 1,
      duration: FULL_SPIN_DURATION_MS,
      easing: Easing.bezier(0.1, 0.68, 0.12, 1),
      useNativeDriver: true,
      isInteraction: true,
    });
    spinAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) finishSpin();
    });
  }, [
    finishSpin,
    normalizedWinningPercent,
    onEvent,
    reduceMotion,
    spinProgress,
    stage,
    stopPendingAnimation,
  ]);

  const handleClaim = useCallback(() => {
    if (stage !== "result") return;
    onEvent("claim", { discountPercent: normalizedWinningPercent });
    onClaim({ discountPercent: normalizedWinningPercent });
  }, [normalizedWinningPercent, onClaim, onEvent, stage]);

  const handleDismiss = useCallback(() => {
    if (stage !== "result") return;
    onEvent("decline", { discountPercent: normalizedWinningPercent });
    onDismiss({ discountPercent: normalizedWinningPercent });
  }, [normalizedWinningPercent, onDismiss, onEvent, stage]);

  const wheelRotation = spinProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${FINAL_ROTATION_DEGREES}deg`],
  });
  const pointerRotation = spinProgress.interpolate({
    inputRange: [0, 0.55, 0.7, 0.8, 0.88, 0.94, 0.975, 1],
    outputRange: ["0deg", "0deg", "-6deg", "5deg", "-5deg", "4deg", "-3deg", "0deg"],
  });
  const catTranslateY = catFloatProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, stage === "spinning" ? -9 : -5],
  });
  const catRotation = catFloatProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [stage === "spinning" ? "-2deg" : "-1deg", stage === "spinning" ? "3deg" : "1deg"],
  });
  const catOpacity = catEntryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const catScale = catEntryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });
  const catSource = reduceMotion
    ? CAT_STATIC_ASSET
    : stage === "result"
    ? CLASSIC_TAMAGOTCHI_ANIMATIONS.happyHeadshake
    : stage === "spinning"
    ? CLASSIC_TAMAGOTCHI_ANIMATIONS.follow
    : CLASSIC_TAMAGOTCHI_ANIMATIONS.curious;
  const textAlignStyle = rtl ? styles.textRtl : null;
  const primaryLabel =
    stage === "result"
      ? copy?.transactionAbandonedPopupPrimaryCta
      : stage === "spinning"
      ? copy?.wheelSpinningLabel
      : copy?.wheelSpinCta;
  const primaryDisabled = stage === "spinning";
  const visibleTitle = stage === "result" ? resultTitle : copy?.wheelTitle;
  const visibleSubtitle = stage === "result" ? resultSubtitle : copy?.wheelSubtitle;

  if (!active || !copy) return null;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: palette.sheetBg,
          paddingTop: Math.max(14, Number(safeAreaTopInset) || 0),
          paddingBottom: Math.max(12, Number(safeAreaBottomInset) || 0),
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: palette.chipBg }]}>
          <Text
            style={[styles.badgeText, { color: palette.text }, textAlignStyle]}
            numberOfLines={1}
          >
            {stage === "result"
              ? copy?.wheelResultBadge
              : copy?.transactionAbandonedPopupBadge}
          </Text>
        </View>

        <Text
          style={[styles.title, { color: palette.text }, textAlignStyle]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          minimumFontSize={resolveFabricAutoFitMinimumFontSize({
            fontSize: 26,
            minimumFontScale: 0.78,
          })}
          accessibilityLiveRegion={stage === "result" ? "polite" : "none"}
        >
          {visibleTitle}
        </Text>
        <Text
          style={[styles.subtitle, { color: palette.muted }, textAlignStyle]}
          numberOfLines={4}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          minimumFontSize={resolveFabricAutoFitMinimumFontSize({
            fontSize: 15,
            minimumFontScale: 0.82,
          })}
        >
          {visibleSubtitle}
        </Text>

        <View
          style={[
            styles.wheelFrame,
            {
              backgroundColor: palette.sheetBg,
              height: wheelSize + 12,
              width: wheelSize + 12,
            },
          ]}
        >
          <Animated.View
            accessible
            accessibilityRole="image"
            accessibilityLabel={copy?.wheelAccessibilityLabel}
            style={[
              styles.wheel,
              {
                height: wheelSize,
                width: wheelSize,
                transform: [{ rotate: wheelRotation }],
              },
            ]}
          >
            <Svg height="100%" width="100%" viewBox={`0 0 ${WHEEL_VIEWBOX_SIZE} ${WHEEL_VIEWBOX_SIZE}`}>
              {segments.map((segment) => {
                const middleAngle = (segment.index + 0.5) * SEGMENT_ANGLE;
                const labelPoint = polarPoint(middleAngle, 98);
                const labelLines = splitWheelLabel(segment.label);
                return (
                  <React.Fragment key={`${segment.index}_${segment.label}`}>
                    <SvgPath
                      d={buildSegmentPath(segment.index)}
                      fill={segment.fill}
                      stroke={palette.sheetBg}
                      strokeWidth={3}
                    />
                    <SvgText
                      x={labelPoint.x}
                      y={labelPoint.y - (labelLines.length - 1) * 8}
                      fill={segment.textColor}
                      fontSize={labelLines.length > 1 ? 13 : 18}
                      fontWeight="800"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${middleAngle} ${labelPoint.x} ${labelPoint.y})`}
                    >
                      {labelLines.map((line, lineIndex) => (
                        <SvgTSpan
                          key={`${line}_${lineIndex}`}
                          x={labelPoint.x}
                          dy={lineIndex === 0 ? 0 : 16}
                        >
                          {line}
                        </SvgTSpan>
                      ))}
                    </SvgText>
                  </React.Fragment>
                );
              })}
              <SvgCircle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r={31}
                fill={palette.sheetBg}
              />
              <SvgCircle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r={20}
                fill={palette.accent}
              />
            </Svg>
            <View style={styles.hubMarkWrap} pointerEvents="none">
              <Text style={[styles.hubMark, { color: palette.ctaText }]}>✦</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[styles.pointerWrap, { transform: [{ rotate: pointerRotation }] }]}
            pointerEvents="none"
          >
            <View style={[styles.pointer, { borderTopColor: palette.text }]} />
          </Animated.View>

          <Animated.Image
            source={catSource}
            resizeMode="contain"
            accessible={false}
            pointerEvents="none"
            style={[
              styles.cat,
              {
                height: catSize,
                width: catSize,
                right: -catSize * 0.2,
                bottom: -catSize * 0.2,
                opacity: catOpacity,
                transform: [
                  { translateY: catTranslateY },
                  { rotate: catRotation },
                  { scale: catScale },
                ],
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: primaryDisabled ? palette.disabled : palette.ctaBg,
            },
          ]}
          onPress={stage === "result" ? handleClaim : handleSpin}
          disabled={primaryDisabled}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          accessibilityState={{ disabled: primaryDisabled, busy: primaryDisabled }}
        >
          {stage === "spinning" ? (
            <ActivityIndicator color={palette.ctaText} size="small" />
          ) : null}
          <Text style={[styles.primaryButtonText, { color: palette.ctaText }]} numberOfLines={2}>
            {primaryLabel}
          </Text>
        </TouchableOpacity>

        {stage === "result" ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDismiss}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={copy?.transactionAbandonedPopupSecondaryCta}
          >
            <Text style={[styles.secondaryButtonText, { color: palette.muted }, textAlignStyle]}>
              {copy?.transactionAbandonedPopupSecondaryCta}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 22,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },
  badge: {
    alignSelf: "center",
    borderRadius: UI_RADIUS.pill,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginBottom: 10,
    maxWidth: "94%",
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  title: {
    maxWidth: 390,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 390,
    marginTop: 7,
    marginBottom: 12,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  wheelFrame: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: UI_RADIUS.pill,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
  wheel: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  hubMarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  hubMark: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  pointerWrap: {
    position: "absolute",
    top: -2,
    left: "50%",
    width: 38,
    height: 32,
    marginLeft: -19,
    alignItems: "center",
    zIndex: 4,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 25,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  cat: {
    position: "absolute",
    zIndex: 3,
  },
  footer: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingTop: 10,
  },
  primaryButton: {
    minHeight: Math.max(52, UI_TOUCH_TARGET.current),
    borderRadius: UI_RADIUS.control,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  primaryButtonText: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: UI_TOUCH_TARGET.current,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  textRtl: {
    writingDirection: "rtl",
  },
});

export {
  FINAL_ROTATION_DEGREES,
  FREE_SEGMENT_INDEX,
  SPIN_TURN_COUNT,
  WINNING_SEGMENT_INDEX,
};
export default React.memo(AbandonedOfferWheel);
