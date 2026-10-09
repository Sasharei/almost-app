import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { AccessiblePressable as Pressable, AccessibleTouchableOpacity as TouchableOpacity } from "./AccessibleControls";
import Svg, {
  Defs,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PlatformSurface, { PlatformTouchableOpacity } from "./PlatformSurface";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import { CurrencySelectorField } from "./CurrencyPicker";
import { getOnboardingRedesignCopy } from "../constants/onboardingRedesignCopy";

const PALETTE = Object.freeze({
  background: "#ECEFFD",
  surface: "#FAFAFF",
  surfaceSoft: "#E2E6FA",
  text: "#171C46",
  muted: "#5C638F",
  border: "#CBD1EF",
  primary: "#3E4FD7",
  onPrimary: "#FFFFFF",
  accentSoft: "#DFE4FF",
  mintSoft: "#D9F4E9",
  mintText: "#176B49",
  backdrop: "rgba(8,10,16,0.48)",
});

const FONT = Object.freeze({
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
  extraBold: undefined,
});

const resolveAndroidGoalKeyboardClearance = (viewportHeight) =>
  Math.min(132, Math.max(96, Math.round((Number(viewportHeight) || 0) * 0.14)));

const ANDROID_GOAL_KEYBOARD_TAIL = 80;

const HERO_LANGUAGE = require("../../assets/onboarding/hero-language.webp");
const HERO_PRIVACY = require("../../assets/onboarding/hero-privacy.webp");
const HERO_GOALS = require("../../assets/onboarding/hero-goals.webp");

const LANGUAGE_OPTIONS = Object.freeze([
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "pt", label: "Português" },
  { id: "it", label: "Italiano" },
  { id: "ar-sa", label: "العربية · السعودية" },
  { id: "ar-ae", label: "العربية · الإمارات" },
  { id: "zh", label: "中文" },
  { id: "ko", label: "한국어" },
  { id: "ja", label: "日本語" },
]);

const PERSONAS = Object.freeze([
  {
    id: "mindful_coffee",
    asset: require("../../assets/onboarding/persona-coffee.webp"),
    wash: "#F4E5D7",
    accent: "#8C79D8",
  },
  {
    id: "habit_smoking",
    asset: require("../../assets/onboarding/persona-smoking.webp"),
    wash: "#DFF3E7",
    accent: "#6AB98B",
  },
  {
    id: "glam_beauty",
    asset: require("../../assets/onboarding/persona-beauty.webp"),
    wash: "#F9DEEA",
    accent: "#D77AA8",
  },
  {
    id: "gamer_loot",
    asset: require("../../assets/onboarding/persona-gamer.webp"),
    wash: "#DCE8FF",
    accent: "#6F8CE6",
  },
  {
    id: "foodie_delivery",
    asset: require("../../assets/onboarding/persona-delivery.webp"),
    wash: "#FFE8D1",
    accent: "#E69A58",
  },
  {
    id: "online_impulse",
    asset: require("../../assets/onboarding/persona-online.webp"),
    wash: "#E5E7FF",
    accent: "#7C83DE",
  },
  {
    id: "home_picks",
    asset: require("../../assets/onboarding/persona-home.webp"),
    wash: "#E1F1DF",
    accent: "#78AA70",
  },
  {
    id: "anime_fan",
    asset: require("../../assets/onboarding/persona-anime.webp"),
    wash: "#E9E0FF",
    accent: "#9278D4",
  },
  {
    id: "sub_lover",
    asset: require("../../assets/onboarding/persona-subscriptions.webp"),
    wash: "#DFF4EC",
    accent: "#58AD91",
  },
  {
    id: "fashion_fan",
    asset: require("../../assets/onboarding/persona-fashion.webp"),
    wash: "#FFE2D8",
    accent: "#DB816D",
  },
]);

const GOALS = Object.freeze([
  { id: "travel", copy: "travel", icon: "plane", example: 5000, wash: "#DFE9FF" },
  { id: "tech", copy: "tech", icon: "laptop", example: 3000, wash: "#E6E3FF" },
  { id: "daily", copy: "joy", icon: "spark", example: 900, wash: "#FFE8D6" },
  { id: "save", copy: "save", icon: "jar", example: 2000, wash: "#DFF4E9" },
]);

const CUSTOM_GOAL_ICONS = Object.freeze(["⭐️", "💻", "🏠", "🎨"]);
const OnboardingTapContext = createContext(null);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(PlatformTouchableOpacity);

const isRtlLanguage = (language = "en") =>
  String(language || "en").trim().toLowerCase().replace(/_/g, "-").startsWith("ar");

const normalizeLanguage = (language = "en") =>
  String(language || "en").trim().toLowerCase().replace(/_/g, "-");

const formatExampleAmount = (currency, amount) =>
  `${String(currency || "USD").toUpperCase()} ${Number(amount || 0)
    .toLocaleString("en-US", { maximumFractionDigits: 0 })
    .replace(/,/g, " ")}`;

const useRedesignCopy = (language) =>
  useCallback(
    (path, replacements = {}) => getOnboardingRedesignCopy(language, path, replacements),
    [language]
  );

