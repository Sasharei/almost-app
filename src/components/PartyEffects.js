import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";

const PartyFirework = ({
  color,
  size = 160,
  delay = 0,
  style = null,
  ringStyle = null,
  iterations = 6,
}) => {
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.2);
    opacity.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 1100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.85,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 880,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(scale, {
          toValue: 0.2,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
      { iterations: Math.max(1, Number(iterations) || 1) }
    );
    animation.start();
    return () => animation.stop();
  }, [delay, iterations, opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        ringStyle,
        style,
        {
          borderColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

export const PartyFireworksLayer = React.memo(function PartyFireworksLayer({
  isDarkMode = false,
  paletteByTheme = { light: [], dark: [] },
  configs = [],
  overlayStyle = null,
  ringStyle = null,
  ringLoopIterations = 6,
}) {
  const palette = useMemo(
    () => (isDarkMode ? paletteByTheme.dark : paletteByTheme.light) || [],
    [isDarkMode, paletteByTheme]
  );

  if (!configs.length || !palette.length) return null;

  return (
    <View pointerEvents="none" style={overlayStyle}>
      {configs.map((config, index) => (
        <PartyFirework
          key={`firework_${index}`}
          color={palette[index % palette.length]}
          size={config.size}
          delay={config.delay}
          iterations={ringLoopIterations}
          ringStyle={ringStyle}
          style={{
            top: config.top,
            bottom: config.bottom,
            left: config.left,
            right: config.right,
          }}
        />
      ))}
    </View>
  );
});

export const PartySparklesLayer = React.memo(function PartySparklesLayer({
  isDarkMode = false,
  count = 18,
  paletteByTheme = { light: [], dark: [] },
  overlayStyle = null,
  sparkleStyle = null,
  loopIterations = 10,
}) {
  const palette = useMemo(
    () => (isDarkMode ? paletteByTheme.dark : paletteByTheme.light) || [],
    [isDarkMode, paletteByTheme]
  );
  const sparkles = useRef(
    Array.from({ length: count }).map((_, idx) => ({
      key: `party_sparkle_${idx}`,
      anim: new Animated.Value(Math.random()),
      size: 6 + Math.random() * 10,
      top: `${6 + Math.random() * 54}%`,
      left: `${8 + Math.random() * 84}%`,
      duration: 900 + Math.random() * 900,
      delay: Math.random() * 700,
      colorIndex: idx,
    }))
  ).current;

  useEffect(() => {
    const loops = sparkles.map(({ anim, duration, delay }) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        { iterations: Math.max(1, Number(loopIterations) || 1) }
      );
      animation.start();
      return animation;
    });
    return () => loops.forEach((animation) => animation?.stop?.());
  }, [loopIterations, sparkles]);

  if (!palette.length) return null;

  return (
    <View pointerEvents="none" style={overlayStyle}>
      {sparkles.map((sparkle) => {
        const scale = sparkle.anim.interpolate({
          inputRange: [0, 0.55, 1],
          outputRange: [0.2, 1, 0.2],
        });
        const opacity = sparkle.anim.interpolate({
          inputRange: [0, 0.2, 0.85, 1],
          outputRange: [0, 0.9, 0.9, 0],
        });
        const color = palette[sparkle.colorIndex % palette.length];
        return (
          <Animated.View
            key={sparkle.key}
            pointerEvents="none"
            style={[
              sparkleStyle,
              {
                top: sparkle.top,
                left: sparkle.left,
                width: sparkle.size,
                height: sparkle.size,
                borderRadius: sparkle.size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
});
