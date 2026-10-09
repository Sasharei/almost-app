import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { ScrollView } from "react-native";

// Overview/focus contain one header, not a collection of card rows. Keep the
// feed's scrolling API without asking VirtualizedList to measure empty cells.
export default forwardRef(function OverviewFeedScroll({
  ListHeaderComponent, ListFooterComponent, style, contentContainerStyle,
  keyboardShouldPersistTaps, keyboardDismissMode, scrollEnabled,
  showsVerticalScrollIndicator, directionalLockEnabled, nestedScrollEnabled,
  scrollEventThrottle, onScroll, onScrollBeginDrag, onScrollEndDrag,
  onMomentumScrollBegin, onMomentumScrollEnd,
}, ref) {
  const scroll = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToOffset: ({ offset = 0, animated = true }) => scroll.current?.scrollTo({ y: offset, animated }),
    scrollToIndex: ({ animated = true }) => scroll.current?.scrollTo({ y: 0, animated }),
    scrollToEnd: (options) => scroll.current?.scrollToEnd(options),
    setNativeProps: (props) => scroll.current?.setNativeProps(props),
  }), []);
  return (
    <ScrollView ref={scroll} style={style} contentContainerStyle={contentContainerStyle}
      contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps} keyboardDismissMode={keyboardDismissMode}
      scrollEnabled={scrollEnabled} showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      directionalLockEnabled={directionalLockEnabled} nestedScrollEnabled={nestedScrollEnabled}
      scrollEventThrottle={scrollEventThrottle} onScroll={onScroll}
      onScrollBeginDrag={onScrollBeginDrag} onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollBegin={onMomentumScrollBegin} onMomentumScrollEnd={onMomentumScrollEnd}>
      {ListHeaderComponent}
      {ListFooterComponent}
    </ScrollView>
  );
});
