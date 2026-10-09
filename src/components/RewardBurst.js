import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useMotionPreferences } from '../hooks/useMotionPreferences';

const glowTexture = require('../../assets/effects/kenney/light_01.png');
const flareTexture = require('../../assets/effects/kenney/flare_01.png');
const sparkleTexture = require('../../assets/effects/kenney/star_04.png');
// Deterministic spread avoids flicker when the parent's reward count updates.
const particles = Array.from({ length: 24 }, (_, index) => {
  const angle = index * 2.399963;
  const radius = 76 + (index % 5) * 19;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius - 32,
    size: 16 + (index % 4) * 5, delay: (index % 4) * 0.045, rotation: `${index * 47}deg` };
});

// Decorative only: granting rewards and completing savings remain owned by the
// existing transaction handlers. One finite native-driver burst per mount.
export default function RewardBurst({ active = true, color = '#FFD788', style }) {
  const { reduceMotion } = useMotionPreferences();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    if (!active || reduceMotion) return undefined;
    const animation = Animated.timing(progress, { toValue: 1, duration: 1500,
      easing: Easing.linear, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [active, progress, reduceMotion]);
  if (!active || reduceMotion) return null;
  const fade = progress.interpolate({ inputRange: [0, 0.08, 0.45, 1], outputRange: [0, 0.85, 0.45, 0] });
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.stage, style]}>
    <Animated.Image source={glowTexture} resizeMode="contain" style={[styles.glow, { tintColor: color, opacity: fade,
      transform: [{ scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.9, 1.3, 1.65] }) }] }]} />
    <Animated.Image source={flareTexture} resizeMode="contain" style={[styles.flare, { tintColor: color,
      opacity: progress.interpolate({ inputRange: [0, 0.06, 0.3, 1], outputRange: [0, 1, 0, 0] }),
      transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.5] }) }] }]} />
    {particles.map((particle, index) => {
      const travel = progress.interpolate({ inputRange: [particle.delay, 0.7 + particle.delay, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
      return <Animated.Image key={index} source={sparkleTexture} resizeMode="contain" style={{ position: 'absolute', width: particle.size, height: particle.size,
        tintColor: index % 3 === 0 ? '#FFFFFF' : color,
        opacity: progress.interpolate({ inputRange: [particle.delay, particle.delay + 0.08, 0.55 + particle.delay, 0.85 + particle.delay], outputRange: [0, 1, 0.75, 0], extrapolate: 'clamp' }),
        transform: [{ translateX: Animated.multiply(travel, particle.x) }, { translateY: Animated.multiply(travel, particle.y) },
          { rotate: particle.rotation }, { scale: travel.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.9, 1.15, 0.7] }) }],
      }} />;
    })}
  </View>;
}
const styles = StyleSheet.create({
  stage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 290, height: 290 },
  flare: { position: 'absolute', width: 340, height: 240 },
});
