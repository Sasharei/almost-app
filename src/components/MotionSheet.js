import React, { useEffect, useRef } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import PlatformSurface from './PlatformSurface';
import { useMotionPreferences } from '../hooks/useMotionPreferences';

const AnimatedSurface = Animated.createAnimatedComponent(PlatformSurface);

// Animate the sheet independently of the dimmed backdrop. Keep its real layout
// bounds so long content, safe-area padding and scroll gestures stay intact.
export default function MotionSheet({ visible = true, style, children, ...props }) {
  const { height } = useWindowDimensions();
  const { reduceMotion } = useMotionPreferences();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 120 : visible ? 280 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, visible]);
  return <AnimatedSurface {...props} surfaceRole="sheet" style={[style, {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : Math.min(height * 0.75, 640), 0] }) }],
  }]}>{children}</AnimatedSurface>;
}
