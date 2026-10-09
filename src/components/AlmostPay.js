import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { AccessiblePressable as Pressable } from './AccessibleControls';
import PlatformSurface from './PlatformSurface';
import MotionSheet from './MotionSheet';
import { createAlmostPaySequence } from '../utils/almostPaySequence';
import { disableAlmostPayBiometrics, subscribeAlmostPayPreference } from '../utils/almostPayPreference';
import { resolveAlmostPayBiometricMethod } from '../utils/almostPayBiometrics';

const phaseKeys = { idle: 'almostPayConfirm', ready: 'almostPayConfirmAgain', authenticating: 'almostPayAuthenticating', processing: 'almostPayProcessing', success: 'almostPayConfirmed' };
export function AlmostPayConfirmControl({ active = true, onConfirm, colors, t }) {
  const [phase, setPhase] = useState('idle');
  const [method, setMethod] = useState(null);
  const [checking, setChecking] = useState(true);
  const [useScreen, setUseScreen] = useState(false);
  const [screenOnly, setScreenOnly] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const optOutPending = useRef(false);
  useEffect(() => {
    const subscription = subscribeAlmostPayPreference(setScreenOnly);
    let disposed = false;
    subscription.ready.then(() => { if (!disposed) setPreferenceReady(true); }).catch(() => { if (!disposed) { setScreenOnly(true); setPreferenceReady(true); } });
    return () => { disposed = true; subscription.unsubscribe(); };
  }, []);
  const explainOptOut = useCallback(() => {
    if (optOutPending.current) return;
    optOutPending.current = true;
    const tr = translate.current;
    Alert.alert(tr('almostPayOptOutTitle'), tr('almostPayOptOutBody'), [
      { text: tr('almostPayTryBiometrics'), style: 'cancel', onPress: () => { optOutPending.current = false; } },
      { text: tr('almostPayDisableBiometrics'), onPress: async () => {
        try { await disableAlmostPayBiometrics(); setUseScreen(true); }
        catch { setAuthenticationError(true); }
        finally { optOutPending.current = false; }
      } },
    ], { cancelable: false });
  }, []);
  const [authenticationError, setAuthenticationError] = useState(false);
  const sequence = useRef(null);
  const callback = useRef(onConfirm);
  callback.current = onConfirm;
  const translate = useRef(t);
  translate.current = t;
  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    setUseScreen(false);
    setAuthenticationError(false);
    if (!active) return () => { cancelled = true; };
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(), LocalAuthentication.supportedAuthenticationTypesAsync()])
      .then(([hasHardware, enrolled, types]) => {
        if (!cancelled) setMethod(resolveAlmostPayBiometricMethod({ platform: Platform.OS, hasHardware, enrolled, types }));
      }).catch(() => { if (!cancelled) setMethod(null); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [active]);
  const biometric = preferenceReady && !screenOnly && !checking && method && !useScreen;
  useEffect(() => {
    let disposed = false;
    setPhase('idle');
    if (!active) return undefined;
    sequence.current = createAlmostPaySequence({
      authorize: biometric ? async () => {
        setAuthenticationError(false);
        try {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: translate.current(Platform.OS === 'ios' ? 'almostPayBiometricReason' : 'almostPayName'),
            promptSubtitle: translate.current('almostPayNoCharge'),
            promptDescription: translate.current('almostPayBiometricReason'),
            cancelLabel: translate.current('quickCustomCancel'),
            disableDeviceFallback: true,
            fallbackLabel: '',
            biometricsSecurityLevel: 'weak',
            requireConfirmation: true,
          });
          if (disposed) return false;
          if (!result.success && !['app_cancel', 'system_cancel'].includes(result.error)) explainOptOut();
          if (!result.success && !['user_cancel', 'app_cancel', 'system_cancel'].includes(result.error)) setAuthenticationError(true);
          return result.success;
        } catch { if (!disposed) setAuthenticationError(true); return false; }
      } : null,
      onPhase: (next) => {
        setPhase(next);
        if (next === 'idle') return;
        const feedback = Platform.OS === 'android'
          ? Haptics.performAndroidHapticsAsync(next === 'success' ? Haptics.AndroidHaptics.Confirm : next === 'ready' ? Haptics.AndroidHaptics.Context_Click : Haptics.AndroidHaptics.Gesture_Start)
          : next === 'success'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.impactAsync(next === 'ready' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
        feedback.catch(() => {});
      },
      onConfirmed: () => callback.current?.(),
    });
    return () => {
      disposed = true;
      sequence.current?.dispose(); sequence.current = null;
      if (Platform.OS === 'android') LocalAuthentication.cancelAuthenticate().catch(() => {});
    };
  }, [active, biometric, explainOptOut]);
  const busy = ['authenticating', 'processing', 'success'].includes(phase);
  const label = checking || !preferenceReady ? t('almostPayBiometricChecking')
    : phase === 'idle' && biometric ? t('almostPayBiometricConfirm', { method: t(`almostPay${method}`) }) : t(phaseKeys[phase]);
  return (
    <View style={{ gap: 12 }}>
    <Pressable testID="almost-pay-confirm" onPress={() => sequence.current?.press()} disabled={busy || checking || !active || !preferenceReady}
      accessibilityState={{ busy }} style={[styles.confirm, { backgroundColor: colors.primary }]}>
      {busy && phase !== 'success' || checking ? <ActivityIndicator color={colors.onPrimary} /> : null}
      <Text accessibilityLiveRegion="polite" style={[styles.confirmText, { color: colors.onPrimary }]}>
        {phase === 'success' ? '✓  ' : ''}{label}
      </Text>
    </Pressable>
    {authenticationError || !screenOnly && !checking && !method ? <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: colors.muted }]}>{t(authenticationError ? 'almostPayBiometricRetry' : 'almostPayBiometricUnavailable')}</Text> : null}
    {biometric && !busy ? <Pressable testID="almost-pay-use-screen" onPress={explainOptOut} style={styles.cancel}>
      <Text style={[styles.notice, { color: colors.primary }]}>{t('almostPayWithoutBiometrics')}</Text>
    </Pressable> : null}
    </View>
  );
}

