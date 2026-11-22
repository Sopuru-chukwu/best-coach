import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const PARTICLE_COLORS = ['#0075ff', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
const PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  id: i,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  leftPct: 6 + ((i * 7) % 88),
  delay: (i % 5) * 90,
  size: 7 + (i % 3) * 3,
}));

export default function CelebrationBurst({ active }) {
  const anims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) return;
    const animations = anims.map((val, idx) => {
      val.setValue(0);
      return Animated.sequence([
        Animated.delay(PARTICLES[idx].delay),
        Animated.timing(val, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]);
    });
    Animated.parallel(animations).start();
  }, [active, anims]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {PARTICLES.map((p, idx) => {
        const translateY = anims[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 150],
        });
        const opacity = anims[idx].interpolate({
          inputRange: [0, 0.2, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        const rotate = anims[idx].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${idx % 2 === 0 ? 220 : -220}deg`],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.dot,
              {
                left: `${p.leftPct}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    overflow: 'hidden',
    zIndex: 10,
  },
  dot: {
    position: 'absolute',
    top: 0,
    borderRadius: 3,
  },
});
