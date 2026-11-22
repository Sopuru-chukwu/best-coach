import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

function PulseBlock({ style }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ backgroundColor: colors.cardAlt, opacity, borderRadius: 10 }, style]}
    />
  );
}

export function CourseCardSkeleton({ count = 3 }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 16 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <PulseBlock style={{ width: '100%', height: 120, borderRadius: 12 }} />
          <PulseBlock style={{ width: '72%', height: 18, marginTop: 12 }} />
          <PulseBlock style={{ width: '48%', height: 14, marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

export function LessonSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ width: '100%', marginTop: 22 }}>
      <PulseBlock style={{ width: '68%', height: 26, marginBottom: 16 }} />
      <View
        style={[
          styles.lessonCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <PulseBlock style={{ width: '35%', height: 14, marginBottom: 10 }} />
        <PulseBlock style={{ width: '100%', height: 14, marginBottom: 8 }} />
        <PulseBlock style={{ width: '88%', height: 14 }} />
      </View>
      <PulseBlock style={{ width: '100%', height: 14, marginBottom: 8 }} />
      <PulseBlock style={{ width: '96%', height: 14, marginBottom: 8 }} />
      <PulseBlock style={{ width: '82%', height: 14, marginBottom: 18 }} />
      <PulseBlock style={{ width: '100%', height: 95, borderRadius: 14 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  lessonCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
});