export function useAlmostPayConfirmation() {
  const [request, setRequest] = useState(null);
  const pending = useRef(null);
  const closingTimer = useRef(null);
  const settling = useRef(null);
  const confirm = useCallback((details) => {
    if (pending.current || settling.current) return Promise.resolve(false);
    return new Promise((resolve) => { pending.current = resolve; setRequest(details); });
  }, []);
  const finish = useCallback((accepted) => {
    const resolve = pending.current;
    if (!resolve) return;
    pending.current = null;
    settling.current = resolve;
    clearTimeout(closingTimer.current);
    setRequest(null);
    // Let the native sheet dismiss before the original result/goal modal opens.
    closingTimer.current = setTimeout(() => { settling.current = null; resolve(accepted); }, 180);
  }, []);
  useEffect(() => () => {
    clearTimeout(closingTimer.current);
    pending.current?.(false);
    settling.current?.(false);
    pending.current = null;
    settling.current = null;
  }, []);
  return { request, confirm, finish };
}

export function AlmostPaySheet({ request, onConfirm, onCancel, colors, t }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!request} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} accessible={false} />
        <MotionSheet visible={!!request} style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(20, insets.bottom) }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={[styles.brand, { color: colors.text }]}>{t('almostPayName')}</Text>
            <Text style={[styles.notice, { color: colors.muted }]}>{t('almostPayNoCharge')}</Text>
            <PlatformSurface surfaceRole="card" style={[styles.summary, { backgroundColor: colors.background }]}>
              <Text numberOfLines={3} accessibilityLabel={request?.title} style={[styles.title, { color: colors.text }]}>{request?.title}</Text>
              {request?.amountLabel ? <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.65} style={[styles.amount, { color: colors.text }]}>{request.amountLabel}</Text> : null}
              {request?.summaryLines?.map((line, index) => <Text key={index} style={[styles.title, { color: colors.text }]}>{line}</Text>)}
              <Text style={[styles.notice, { color: colors.muted }]}>{request?.actionLabel || t(request?.action === 'spend' ? 'almostPaySpend' : 'almostPaySave')}</Text>
            </PlatformSurface>
            <AlmostPayConfirmControl active={!!request} onConfirm={onConfirm} colors={colors} t={t} />
            <Pressable testID="almost-pay-cancel" onPress={onCancel} style={styles.cancel}>
              <Text style={[styles.title, { color: colors.primary }]}>{t('quickCustomCancel')}</Text>
            </Pressable>
          </ScrollView>
        </MotionSheet>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, maxHeight: '90%' },
  content: { paddingHorizontal: 24, gap: 16 },
  brand: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  notice: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  summary: { padding: 20, borderRadius: 20, gap: 12 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  amount: { fontSize: 34, fontWeight: '700', textAlign: 'center' },
  confirm: { minHeight: 56, borderRadius: 18, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  cancel: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center' },
});
