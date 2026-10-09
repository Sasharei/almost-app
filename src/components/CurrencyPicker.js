import React, { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccessiblePressable as Pressable } from './AccessibleControls';
import { CURRENCY_SIGNS } from '../constants/economyConfig';
import { THEMES } from '../constants/themeConfig';
import { isRtlLanguage } from '../utils/language';
import { getCurrencyOptions, getCurrencySelectorCopy } from '../utils/currencySelector';

function Icon({ kind, color, rtl = false }) {
  const paths = { back: rtl ? 'M9 4l8 8-8 8' : 'M15 4l-8 8 8 8', chevron: rtl ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6', search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', clear: 'M6 6l12 12M6 18L18 6', check: 'M5 12l4 4L19 6' };
  return <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d={paths[kind]} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function CurrencyRow({ option, colors, rtl, onSelect }) {
  return (
    <Pressable onPress={() => onSelect(option.code)} accessibilityRole="button"
      accessibilityLabel={`${option.name}, ${option.code}`} accessibilityState={{ selected: option.selected }}
      style={({ pressed }) => [styles.row, rtl && styles.reverse, { backgroundColor: option.selected ? colors.primarySurface : colors.card, opacity: pressed ? 0.7 : 1 }]}>
      <Text accessible={false} style={[styles.symbol, { color: colors.muted }]}>{CURRENCY_SIGNS[option.code]?.trim() || option.code}</Text>
      <Text style={[styles.name, rtl && styles.right, { color: colors.text, fontWeight: option.selected ? '700' : '500' }]}>{option.name}</Text>
      <Text style={[styles.code, { color: colors.muted }]}>{option.code}</Text>
      <View style={styles.check}>{option.selected ? <Icon kind="check" color={colors.primary} /> : null}</View>
    </Pressable>
  );
}

export function CurrencyPicker({ language, currency, codes, colors = THEMES.light, onSelect, onBack, onTap, topInset = 0, bottomInset = 0 }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const copy = getCurrencySelectorCopy(language);
  const rtl = isRtlLanguage(language);
  const options = useMemo(() => getCurrencyOptions({ codes, language, query, selectedCurrency: currency }), [codes, language, query, currency]);
  const searching = query.trim().length > 0;
  const selected = searching ? null : options.find((option) => option.selected);
  const rows = selected ? options.filter((option) => !option.selected) : options;
  const select = (code) => { Keyboard.dismiss(); onTap?.('tap', { skipCooldown: true }); onSelect?.(code); onBack?.(); };
  const clear = () => { setQuery(''); inputRef.current?.focus(); };
  const section = (label) => <Text accessibilityRole="header" style={[styles.section, rtl && styles.right, { color: colors.muted }]}>{label}</Text>;
  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.content, { paddingTop: topInset + 4 }]}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={copy.back} style={[styles.back, rtl && styles.backRtl]}>
          <Icon kind="back" color={colors.primary} rtl={rtl} /><Text style={[styles.backText, { color: colors.primary }]}>{copy.back}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, rtl && styles.right, { color: colors.text }]}>{copy.title}</Text>
        <View style={[styles.search, rtl && styles.reverse, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon kind="search" color={colors.muted} />
          <TextInput ref={inputRef} value={query} onChangeText={setQuery} placeholder={copy.search} accessibilityLabel={copy.search}
            placeholderTextColor={colors.muted} selectionColor={colors.primary} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss} style={[styles.input, { color: colors.text, textAlign: rtl ? 'right' : 'left' }]} />
          {query.length > 0 ? <Pressable onPress={clear} accessibilityLabel={copy.clear} style={styles.clear}><Icon kind="clear" color={colors.muted} /></Pressable> : null}
        </View>
        <FlatList data={rows} keyExtractor={(option) => option.code} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: Math.max(24, bottomInset), flexGrow: 1 }} initialNumToRender={12}
          ListHeaderComponent={!searching ? <>{selected ? <>{section(copy.selected)}<View style={styles.group}><CurrencyRow option={selected} {...{ colors, rtl }} onSelect={select} /></View></> : null}{section(copy.all)}</> : <View style={{ height: 16 }} />}
          renderItem={({ item }) => <CurrencyRow option={item} {...{ colors, rtl }} onSelect={select} />}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />}
          ListEmptyComponent={searching ? <View style={styles.empty}>
            <Text accessibilityLiveRegion="polite" style={[styles.emptyText, { color: colors.text }]}>{copy.empty}</Text>
            <Pressable onPress={clear} style={[styles.emptyButton, { backgroundColor: colors.primary }]}><Text style={[styles.emptyButtonText, { color: colors.onPrimary }]}>{copy.clear}</Text></Pressable>
          </View> : null} />
      </View>
    </KeyboardAvoidingView>
  );
}

export function CurrencySelectorField({ language, currency, codes, colors = THEMES.light, onCurrencyChange, onTap }) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const triggerRef = useRef(null);
  const copy = getCurrencySelectorCopy(language);
  const name = copy.names[currency] || currency;
  const rtl = isRtlLanguage(language);
  const close = () => { Keyboard.dismiss(); setVisible(false); };
  const restoreFocus = () => { const handle = findNodeHandle(triggerRef.current); if (handle) AccessibilityInfo.setAccessibilityFocus(handle); };
  return <>
    <Pressable ref={triggerRef} onPress={() => setVisible(true)} accessibilityRole="button" accessibilityLabel={`${copy.title}, ${name}, ${currency}`}
      style={({ pressed }) => [styles.field, rtl && styles.reverse, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
      <Text accessible={false} style={[styles.symbol, { color: colors.muted }]}>{CURRENCY_SIGNS[currency]?.trim() || currency}</Text>
      <Text style={[styles.name, rtl && styles.right, { color: colors.text }]}>{name}</Text>
      <Text style={[styles.code, { color: colors.muted }]}>{currency}</Text><Icon kind="chevron" color={colors.muted} rtl={rtl} />
    </Pressable>
    <Modal visible={visible} animationType="none" presentationStyle="fullScreen" onRequestClose={close} onDismiss={restoreFocus}>
      {visible ? <CurrencyPicker language={language} currency={currency} codes={codes} colors={colors} onTap={onTap} onSelect={onCurrencyChange} onBack={close} topInset={insets.top} bottomInset={insets.bottom} /> : null}
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 18 },
  back: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }, backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 29, fontWeight: '800', marginTop: 8, marginBottom: 20 },
  search: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 }, clear: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginEnd: -8 },
  section: { fontSize: 13, fontWeight: '600', marginTop: 24, marginBottom: 10 }, group: { borderRadius: 12, overflow: 'hidden' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 14 },
  symbol: { width: 44, fontSize: 16, textAlign: 'center', writingDirection: 'ltr' }, name: { flex: 1, fontSize: 16, lineHeight: 22 },
  code: { fontSize: 13, fontWeight: '600', minWidth: 36, textAlign: 'center', writingDirection: 'ltr' }, check: { width: 22, alignItems: 'center' },
  backRtl: { flexDirection: 'row-reverse', alignSelf: 'flex-end' }, reverse: { flexDirection: 'row-reverse' }, right: { textAlign: 'right' },
  field: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  empty: { paddingVertical: 44, alignItems: 'center', gap: 20 }, emptyText: { fontSize: 17, textAlign: 'center' },
  emptyButton: { minHeight: 48, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 12 }, emptyButtonText: { fontSize: 16, fontWeight: '600' },
});