function LineIcon({ name, size = 22, color = PALETTE.text, strokeWidth = 1.8 }) {
  let content = null;
  switch (name) {
    case "back":
      content = <Path d="M15 5l-7 7 7 7" />;
      break;
    case "arrow":
      content = <Path d="M5 12h14M13 6l6 6-6 6" />;
      break;
    case "check":
      content = <Path d="M6.5 12.5l3.2 3.2 7.8-8" />;
      break;
    case "close":
      content = <Path d="M6 6l12 12M18 6L6 18" />;
      break;
    case "pulse":
      content = <Path d="M3 12h4l2.2-5 4.1 10 2.1-5H21" />;
      break;
    case "lock":
      content = (
        <>
          <Rect x="5" y="10" width="14" height="10" rx="3" />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
      break;
    case "tune":
      content = <Path d="M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4" />;
      break;
    case "plane":
      content = <Path d="M3 11l18-7-7 18-3-7-8-4zM11 15l4-4" />;
      break;
    case "laptop":
      content = (
        <>
          <Rect x="5" y="4" width="14" height="11" rx="2" />
          <Path d="M3 19h18" />
        </>
      );
      break;
    case "spark":
      content = <Path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16z" />;
      break;
    case "jar":
      content = <Path d="M7 4h10M8 4v3l-2 3v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8l-2-3V4M8 13h8" />;
      break;
    case "star":
      content = <Path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3z" />;
      break;
    case "home":
      content = <Path d="M4 11l8-7 8 7v9h-6v-6h-4v6H4v-9z" />;
      break;
    case "palette":
      content = <Path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-3.3-4-6-9-6zM7 10h.01M9 6h.01M14 6h.01M18 9h.01" />;
      break;
    default:
      content = <Path d="M5 12h14" />;
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {content}
    </Svg>
  );
}

function AutoFitText({ style, children, center = false, minimumFontScale = 0.54, ...props }) {
  return (
    <Text
      {...props}
      style={[style, center ? styles.centerText : null]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={minimumFontScale}
      allowFontScaling
      maxFontSizeMultiplier={1.15}
    >
      {children}
    </Text>
  );
}

function AnimatedButton({
  children,
  style,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  scaleTo = 0.975,
  playsTap = true,
  surfaceRole = "control",
}) {
  const { reduceMotion } = useMotionPreferences();
  const playTap = useContext(OnboardingTapContext);
  const press = useRef(new Animated.Value(1)).current;
  const animate = useCallback(
    (value) => {
      Animated.timing(press, {
        toValue: reduceMotion ? 1 : value,
        duration: reduceMotion ? 0 : value < 1 ? 90 : 180,
        easing: value < 1 ? Easing.out(Easing.quad) : Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    },
    [press, reduceMotion]
  );
  return (
    <AnimatedTouchableOpacity
      surfaceRole={surfaceRole}
      style={[style, styles.animatedButtonTouch, { transform: [{ scale: press }] }]}
      activeOpacity={1}
      disabled={disabled}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      onPress={(event) => {
        if (playsTap) playTap?.("tap", { skipCooldown: true });
        onPress?.(event);
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...(accessibilityState || {}), disabled }}
      hitSlop={hitSlop}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
}

function ProgressHeader({ step, language, onBack, onSkip, compact = false }) {
  const copy = useRedesignCopy(language);
  const rtl = isRtlLanguage(language);
  return (
    <View style={[styles.progressHeader, compact && styles.progressHeaderCompact]}>
      <View style={[styles.progressHeaderRow, rtl && styles.rowReverse]}>
        <View style={styles.progressSide}>
          {onBack ? (
            <AnimatedButton
              surfaceRole="chrome"
              style={styles.headerIconButton}
              onPress={onBack}
              accessibilityLabel={copy("common.back") || "Back"}
              hitSlop={8}
            >
              <View style={[styles.headerIconInner, rtl && styles.flipHorizontal]}>
                <LineIcon name="back" size={20} />
              </View>
            </AnimatedButton>
          ) : null}
        </View>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 4, now: step }}>
          {[1, 2, 3, 4].map((item) => (
            <View
              key={item}
              style={[
                styles.progressSegment,
                item === step && styles.progressSegmentCurrent,
                item <= step && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>
        <View style={[styles.progressSide, styles.progressSideEnd]}>
          {onSkip ? (
            <AnimatedButton
              style={styles.skipButton}
              onPress={onSkip}
              accessibilityLabel={copy("common.skip")}
              hitSlop={8}
            >
              <AutoFitText
                style={[styles.skipText, rtl && styles.textLeft]}
                minimumFontScale={0.65}
              >
                {copy("common.skip")}
              </AutoFitText>
            </AnimatedButton>
          ) : null}
        </View>
      </View>
      <AutoFitText style={styles.stepCount} center minimumFontScale={0.68}>
        {copy("common.step", { step })}
      </AutoFitText>
    </View>
  );
}

function PrimaryButton({ label, language, onPress, accessibilityLabel }) {
  const rtl = isRtlLanguage(language);
  return (
    <AnimatedButton
      style={styles.primaryButton}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || label}
      scaleTo={0.97}
    >
      <View style={[styles.primaryButtonInner, rtl && styles.rowReverse]}>
        <AutoFitText style={styles.primaryButtonText} center minimumFontScale={0.58}>
          {label}
        </AutoFitText>
        <View style={rtl ? styles.flipHorizontal : null}>
          <LineIcon name="arrow" size={17} color={PALETTE.onPrimary} strokeWidth={2} />
        </View>
      </View>
    </AnimatedButton>
  );
}

function SecondaryButton({ label, onPress }) {
  return (
    <AnimatedButton style={styles.secondaryButton} onPress={onPress} accessibilityLabel={label}>
      <AutoFitText style={styles.secondaryButtonText} center minimumFontScale={0.58}>
        {label}
      </AutoFitText>
    </AnimatedButton>
  );
}

function ActionDock({ language, primaryLabel, onPrimary, secondaryLabel, onSecondary, bottomInset = 0 }) {
  return (
    <PlatformSurface surfaceRole="sheet" style={[styles.actionDock, { paddingBottom: Math.max(14, bottomInset + 10) }]}>
      <View style={styles.actionDockContent}>
        <PrimaryButton label={primaryLabel} language={language} onPress={onPrimary} />
        {secondaryLabel ? <SecondaryButton label={secondaryLabel} onPress={onSecondary} /> : null}
      </View>
    </PlatformSurface>
  );
}

const ScreenScroll = forwardRef(function ScreenScroll(
  {
    children,
    compact,
    doubleDock = false,
    onScroll,
    onContentSizeChange,
    contentStyle,
    keyboardAware = false,
    keyboardInset = 0,
  },
  ref
) {
  const baseBottomPadding = doubleDock ? 164 : 102;
  return (
    <ScrollView
      ref={ref}
      style={styles.screenScroll}
      contentContainerStyle={[
        styles.screenContent,
        compact && styles.screenContentCompact,
        { paddingBottom: baseBottomPadding + Math.max(0, Number(keyboardInset) || 0) },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={keyboardAware && Platform.OS === "ios"}
      keyboardShouldPersistTaps={keyboardAware ? "always" : "handled"}
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      onScroll={onScroll}
      onContentSizeChange={onContentSizeChange}
      scrollEventThrottle={16}
      bounces={false}
      overScrollMode="never"
    >
      <View style={styles.contentColumn}>{children}</View>
    </ScrollView>
  );
});

function ScreenFrame({
  children,
  step,
  language,
  onBack,
  onSkip,
  compact,
  bottomInset = 0,
  onTap,
}) {
  const insets = useSafeAreaInsets();
  const rtl = isRtlLanguage(language);
  return (
    <OnboardingTapContext.Provider value={onTap}>
      <View
        style={[
          styles.screen,
          {
            direction: rtl ? "rtl" : "ltr",
            paddingTop: Math.max(insets.top, Platform.OS === "android" ? 8 : 0),
          },
        ]}
      >
        <ProgressHeader
          step={step}
          language={language}
          onBack={onBack}
          onSkip={onSkip}
          compact={compact}
        />
        {children({ bottomInset: Math.max(insets.bottom, Number(bottomInset) || 0) })}
      </View>
    </OnboardingTapContext.Provider>
  );
}

function Chip({ label, selected, onPress, style, textStyle, accessibilityLabel }) {
  return (
    <AnimatedButton
      style={[
        styles.chip,
        selected ? styles.chipSelected : null,
        style,
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected }}
    >
      <AutoFitText
        style={[styles.chipText, selected ? styles.chipTextSelected : null, textStyle]}
        center
        minimumFontScale={0.58}
      >
        {label}
      </AutoFitText>
    </AnimatedButton>
  );
}

function HeroArt({ source, variant, compact, growBy = 0 }) {
  const sizeStyle =
    variant === "privacy"
      ? compact
        ? styles.heroPrivacyCompact
        : styles.heroPrivacy
      : variant === "language"
      ? compact
        ? styles.heroLanguageCompact
        : styles.heroLanguage
      : compact
      ? styles.heroGoalsCompact
      : styles.heroGoals;
  const baseHeight =
    variant === "privacy"
      ? compact
        ? 122
        : 230
      : variant === "language"
      ? compact
        ? 96
        : 178
      : compact
      ? 112
      : 178;
  return (
    <View style={[styles.hero, sizeStyle, growBy > 0 && { height: baseHeight + growBy }]}>
      <View style={styles.heroWash} />
      <Image source={source} style={styles.heroImage} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

function ScreenCopy({ title, subtitle, compact, allowTwoLines = false, variant }) {
  return (
    <View style={styles.screenCopy}>
      <AutoFitText
        style={[
          styles.screenTitle,
          compact && styles.screenTitleCompact,
          variant === "privacy" && styles.screenTitlePrivacy,
        ]}
        center
        minimumFontScale={0.5}
      >
        {title}
      </AutoFitText>
      {allowTwoLines ? (
        <Text
          style={[styles.screenSubtitle, styles.centerText, styles.screenSubtitleTwoLines]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.62}
          maxFontSizeMultiplier={1.15}
        >
          {subtitle}
        </Text>
      ) : (
        <AutoFitText
          style={[
            styles.screenSubtitle,
            variant === "language" || variant === "privacy" ? styles.screenSubtitleSmall : null,
          ]}
          center
          minimumFontScale={0.5}
        >
          {subtitle}
        </AutoFitText>
      )}
    </View>
  );
}

export function LanguageScreen({
  colors,
  selectedLanguage,
  selectedCurrency,
  onLanguageChange,
  onCurrencyChange,
  onContinue,
  onShowTerms,
  availableCurrencies = [],
  bottomInset = 0,
  onTap,
}) {
  const { width, height } = useWindowDimensions();
  const compact = height <= 740 || width <= 360;
  const tallViewportGrowth = compact ? 0 : Math.max(0, Math.min(28, height - 844));
  const language = normalizeLanguage(selectedLanguage);
  const copy = useRedesignCopy(language);
  const contentWidth = Math.min(Math.max(320, width) - 36, 560);
  const languageTileWidth = Math.floor((contentWidth - 14) / 3);
  return (
    <ScreenFrame
      step={1}
      language={language}
      compact={compact}
      bottomInset={bottomInset}
      onTap={onTap}
    >
      {({ bottomInset }) => (
        <>
          <ScreenScroll
            compact={compact}
            contentStyle={[
              compact ? styles.languageCompactContent : styles.languageContent,
              tallViewportGrowth > 0 && { paddingTop: 4 + Math.min(8, tallViewportGrowth * 0.28) },
            ]}
          >
            <HeroArt
              source={HERO_LANGUAGE}
              variant="language"
              compact={compact}
              growBy={tallViewportGrowth}
            />
            <ScreenCopy
              compact={compact}
              variant="language"
              title={copy("language.title")}
              subtitle={copy("language.subtitle")}
            />
            <Text
              style={[
                styles.sectionLabel,
                compact && styles.sectionLabelCompact,
                isRtlLanguage(language) && styles.textRight,
              ]}
            >
              {copy("language.appLanguage")}
            </Text>
            <View style={[styles.languageGrid, isRtlLanguage(language) && styles.rowReverse]}>
              {LANGUAGE_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={language === option.id}
                  onPress={() => onLanguageChange?.(option.id)}
                  style={{ width: languageTileWidth }}
                />
              ))}
            </View>
            <Text
              style={[
                styles.sectionLabel,
                compact && styles.sectionLabelCompact,
                isRtlLanguage(language) && styles.textRight,
              ]}
            >
              {copy("language.currency")}
            </Text>
            <CurrencySelectorField
              language={selectedLanguage}
              currency={selectedCurrency}
              codes={availableCurrencies}
              colors={colors}
              onCurrencyChange={onCurrencyChange}
              onTap={onTap}
            />
            <Text
              style={styles.legalHint}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.56}
              maxFontSizeMultiplier={1.1}
            >
              {copy("language.legalPrefix")} {""}
              <Text
                style={styles.inlineLink}
                onPress={onShowTerms}
                accessibilityRole="link"
                accessibilityLabel={copy("language.terms")}
              >
                {copy("language.terms")}
              </Text>
              {language === "zh" || language === "zh-Hant" || language === "ja" ? "。" : "."}
            </Text>
          </ScreenScroll>
          <ActionDock
            language={language}
            primaryLabel={copy("common.continue")}
            onPrimary={onContinue}
            bottomInset={bottomInset}
          />
        </>
      )}
    </ScreenFrame>
  );
}

function PrivacyIcon({ name }) {
  return (
    <View style={styles.privacyIcon}>
      <LineIcon name={name} size={18} color={PALETTE.mintText} />
    </View>
  );
}

export function AnalyticsConsentScreen({
  language = "en",
  onAgree,
  onSkip,
  onBack,
  bottomInset = 0,
  onTap,
}) {
  const { width, height } = useWindowDimensions();
  const compact = height <= 740 || width <= 360;
  const tallViewportGrowth = compact ? 0 : Math.max(0, Math.min(28, height - 844));
  const copy = useRedesignCopy(language);
  const rows = [
    ["pulse", "stabilityTitle", "stabilityBody"],
    ["tune", "featuresTitle", "featuresBody"],
    ["lock", "financeTitle", "financeBody"],
  ];
  return (
    <ScreenFrame
      step={2}
      language={language}
      onBack={onBack}
      compact={compact}
      bottomInset={bottomInset}
      onTap={onTap}
    >
      {({ bottomInset }) => (
        <>
          <ScreenScroll
            compact={compact}
            doubleDock
            contentStyle={[
              compact ? styles.privacyCompactContent : null,
              tallViewportGrowth > 0 && { paddingTop: 8 + Math.min(8, tallViewportGrowth * 0.28) },
            ]}
          >
            <HeroArt
              source={HERO_PRIVACY}
              variant="privacy"
              compact={compact}
              growBy={tallViewportGrowth}
            />
            <ScreenCopy
              compact={compact}
              variant="privacy"
              title={copy("privacy.title")}
              subtitle={copy("privacy.subtitle")}
            />
            <View style={styles.privacyPanel}>
              {rows.map(([icon, title, body], index) => (
                <View
                  key={title}
                  style={[
                    styles.privacyRow,
                    isRtlLanguage(language) && styles.rowReverse,
                    index ? styles.privacyRowBorder : null,
                  ]}
                >
                  <PrivacyIcon name={icon} />
                  <View style={styles.privacyRowCopy}>
                    <AutoFitText
                      style={[styles.privacyRowTitle, isRtlLanguage(language) && styles.textRight]}
                      minimumFontScale={0.68}
                    >
                      {copy(`privacy.${title}`)}
                    </AutoFitText>
                    <Text
                      style={[styles.privacyRowBody, isRtlLanguage(language) && styles.textRight]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      maxFontSizeMultiplier={1.15}
                    >
                      {copy(`privacy.${body}`)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <AutoFitText style={styles.privacyNote} center minimumFontScale={0.54}>
              {copy("privacy.note")}
            </AutoFitText>
          </ScreenScroll>
          <ActionDock
            language={language}
            primaryLabel={copy("privacy.allow")}
            onPrimary={onAgree}
            secondaryLabel={copy("privacy.decline")}
            onSecondary={onSkip}
            bottomInset={bottomInset}
          />
        </>
      )}
    </ScreenFrame>
  );
}

function PersonaCard({ persona, label, selected, onPress, width, rtl }) {
  const { reduceMotion } = useMotionPreferences();
  const selection = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) {
      selection.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(selection, {
      toValue: selected ? 1 : 0,
      stiffness: 260,
      damping: 20,
      mass: 0.72,
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, selected, selection]);
  const animatePress = useCallback(
    (toValue) => {
      Animated.timing(press, {
        toValue: reduceMotion ? 1 : toValue,
        duration: reduceMotion ? 0 : toValue < 1 ? 90 : 180,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    },
    [press, reduceMotion]
  );
  return (
    <View style={[styles.personaWrap, { width, height: width + 9 }]}>
      <Animated.View
        style={[
          styles.personaGlow,
          {
            opacity: selection,
          },
        ]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox="0 0 140 22" preserveAspectRatio="none">
          <Defs>
            <RadialGradient
              id={`persona_glow_${persona.id}`}
              cx="50%"
              cy="38%"
              rx="50%"
              ry="62%"
            >
              <Stop offset="0" stopColor={persona.accent} stopOpacity="0.36" />
              <Stop offset="0.5" stopColor={persona.wash} stopOpacity="0.18" />
              <Stop offset="1" stopColor={persona.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="140"
            height="22"
            rx="11"
            fill={`url(#persona_glow_${persona.id})`}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.personaCard,
          selected && styles.personaCardSelected,
          {
            width,
            height: width,
            transform: [{ scale: press }],
            shadowColor: selected ? persona.accent : "#273070",
            shadowOpacity: selected ? 0.12 : 0.05,
            shadowRadius: selected ? 12 : 8,
            shadowOffset: { width: 0, height: selected ? 7 : 5 },
            elevation: selected ? 5 : 1,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.personaTouch}
          activeOpacity={1}
          onPressIn={() => animatePress(0.975)}
          onPressOut={() => animatePress(1)}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected }}
        >
          <View style={[styles.personaWash, { backgroundColor: persona.wash }]} pointerEvents="none" />
          <Image source={persona.asset} style={styles.personaImage} resizeMode="contain" resizeMethod="resize" />
          <AutoFitText style={styles.personaLabel} center minimumFontScale={0.58}>
            {label}
          </AutoFitText>
          {selected ? (
            <View style={[styles.selectionCheck, rtl ? styles.selectionCheckLeft : styles.selectionCheckRight]}>
              <LineIcon name="check" size={14} color={PALETTE.onPrimary} strokeWidth={2.2} />
            </View>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export function PersonaScreen({
  data = {},
  onChange,
  onSubmit,
  language = "en",
  onBack,
  onSkip,
  bottomInset = 0,
  onTap,
}) {
  const { width, height } = useWindowDimensions();
  const compact = height <= 740 || width <= 360;
  const rtl = isRtlLanguage(language);
  const copy = useRedesignCopy(language);
  const [showAll, setShowAll] = useState(() => {
    const index = PERSONAS.findIndex((persona) => persona.id === data.persona);
    return index >= 4;
  });
  const visible = showAll ? PERSONAS : PERSONAS.slice(0, 4);
  const contentWidth = Math.min(Math.max(320, width) - 36, 560);
  const cardWidth = Math.floor((contentWidth - 9) / 2);
  const genderOptions = [
    ["female", "female"],
    ["male", "male"],
    ["none", "unspecified"],
  ];
  const handleBack = showAll ? () => setShowAll(false) : onBack;
  return (
    <ScreenFrame
      step={3}
      language={language}
      onBack={handleBack}
      onSkip={onSkip}
      compact={compact}
      bottomInset={bottomInset}
      onTap={onTap}
    >
      {({ bottomInset }) => (
        <>
          <ScreenScroll compact={compact} contentStyle={compact && !showAll ? styles.personaCompactContent : null}>
            <ScreenCopy
              compact={compact}
              title={copy(showAll ? "persona.allTitle" : "persona.title")}
              subtitle={copy(showAll ? "persona.allSubtitle" : "persona.subtitle")}
              allowTwoLines={showAll}
            />
            <Text
              style={[
                styles.sectionLabel,
                showAll ? styles.personaSectionLabelAll : styles.personaSectionLabel,
                rtl && styles.textRight,
              ]}
            >
              {copy("persona.address")}
            </Text>
            <View style={[styles.genderRow, rtl && styles.rowReverse]}>
              {genderOptions.map(([id, path], index) => (
                <Chip
                  key={id}
                  label={copy(`persona.${path}`)}
                  selected={(data.gender || "none") === id}
                  onPress={() => onChange?.("gender", id)}
                  style={[
                    styles.genderChip,
                    !showAll && !compact && styles.genderChipRegular,
                    index === 2 && styles.genderChipWide,
                  ]}
                  textStyle={styles.genderChipText}
                />
              ))}
            </View>
            <Text
              style={[
                styles.sectionLabel,
                showAll ? styles.personaSectionLabelAll : styles.personaScenarioLabel,
                rtl && styles.textRight,
              ]}
            >
              {copy("persona.scenario")}
            </Text>
            <View style={[styles.personaGrid, rtl && styles.rowReverse]}>
              {visible.map((persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  label={copy(`persona.profiles.${persona.id}`)}
                  selected={data.persona === persona.id}
                  onPress={() => onChange?.("persona", persona.id)}
                  width={cardWidth}
                  rtl={rtl}
                />
              ))}
            </View>
            {!showAll ? (
              <AnimatedButton
                style={[styles.showAllButton, compact && styles.showAllButtonCompact]}
                onPress={() => setShowAll(true)}
                accessibilityLabel={copy("persona.showAll")}
              >
                <View style={[styles.showAllInner, rtl && styles.rowReverse]}>
                  <AutoFitText style={styles.showAllText} minimumFontScale={0.6}>
                    {copy("persona.showAll")}
                  </AutoFitText>
                  <AutoFitText style={styles.showAllMeta} minimumFontScale={0.6}>
                    {copy("persona.more")}
                  </AutoFitText>
                </View>
              </AnimatedButton>
            ) : null}
          </ScreenScroll>
          <ActionDock
            language={language}
            primaryLabel={copy("common.continue")}
            onPrimary={onSubmit}
            bottomInset={bottomInset}
          />
        </>
      )}
    </ScreenFrame>
  );
}

function GoalCard({ goal, label, example, selected, onPress, width, rtl }) {
  return (
    <AnimatedButton
      style={[
        styles.goalCard,
        { width },
        selected && styles.goalCardSelected,
      ]}
      onPress={onPress}
      accessibilityLabel={`${label}. ${example}`}
      accessibilityState={{ selected }}
    >
      <View style={styles.goalCardInner}>
        <View style={[styles.goalIcon, { backgroundColor: goal.wash }]}>
          <LineIcon name={goal.icon} size={23} />
        </View>
        <AutoFitText style={[styles.goalCardTitle, rtl && styles.textRight]} minimumFontScale={0.62}>
          {label}
        </AutoFitText>
        <AutoFitText style={[styles.goalCardExample, rtl && styles.textRight]} minimumFontScale={0.54}>
          {example}
        </AutoFitText>
        {selected ? (
          <View style={[styles.selectionCheck, rtl ? styles.selectionCheckLeft : styles.selectionCheckRight]}>
            <LineIcon name="check" size={14} color={PALETTE.onPrimary} strokeWidth={2.2} />
          </View>
        ) : null}
      </View>
    </AnimatedButton>
  );
}

function GoalAmountRow({
  language,
  title,
  currency,
  value,
  onChange,
  inputRef,
  isFirst,
  onActivate,
  onFocus,
  rowRef,
}) {
  const copy = useRedesignCopy(language);
  const rtl = isRtlLanguage(language);
  return (
    <View
      ref={rowRef}
      style={[styles.goalAmountRow, !isFirst && styles.goalAmountRowBorder, rtl && styles.rowReverse]}
    >
      <View style={styles.goalAmountCopy}>
        <AutoFitText style={[styles.goalAmountTitle, rtl && styles.textRight]} minimumFontScale={0.62}>
          {title}
        </AutoFitText>
        <AutoFitText style={[styles.goalAmountLabel, rtl && styles.textRight]} minimumFontScale={0.62}>
          {copy("goal.target")}
        </AutoFitText>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.goalAmountInputWrap,
          pressed && styles.goalAmountInputWrapPressed,
        ]}
        onPress={onActivate}
        hitSlop={2}
      >
        <Text style={styles.goalAmountCurrency} numberOfLines={1}>
          {String(currency || "USD").toUpperCase()}
        </Text>
        <TextInput
          ref={inputRef}
          style={styles.goalAmountInput}
          value={value || ""}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          onFocus={onFocus}
          selectTextOnFocus
          accessibilityLabel={`${copy("goal.target")}: ${title}`}
          maxFontSizeMultiplier={1.15}
        />
      </Pressable>
    </View>
  );
}

export function GoalScreen({
  selectedGoals = [],
  onToggle,
  onSubmit,
  goalTargets = {},
  onGoalTargetChange,
  currency = "USD",
  onRegisterGoalTargetFocus,
  language = "en",
  onBack,
  customGoals = [],
  onCustomGoalCreate,
  bottomInset = 0,
  onTap,
}) {
  const { width, height } = useWindowDimensions();
  const compact = height <= 740 || width <= 360;
  const rtl = isRtlLanguage(language);
  const copy = useRedesignCopy(language);
  const scrollRef = useRef(null);
  const inputRefs = useRef({});
  const amountRowRefs = useRef({});
  const amountPanelY = useRef(0);
  const shouldScrollToAmounts = useRef(false);
  const focusedGoalId = useRef(null);
  const keyboardVisibleRef = useRef(false);
  const androidRevealFrameRef = useRef(null);
  const viewportHeightRef = useRef(height);
  const viewportWidthRef = useRef(width);
  const androidKeyboardTopRef = useRef(height);
  const androidKeyboardInsetRef = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);
  const selectedSet = useMemo(() => new Set(selectedGoals || []), [selectedGoals]);
  const contentWidth = Math.min(Math.max(320, width) - 36, 560);
  const cardWidth = Math.floor((contentWidth - 9) / 2);
  const customMap = useMemo(
    () => Object.fromEntries((customGoals || []).filter((goal) => goal?.id).map((goal) => [goal.id, goal])),
    [customGoals]
  );
  const selectedEntries = useMemo(
    () =>
      (selectedGoals || [])
        .map((id) => {
          const preset = GOALS.find((goal) => goal.id === id);
          if (preset) {
            return { id, title: copy(`goal.${preset.copy}`), example: preset.example };
          }
          const custom = customMap[id];
          return custom ? { id, title: custom.title, example: Number(custom.targetLocal) || 0 } : null;
        })
        .filter(Boolean),
    [copy, customMap, selectedGoals]
  );
  const scrollToAmounts = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, amountPanelY.current - 14), animated: true });
    });
  }, []);
  const revealAndroidTarget = useCallback((goalId) => {
    if (Platform.OS !== "android" || !goalId) return;
    const input = inputRefs.current?.[goalId];
    const target = amountRowRefs.current?.[goalId] || input;
    const scroll = scrollRef.current;
    const innerView = scroll?.getInnerViewRef?.();
    const keyboardClearance = resolveAndroidGoalKeyboardClearance(viewportHeightRef.current);
    const fallbackReveal = () => {
      if (!target || !scroll || focusedGoalId.current !== goalId) return;
      scroll?.scrollResponderScrollNativeHandleToKeyboard?.(
        target,
        keyboardClearance,
        true
      );
    };
    if (!target || !scroll) return;
    if (
      !innerView ||
      typeof target.measureInWindow !== "function" ||
      typeof target.measureLayout !== "function" ||
      typeof scroll.measureInWindow !== "function"
    ) {
      fallbackReveal();
      return;
    }
    target.measureInWindow((_targetX, targetY, _targetWidth, targetHeight) => {
      const overlap =
        targetY + targetHeight + keyboardClearance - androidKeyboardTopRef.current;
      if (!Number.isFinite(overlap) || overlap <= 1) return;
      scroll.measureInWindow((_scrollX, scrollY) => {
        target.measureLayout(
          innerView,
          (_contentX, contentY, _contentWidth, contentHeight) => {
            if (focusedGoalId.current !== goalId) return;
            const visibleBottom = androidKeyboardTopRef.current - scrollY;
            const targetScrollY =
              contentY + contentHeight + keyboardClearance - visibleBottom;
            if (!Number.isFinite(targetScrollY)) return;
            scroll.scrollTo({ y: Math.max(0, targetScrollY), animated: true });
          },
          fallbackReveal
        );
      });
    });
  }, []);
  const scheduleAndroidTargetReveal = useCallback(
    (goalId) => {
      if (Platform.OS !== "android" || !goalId) return;
      if (androidRevealFrameRef.current !== null) {
        cancelAnimationFrame(androidRevealFrameRef.current);
      }
      androidRevealFrameRef.current = requestAnimationFrame(() => {
        androidRevealFrameRef.current = requestAnimationFrame(() => {
          androidRevealFrameRef.current = null;
          revealAndroidTarget(goalId);
        });
      });
    },
    [revealAndroidTarget]
  );
  const focusTarget = useCallback((goalId) => {
    if (!goalId) return;
    focusedGoalId.current = goalId;
    requestAnimationFrame(() => inputRefs.current?.[goalId]?.focus?.());
  }, []);
  const handleGoalAmountFocus = useCallback(
    (goalId) => {
      focusedGoalId.current = goalId;
      if (Platform.OS === "android" && keyboardVisibleRef.current) {
        scheduleAndroidTargetReveal(goalId);
      }
    },
    [scheduleAndroidTargetReveal]
  );
  const handleGoalContentSizeChange = useCallback(() => {
    if (Platform.OS !== "android" || !keyboardVisibleRef.current) return;
    scheduleAndroidTargetReveal(focusedGoalId.current);
  }, [scheduleAndroidTargetReveal]);
  useEffect(() => {
    onRegisterGoalTargetFocus?.(focusTarget);
    return () => onRegisterGoalTargetFocus?.(null);
  }, [focusTarget, onRegisterGoalTargetFocus]);
  useEffect(() => {
    if (!keyboardVisibleRef.current) {
      const orientationChanged = Math.abs(viewportWidthRef.current - width) > 40;
      viewportWidthRef.current = width;
      viewportHeightRef.current = orientationChanged
        ? height
        : Math.max(viewportHeightRef.current, height);
      androidKeyboardTopRef.current = viewportHeightRef.current;
      return;
    }
    if (Platform.OS !== "android") return;
    const baselineHeight = viewportHeightRef.current;
    if (!Number.isFinite(height) || height <= 0 || height >= baselineHeight - 40) return;
    const resizedWindowTop = Math.max(0, height);
    androidKeyboardTopRef.current = Math.min(
      androidKeyboardTopRef.current,
      resizedWindowTop
    );
    const requiredInset = Math.max(
      androidKeyboardInsetRef.current,
      baselineHeight - androidKeyboardTopRef.current
    );
    const insetChanged = Math.abs(requiredInset - androidKeyboardInsetRef.current) > 1;
    androidKeyboardInsetRef.current = requiredInset;
    if (insetChanged) {
      setAndroidKeyboardInset(requiredInset);
    }
    scheduleAndroidTargetReveal(focusedGoalId.current);
  }, [height, scheduleAndroidTargetReveal, width]);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      keyboardVisibleRef.current = true;
      setKeyboardVisible(true);
      if (Platform.OS === "android") {
        const baselineHeight = viewportHeightRef.current;
        const keyboardMetrics = Keyboard.metrics?.();
        const previousInset = androidKeyboardInsetRef.current;
        const reportedHeight = Math.max(
          0,
          Number(event?.endCoordinates?.height) || 0,
          Number(keyboardMetrics?.height) || 0
        );
        const fallbackHeight = Math.min(
          360,
          Math.max(240, Math.round(baselineHeight * 0.38))
        );
        const minimumPlausibleHeight = Math.max(180, Math.round(baselineHeight * 0.22));
        const resolvedHeight =
          reportedHeight >= minimumPlausibleHeight
            ? Math.min(reportedHeight, Math.round(baselineHeight * 0.72))
            : fallbackHeight;
        const currentWindowHeight = Number(Dimensions.get("window")?.height) || baselineHeight;
        const keyboardTopCandidates = [
          Number(event?.endCoordinates?.screenY),
          Number(keyboardMetrics?.screenY),
          baselineHeight - resolvedHeight,
        ].filter((value) => Number.isFinite(value) && value > 0 && value <= baselineHeight);
        if (currentWindowHeight < baselineHeight - 40) {
          keyboardTopCandidates.push(currentWindowHeight);
        }
        const keyboardTop = keyboardTopCandidates.length
          ? Math.max(0, Math.min(...keyboardTopCandidates))
          : Math.max(0, baselineHeight - resolvedHeight);
        const requiredInset = Math.max(resolvedHeight, baselineHeight - keyboardTop);
        androidKeyboardTopRef.current = keyboardTop;
        androidKeyboardInsetRef.current = requiredInset;
        if (Math.abs(requiredInset - previousInset) > 1) {
          setAndroidKeyboardInset(requiredInset);
        }
        scheduleAndroidTargetReveal(focusedGoalId.current);
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardVisibleRef.current = false;
      focusedGoalId.current = null;
      androidKeyboardTopRef.current = viewportHeightRef.current;
      androidKeyboardInsetRef.current = 0;
      if (androidRevealFrameRef.current !== null) {
        cancelAnimationFrame(androidRevealFrameRef.current);
        androidRevealFrameRef.current = null;
      }
      setKeyboardVisible(false);
      setAndroidKeyboardInset(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (androidRevealFrameRef.current !== null) {
        cancelAnimationFrame(androidRevealFrameRef.current);
        androidRevealFrameRef.current = null;
      }
    };
  }, [scheduleAndroidTargetReveal]);
  const handleGoalPress = useCallback(
    (goal) => {
      const wasSelected = selectedSet.has(goal.id);
      onToggle?.(goal.id);
      if (!wasSelected) {
        if (!String(goalTargets?.[goal.id] || "").trim()) {
          onGoalTargetChange?.(goal.id, String(goal.example));
        }
        shouldScrollToAmounts.current = true;
      }
    },
    [goalTargets, onGoalTargetChange, onToggle, selectedSet]
  );
  const selected = selectedEntries.length > 0;
  const androidKeyboardScrollTail = androidKeyboardInset
    ? androidKeyboardInset +
      resolveAndroidGoalKeyboardClearance(viewportHeightRef.current) +
      ANDROID_GOAL_KEYBOARD_TAIL
    : 0;
  return (
    <ScreenFrame
      step={4}
      language={language}
      onBack={onBack}
      compact={compact}
      bottomInset={bottomInset}
      onTap={onTap}
    >
      {({ bottomInset }) => (
        <>
          <ScreenScroll
            ref={scrollRef}
            compact={compact}
            contentStyle={compact ? styles.goalCompactContent : null}
            keyboardAware
            keyboardInset={androidKeyboardScrollTail}
            onContentSizeChange={handleGoalContentSizeChange}
          >
            <HeroArt source={HERO_GOALS} variant="goals" compact={compact} />
            <ScreenCopy
              compact={compact}
              title={copy(selected ? "goal.amountTitle" : "goal.title")}
              subtitle={copy(selected ? "goal.amountSubtitle" : "goal.subtitle")}
            />
            <View style={[styles.goalGrid, rtl && styles.rowReverse]}>
              {GOALS.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  label={copy(`goal.${goal.copy}`)}
                  example={copy("goal.example", {
                    amount: formatExampleAmount(currency, goal.example),
                  })}
                  selected={selectedSet.has(goal.id)}
                  onPress={() => handleGoalPress(goal)}
                  width={cardWidth}
                  rtl={rtl}
                />
              ))}
              {(customGoals || []).map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={{ ...GOALS[1], icon: "star", wash: "#EEE9FF" }}
                  label={goal.title}
                  example={copy("goal.example", {
                    amount: formatExampleAmount(currency, goal.targetLocal || 0),
                  })}
                  selected={selectedSet.has(goal.id)}
                  onPress={() => handleGoalPress({ id: goal.id, example: Number(goal.targetLocal) || 0 })}
                  width={cardWidth}
                  rtl={rtl}
                />
              ))}
            </View>
            {selected ? (
              <View
                style={styles.goalAmounts}
                onLayout={(event) => {
                  amountPanelY.current = event.nativeEvent.layout.y;
                  if (shouldScrollToAmounts.current) {
                    shouldScrollToAmounts.current = false;
                    scrollToAmounts();
                  }
                }}
              >
                {selectedEntries.map((entry, index) => (
                  <GoalAmountRow
                    key={entry.id}
                    language={language}
                    title={entry.title}
                    currency={currency}
                    value={goalTargets?.[entry.id] || String(entry.example || "")}
                    onChange={(value) => onGoalTargetChange?.(entry.id, value)}
                    inputRef={(node) => {
                      if (node) inputRefs.current[entry.id] = node;
                      else delete inputRefs.current[entry.id];
                    }}
                    rowRef={(node) => {
                      if (node) amountRowRefs.current[entry.id] = node;
                      else delete amountRowRefs.current[entry.id];
                    }}
                    onActivate={() => focusTarget(entry.id)}
                    onFocus={() => handleGoalAmountFocus(entry.id)}
                    isFirst={index === 0}
                  />
                ))}
              </View>
            ) : null}
            <AnimatedButton
              style={styles.showAllButton}
              onPress={onCustomGoalCreate}
              accessibilityLabel={copy("goal.custom")}
              playsTap={false}
            >
              <View style={[styles.showAllInner, rtl && styles.rowReverse]}>
                <AutoFitText style={styles.showAllText} minimumFontScale={0.6}>
                  {copy("goal.custom")}
                </AutoFitText>
                <Text style={styles.customGoalPlus}>+</Text>
              </View>
            </AnimatedButton>
          </ScreenScroll>
          {!keyboardVisible ? (
            <ActionDock
              language={language}
              primaryLabel={copy(selected ? "goal.finish" : "common.continue")}
              onPrimary={onSubmit}
              bottomInset={bottomInset}
            />
          ) : null}
        </>
      )}
    </ScreenFrame>
  );
}

function SheetHeader({ title, closeLabel, onClose, rtl = false }) {
  return (
    <View style={[styles.sheetHeader, rtl && styles.rowReverse]}>
      <AutoFitText style={[styles.sheetTitle, rtl && styles.textRight]} minimumFontScale={0.62}>
        {title}
      </AutoFitText>
      <AnimatedButton style={styles.sheetClose} onPress={onClose} accessibilityLabel={closeLabel} hitSlop={6}>
        <View style={styles.sheetCloseInner}>
          <LineIcon name="close" size={20} />
        </View>
      </AnimatedButton>
    </View>
  );
}

function BottomSheetScaffold({
  visible,
  onClose,
  children,
  keyboardOffset = 0,
  language = "en",
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalFill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Math.max(0, keyboardOffset)}
      >
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          onClose?.();
        }}>
          <View style={styles.sheetBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={[
                  styles.sheet,
                  {
                    direction: isRtlLanguage(language) ? "rtl" : "ltr",
                    paddingBottom: Math.max(22, insets.bottom + 10),
                  },
                ]}
              >
                <View style={styles.sheetHandle} />
                {children}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function OnboardingGoalModal({
  visible,
  language = "en",
  currency = "USD",
  data = {},
  onChange,
  onSubmit,
  onCancel,
  keyboardOffset = 0,
}) {
  const copy = useRedesignCopy(language);
  const selectedIcon = CUSTOM_GOAL_ICONS.includes(data.emoji) ? data.emoji : CUSTOM_GOAL_ICONS[1];
  useEffect(() => {
    if (visible && !CUSTOM_GOAL_ICONS.includes(data.emoji)) {
      onChange?.("emoji", CUSTOM_GOAL_ICONS[1]);
    }
  }, [data.emoji, onChange, visible]);
  return (
    <BottomSheetScaffold
      visible={visible}
      onClose={onCancel}
      keyboardOffset={keyboardOffset}
      language={language}
    >
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.sheetScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SheetHeader
          title={copy("custom.title")}
          closeLabel={copy("terms.close")}
          onClose={onCancel}
          rtl={isRtlLanguage(language)}
        />
        <Text
          style={[styles.sheetSubtitle, isRtlLanguage(language) && styles.textRight]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          maxFontSizeMultiplier={1.15}
        >
          {copy("custom.subtitle")}
        </Text>
        <Text style={[styles.fieldLabel, isRtlLanguage(language) && styles.textRight]}>
          {copy("custom.name")}
        </Text>
        <TextInput
          style={[styles.sheetInput, isRtlLanguage(language) && styles.rtlInput]}
          value={data.name || ""}
          onChangeText={(value) => onChange?.("name", value)}
          placeholder={copy("custom.sample")}
          placeholderTextColor={PALETTE.muted}
          returnKeyType="done"
          maxFontSizeMultiplier={1.15}
        />
        <Text style={[styles.fieldLabel, isRtlLanguage(language) && styles.textRight]}>
          {copy("custom.icon")}
        </Text>
        <View style={styles.iconPicker}>
          {CUSTOM_GOAL_ICONS.map((icon, index) => (
            <AnimatedButton
              key={icon}
              style={[styles.iconChoice, selectedIcon === icon && styles.iconChoiceSelected]}
              onPress={() => onChange?.("emoji", icon)}
              accessibilityLabel={`${copy("custom.icon")} ${index + 1}`}
              accessibilityState={{ selected: selectedIcon === icon }}
            >
              <Text style={styles.iconChoiceText}>{icon}</Text>
            </AnimatedButton>
          ))}
        </View>
        <Text style={[styles.fieldLabel, isRtlLanguage(language) && styles.textRight]}>
          {copy("custom.target")}
        </Text>
        <View style={styles.sheetAmountInputWrap}>
          <Text style={styles.sheetAmountCurrency}>{String(currency || "USD").toUpperCase()}</Text>
          <TextInput
            style={styles.sheetAmountInput}
            value={data.target || ""}
            onChangeText={(value) => onChange?.("target", value)}
            placeholder="4 800"
            placeholderTextColor={PALETTE.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            maxFontSizeMultiplier={1.15}
          />
        </View>
        <View style={styles.sheetPrimarySpacing}>
          <PrimaryButton label={copy("custom.add")} language={language} onPress={onSubmit} />
        </View>
      </ScrollView>
    </BottomSheetScaffold>
  );
}

export function TermsModal({
  visible,
  language = "en",
  onAccept,
  onCancel,
  onOpenLink,
}) {
  const copy = useRedesignCopy(language);
  return (
    <BottomSheetScaffold visible={visible} onClose={onCancel} language={language}>
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.sheetScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SheetHeader
          title={copy("terms.title")}
          closeLabel={copy("terms.close")}
          onClose={onCancel}
          rtl={isRtlLanguage(language)}
        />
        <Text
          style={[styles.sheetSubtitle, isRtlLanguage(language) && styles.textRight]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.66}
          maxFontSizeMultiplier={1.15}
        >
          {copy("terms.subtitle")}
        </Text>
        <View style={styles.termsBody}>
          <Text style={[styles.termsHeading, isRtlLanguage(language) && styles.textRight]}>
            {copy("terms.decisionTitle")}
          </Text>
          <Text style={[styles.termsParagraph, isRtlLanguage(language) && styles.textRight]}>
            {copy("terms.decisionBody")}
          </Text>
          <Text style={[styles.termsHeading, isRtlLanguage(language) && styles.textRight]}>
            {copy("terms.dataTitle")}
          </Text>
          <Text style={[styles.termsParagraph, isRtlLanguage(language) && styles.textRight]}>
            {copy("terms.dataBody")}
          </Text>
          <Pressable
            style={[styles.termsLink, isRtlLanguage(language) && styles.termsLinkRtl]}
            onPress={onOpenLink}
            accessibilityRole="link"
            accessibilityLabel={copy("terms.full")}
          >
            <Text style={styles.termsLinkText}>{copy("terms.full")} ↗</Text>
          </Pressable>
        </View>
        <PrimaryButton label={copy("terms.accept")} language={language} onPress={onAccept} />
        <View style={styles.sheetSecondarySpacing}>
          <SecondaryButton label={copy("terms.close")} onPress={onCancel} />
        </View>
      </ScrollView>
    </BottomSheetScaffold>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  animatedButtonTouch: {
    justifyContent: "center",
  },
  centerText: { textAlign: "center" },
  textRight: { textAlign: "right" },
  textLeft: { textAlign: "left" },
  rowReverse: { flexDirection: "row-reverse" },
  flipHorizontal: { transform: [{ scaleX: -1 }] },
  ltrDirection: { direction: "ltr" },
  screen: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  progressHeader: {
    minHeight: 70,
    paddingHorizontal: 18,
    justifyContent: "flex-start",
  },
  progressHeaderCompact: {
    minHeight: 64,
  },
  progressHeaderRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressSide: {
    width: 70,
    minHeight: 44,
    justifyContent: "center",
  },
  progressSideEnd: {
    alignItems: "flex-end",
  },
  progressTrack: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  progressSegment: {
    width: 26,
    height: 4,
    borderRadius: 999,
    backgroundColor: PALETTE.border,
  },
  progressSegmentCurrent: { width: 42 },
  progressSegmentActive: { backgroundColor: PALETTE.primary },
  progressHeaderRowRtl: { flexDirection: "row-reverse" },
  headerIconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: PALETTE.surface },
  headerIconInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  skipButton: { width: 70, height: 44, justifyContent: "center" },
  skipText: {
    color: PALETTE.muted,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 10,
    textAlign: "right",
  },
  stepCount: {
    color: PALETTE.muted,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 10,
    lineHeight: 14,
    marginTop: -1,
  },
  screenScroll: { flex: 1 },
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  screenContentCompact: { paddingTop: 2 },
  contentColumn: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  languageContent: { paddingTop: 4 },
  languageCompactContent: { paddingTop: 0 },
  privacyCompactContent: { paddingTop: 0 },
  personaCompactContent: { paddingTop: 0 },
  goalCompactContent: { paddingTop: 0 },
  hero: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -4,
    marginTop: 2,
    marginBottom: 8,
  },
  heroWash: {
    position: "absolute",
    width: 250,
    height: 120,
    borderRadius: 125,
    backgroundColor: PALETTE.accentSoft,
    opacity: 0.82,
  },
  heroImage: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  heroLanguage: { height: 178 },
  heroLanguageCompact: { height: 96, marginBottom: 8 },
  heroPrivacy: { height: 230, marginBottom: 10 },
  heroPrivacyCompact: { height: 122, marginBottom: 8 },
  heroGoals: { height: 178 },
  heroGoalsCompact: { height: 112 },
  screenCopy: { alignItems: "stretch" },
  screenTitle: {
    color: PALETTE.text,
    fontFamily: FONT.extraBold,
    fontWeight: "800",
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.75,
  },
  screenTitleCompact: { fontSize: 24, lineHeight: 26, letterSpacing: -0.55 },
  screenTitlePrivacy: { fontSize: 27 },
  screenSubtitle: {
    marginTop: 9,
    color: PALETTE.muted,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 13,
    lineHeight: 18,
  },
  screenSubtitleSmall: { fontSize: 11, lineHeight: 16, letterSpacing: -0.1 },
  screenSubtitleTwoLines: { fontSize: 11, lineHeight: 15 },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: PALETTE.muted,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 14,
  },
  sectionLabelCompact: { marginTop: 10, marginBottom: 5 },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    height: 44,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    backgroundColor: PALETTE.surface,
    overflow: "hidden",
  },
  chipSelected: {
    borderColor: PALETTE.primary,
    backgroundColor: PALETTE.primary,
  },
  chipText: {
    color: PALETTE.text,
    fontFamily: FONT.semibold,
    fontWeight: "600",
    fontSize: 11,
    lineHeight: 14,
  },
  chipTextSelected: { color: PALETTE.onPrimary },
  currencyScroll: { flexGrow: 0, marginHorizontal: 0 },
  currencyRow: {
    flexDirection: "row",
    gap: 7,
    paddingBottom: 2,
    paddingRight: 12,
  },
  currencyChip: { width: 59 },
  legalHint: {
    marginTop: 7,
    marginHorizontal: 5,
    color: PALETTE.muted,
    textAlign: "center",
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 9.5,
    lineHeight: 13,
  },
  inlineLink: {
    color: PALETTE.muted,
    fontFamily: FONT.semibold,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  actionDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(203,209,239,0.72)",
    backgroundColor: "rgba(236,239,253,0.98)",
  },
  actionDockContent: { width: "100%", maxWidth: 560, alignSelf: "center" },
  primaryButton: {
    width: "100%",
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PALETTE.primary,
    shadowColor: "#181922",
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
    overflow: "hidden",
  },
  primaryButtonInner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: PALETTE.onPrimary,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 18,
    maxWidth: "84%",
  },
  secondaryButton: {
    width: "100%",
    minHeight: 52,
    paddingVertical: 14,
    marginTop: 7,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    backgroundColor: PALETTE.surface,
    overflow: "hidden",
  },
  secondaryButtonText: {
    color: PALETTE.text,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 18,
  },
  privacyPanel: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 16,
    backgroundColor: PALETTE.surface,
    overflow: "hidden",
  },
  privacyRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
  },
  privacyRowBorder: { borderTopWidth: 1, borderTopColor: PALETTE.border },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PALETTE.mintSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyRowCopy: { flex: 1, minWidth: 0 },
  privacyRowTitle: {
    color: PALETTE.text,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 15,
  },
  privacyRowBody: {
    marginTop: 3,
    color: PALETTE.muted,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 10,
    lineHeight: 13.5,
  },
  privacyNote: {
    marginTop: 14,
    marginHorizontal: 2,
    color: PALETTE.muted,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 9.5,
    lineHeight: 13,
  },
  personaSectionLabel: { marginTop: 22 },
  personaSectionLabelAll: { marginTop: 14 },
  personaScenarioLabel: { marginTop: 18 },
  genderRow: { flexDirection: "row", gap: 7 },
  genderChip: { flex: 1 },
  genderChipRegular: { height: 48 },
  genderChipWide: { flex: 1.3 },
  genderChipText: { fontSize: 10 },
  personaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  personaWrap: { position: "relative" },
  personaGlow: {
    position: "absolute",
    zIndex: 0,
    left: 24,
    right: 24,
    bottom: 0,
    height: 22,
    borderRadius: 999,
    overflow: "hidden",
  },
  personaCard: {
    position: "relative",
    zIndex: 1,
    borderWidth: 2,
    borderColor: PALETTE.border,
    borderRadius: 15,
    backgroundColor: PALETTE.surface,
    overflow: "hidden",
  },
  personaCardSelected: {
    borderColor: PALETTE.primary,
    backgroundColor: "#F1F2FD",
  },
  personaTouch: {
    flex: 1,
    position: "relative",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: "stretch",
  },
  personaWash: {
    position: "absolute",
    top: 5,
    left: "20%",
    width: "60%",
    height: "46%",
    borderRadius: 60,
    opacity: 0.74,
  },
  personaImage: { flex: 1, width: "100%", minHeight: 0 },
  personaLabel: {
    minHeight: 34,
    paddingHorizontal: 3,
    color: PALETTE.text,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 13,
    textAlignVertical: "center",
  },
  selectionCheck: {
    position: "absolute",
    top: 9,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PALETTE.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionCheckRight: { right: 9 },
  selectionCheckLeft: { left: 9 },
  showAllButton: {
    width: "100%",
    height: 46,
    marginTop: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    backgroundColor: PALETTE.surface,
    overflow: "hidden",
  },
  showAllButtonCompact: { marginTop: 5 },
  showAllInner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  showAllText: {
    flex: 1,
    color: PALETTE.text,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
  },
  showAllMeta: {
    color: PALETTE.muted,
    fontFamily: FONT.semibold,
    fontWeight: "600",
    fontSize: 11,
    lineHeight: 15,
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 15,
  },
  goalCard: {
    minHeight: 114,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 15,
    backgroundColor: PALETTE.surface,
    overflow: "hidden",
  },
  goalCardSelected: {
    borderWidth: 2,
    borderColor: PALETTE.primary,
    backgroundColor: "#F1F2FD",
  },
  goalCardInner: { flex: 1, padding: 13, alignItems: "flex-start" },
  goalIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  goalCardTitle: {
    width: "100%",
    marginTop: 10,
    color: PALETTE.text,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 15,
  },
  goalCardExample: {
    width: "100%",
    marginTop: 4,
    color: PALETTE.muted,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 9.5,
    lineHeight: 13,
  },
  goalAmounts: {
    marginTop: 13,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 15,
    backgroundColor: PALETTE.surface,
    overflow: "hidden",
  },
  goalAmountRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  goalAmountRowBorder: { borderTopWidth: 1, borderTopColor: PALETTE.border },
  goalAmountCopy: { flex: 1, minWidth: 0 },
  goalAmountTitle: {
    color: PALETTE.text,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 14,
  },
  goalAmountLabel: {
    marginTop: 3,
    color: PALETTE.muted,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 9,
    lineHeight: 12,
  },
  goalAmountInputWrap: {
    width: 112,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    backgroundColor: PALETTE.background,
  },
  goalAmountInputWrapPressed: {
    borderColor: PALETTE.primary,
    backgroundColor: PALETTE.accentSoft,
  },
  goalAmountCurrency: {
    color: PALETTE.muted,
    fontFamily: FONT.semibold,
    fontWeight: "600",
    fontSize: 10,
  },
  goalAmountInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    color: PALETTE.text,
    textAlign: "center",
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 12,
  },
  customGoalPlus: {
    color: PALETTE.muted,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 25,
    lineHeight: 28,
  },
  modalFill: { flex: 1 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: PALETTE.backdrop,
  },
  sheet: {
    width: "100%",
    maxHeight: "84%",
    paddingTop: 10,
    paddingHorizontal: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: PALETTE.surface,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    marginBottom: 16,
    alignSelf: "center",
    borderRadius: 99,
    backgroundColor: PALETTE.border,
  },
  sheetScroll: { flexGrow: 0 },
  sheetScrollContent: { paddingBottom: 2 },
  sheetHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetTitle: {
    flex: 1,
    color: PALETTE.text,
    fontFamily: FONT.extraBold,
    fontWeight: "800",
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.55,
  },
  sheetClose: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: PALETTE.surfaceSoft,
    overflow: "hidden",
  },
  sheetCloseInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  sheetSubtitle: {
    marginTop: 8,
    marginBottom: 5,
    color: PALETTE.muted,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 12,
    lineHeight: 17,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 7,
    color: PALETTE.muted,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 10,
    lineHeight: 13,
  },
  sheetInput: {
    width: "100%",
    height: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 11,
    backgroundColor: PALETTE.background,
    color: PALETTE.text,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 13,
  },
  rtlInput: { textAlign: "right", writingDirection: "rtl" },
  iconPicker: { flexDirection: "row", gap: 8 },
  iconChoice: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 11,
    backgroundColor: PALETTE.background,
    overflow: "hidden",
  },
  iconChoiceSelected: { borderWidth: 2, borderColor: PALETTE.primary },
  iconChoiceText: { fontSize: 21, textAlign: "center", textAlignVertical: "center" },
  sheetAmountInputWrap: {
    width: "100%",
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 11,
    backgroundColor: PALETTE.background,
  },
  sheetAmountCurrency: {
    color: PALETTE.muted,
    fontFamily: FONT.semibold,
    fontWeight: "600",
    fontSize: 12,
  },
  sheetAmountInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    color: PALETTE.text,
    fontFamily: FONT.semibold,
    fontWeight: "600",
    fontSize: 13,
  },
  sheetPrimarySpacing: { marginTop: 19 },
  sheetSecondarySpacing: { marginTop: 0 },
  termsBody: {
    marginTop: 13,
    marginBottom: 16,
    padding: 13,
    borderRadius: 12,
    backgroundColor: PALETTE.background,
  },
  termsHeading: {
    marginBottom: 7,
    color: PALETTE.text,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 15,
  },
  termsParagraph: {
    marginBottom: 10,
    color: PALETTE.muted,
    fontFamily: FONT.regular,
    fontWeight: "400",
    fontSize: 10,
    lineHeight: 14.5,
  },
  termsLink: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  termsLinkRtl: { alignSelf: "flex-end" },
  termsLinkText: {
    color: PALETTE.text,
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 15,
    textDecorationLine: "underline",
  },
});
