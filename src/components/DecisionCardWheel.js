import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { PracticeTarget } from "./PracticeTutorial";

const BASE_ROW_HEIGHT = 64;

// The search row occupies the leading space above the first selected card.
export default function DecisionCardWheel({ entries, selectedId, onSelect, titleFor, emojiFor, statusFor, colors, label, searchLabel, onSearch, onAdd, addLabel, onInteractionChange, tutorial = null, onEngage }) {
  const { fontScale } = useWindowDimensions();
  const ROW_HEIGHT = Math.ceil(BASE_ROW_HEIGHT * Math.max(1, fontScale));
  const list = useRef(null);
  const offset = useRef(new Animated.Value(0)).current;
  const coasting = useRef(false);
  const scrollSelection = useRef(null);
  const selectedIndex = Math.max(0, entries.findIndex((entry) => entry.id === selectedId));
  const latest = useRef({ entries, selectedId, onSelect, onInteractionChange, onEngage });
  latest.current = { entries, selectedId, onSelect, onInteractionChange, onEngage };
  useEffect(() => {
    if (coasting.current && scrollSelection.current === selectedId) return;
    scrollSelection.current = selectedId;
    coasting.current = false;
    list.current?.scrollTo({ y: selectedIndex * ROW_HEIGHT, animated: false });
  }, [selectedIndex, selectedId, ROW_HEIGHT]);
  useEffect(() => () => latest.current.onInteractionChange?.(false), []);
  const selectAt = (y) => {
    const { entries: current, selectedId: selected, onSelect: select } = latest.current;
    const index = Math.max(0, Math.min(current.length - 1, Math.round(y / ROW_HEIGHT)));
    const entry = current[index];
    if (!entry) return;
    scrollSelection.current = entry.id;
    if (entry.id !== selected) select(entry);
  };
  const settle = (y) => {
    if (!coasting.current) return;
    coasting.current = false;
    selectAt(y);
    latest.current.onInteractionChange?.(false);
  };
  const pick = (entry, index) => {
    coasting.current = false;
    scrollSelection.current = entry.id;
    list.current?.scrollTo({ y: index * ROW_HEIGHT, animated: false });
    onInteractionChange?.(false);
    if (entry.id !== selectedId) onSelect(entry);
    onEngage?.(entry);
  };
  return (
    <View accessibilityElementsHidden={Boolean(tutorial?.active && tutorial.state.stage !== "card")} importantForAccessibility={tutorial?.active && tutorial.state.stage !== "card" ? "no-hide-descendants" : "auto"} testID="decision-card-wheel" accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: entries.length, now: selectedIndex + 1, text: entries[selectedIndex] ? titleFor(entries[selectedIndex]) : "" }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={({ nativeEvent }) => {
        const delta = nativeEvent.actionName === "increment" ? 1 : nativeEvent.actionName === "decrement" ? -1 : 0;
        const entry = entries[selectedIndex + delta];
        if (delta && entry) pick(entry, selectedIndex + delta);
      }} style={{ height: ROW_HEIGHT * 3, overflow: "hidden", borderRadius: 20, backgroundColor: colors.card }}>
      <View pointerEvents="none" style={{ position: "absolute", top: ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT, borderRadius: 16, backgroundColor: colors.primarySurface, borderColor: colors.primary, borderWidth: StyleSheet.hairlineWidth }} />
      <Animated.ScrollView ref={list} nestedScrollEnabled showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
        snapToInterval={ROW_HEIGHT} decelerationRate="fast" bounces={false} scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: offset } } }], { useNativeDriver: true })}
        onScrollBeginDrag={() => { coasting.current = true; onInteractionChange?.(true); }}
        onScrollEndDrag={({ nativeEvent }) => {
          // iOS provides the final snap destination before momentum ends. Release
          // the form now; do not wait for a timer or a second render to accept taps.
          selectAt(nativeEvent.targetContentOffset?.y ?? nativeEvent.contentOffset.y);
          onInteractionChange?.(false);
          if (coasting.current) latest.current.onEngage?.();
        }}
        onMomentumScrollEnd={({ nativeEvent }) => settle(nativeEvent.contentOffset.y)}>
        <Pressable accessibilityElementsHidden={Boolean(tutorial?.active)} importantForAccessibility={tutorial?.active ? "no-hide-descendants" : "auto"} testID="decision-wheel-search" onPress={() => { coasting.current = false; onInteractionChange?.(false); onSearch?.(); }} accessibilityRole="button" accessibilityLabel={searchLabel}
          style={{ height: ROW_HEIGHT, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 23, color: colors.primary }}>⌕</Text>
          <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "600", flex: 1 }}>{searchLabel}</Text>
        </Pressable>
        {entries.map((item, index) => {
          const inputRange = [(index - 1) * ROW_HEIGHT, index * ROW_HEIGHT, (index + 1) * ROW_HEIGHT];
          const status = statusFor?.(item);
          return <Animated.View key={item.id} style={{ height: ROW_HEIGHT, opacity: offset.interpolate({ inputRange, outputRange: [0.65, 1, 0.65], extrapolate: "clamp" }), transform: [{ perspective: 600 }, { rotateX: offset.interpolate({ inputRange, outputRange: ["28deg", "0deg", "-28deg"], extrapolate: "clamp" }) }, { scale: offset.interpolate({ inputRange, outputRange: [0.94, 1, 0.94], extrapolate: "clamp" }) }] }}>
            <PracticeTarget tutorial={tutorial} id={item.id === selectedId ? "practice-card" : `practice-card-${item.id}`} style={{ flex: 1 }}><Pressable onPress={() => pick(item, index)} accessibilityRole="button" accessibilityState={{ selected: item.id === selectedId }} accessibilityLabel={[titleFor(item), status?.time, status?.label].filter(Boolean).join(", ")}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
              <Text style={{ fontSize: 25 }}>{emojiFor(item)}</Text>
              <Text numberOfLines={2} ellipsizeMode="tail" style={{ color: colors.text, flex: 1, fontSize: 17, fontWeight: item.id === selectedId ? "700" : "500" }}>{titleFor(item)}</Text>
              {status ? <View style={{ width: 112, alignItems: "flex-end", gap: 2 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: status.today ? colors.primary : colors.muted, fontWeight: status.today ? "800" : "400", backgroundColor: status.today ? colors.primarySurface : "transparent", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontSize: 12, fontVariant: ["tabular-nums"] }}>{status.time}</Text>
                <Text numberOfLines={2} style={{ color: status.checked ? colors.success : colors.text, textAlign: "right", fontSize: 11, lineHeight: 13 }}>{status.checked ? "✓ " : "○ "}{status.label}</Text>
              </View> : null}
            </Pressable></PracticeTarget>
          </Animated.View>;
        })}
        {onAdd ? <Pressable accessibilityElementsHidden={Boolean(tutorial?.active)} importantForAccessibility={tutorial?.active ? "no-hide-descendants" : "auto"} testID="decision-wheel-add" onPress={() => {
          coasting.current = false;
          onInteractionChange?.(false);
          onAdd();
        }} accessibilityRole="button" accessibilityLabel={addLabel}
          style={{ height: ROW_HEIGHT, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 28, color: colors.primary }}>+</Text>
          <Text numberOfLines={2} ellipsizeMode="tail" style={{ color: colors.primary, fontSize: 17, fontWeight: "600", flex: 1 }}>{addLabel}</Text>
        </Pressable> : null}
        <View style={{ height: ROW_HEIGHT }} />
      </Animated.ScrollView>
    </View>
  );
}
