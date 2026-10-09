import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccessiblePressable as Pressable } from './AccessibleControls';
import PlatformSurface from './PlatformSurface';
import RewardBurst from './RewardBurst';
import { UI_RADIUS, UI_SPACING, UI_TOUCH_TARGET } from '../constants/designSystem';

// Presentation only. Queue ownership, sharing and reward accounting stay with
// the caller. The backdrop is a sibling so scrolling cannot dismiss the result.
export default function ResultDialog({ colors, title, body, image, onClose, closeLabel, children, testID }) {
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 720 || fontScale >= 1.3;
  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={onClose} accessible={false} importantForAccessibility="no" />
      <PlatformSurface opaque surfaceRole="sheet" testID={testID}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ScrollView bounces={false} contentContainerStyle={styles.content}>
          <View style={[styles.hero, { height: compact ? 104 : 144, backgroundColor: colors.surfaceMuted }]}>
            <RewardBurst color={colors.primary} />
            {image ? <Image source={image} resizeMode="contain" style={{ width: compact ? 88 : 120, height: compact ? 88 : 120 }} accessible={false} /> : null}
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
          {body ? <Text style={[styles.body, { color: colors.muted }]}>{body}</Text> : null}
          <View style={styles.actions}>
            <Pressable testID={`${testID}-continue`} accessibilityRole="button" onPress={onClose}
              style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={[styles.actionText, { color: colors.onPrimary }]}>{closeLabel}</Text>
            </Pressable>
            {children}
          </View>
        </ScrollView>
      </PlatformSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: UI_SPACING.md },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.46)' },
  card: { width: '100%', maxWidth: 420, maxHeight: '100%', flexShrink: 1, borderRadius: UI_RADIUS.sheet, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  content: { padding: UI_SPACING.lg, gap: UI_SPACING.sm },
  hero: { borderRadius: UI_RADIUS.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: UI_SPACING.xs },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  actions: { gap: UI_SPACING.xs, marginTop: UI_SPACING.sm },
  primary: { minHeight: Math.max(52, UI_TOUCH_TARGET.current), borderRadius: UI_RADIUS.control, alignItems: 'center', justifyContent: 'center', padding: UI_SPACING.md },
  actionText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
