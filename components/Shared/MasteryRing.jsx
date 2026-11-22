import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

export default function MasteryRing({
  percent = 0,
  size = 64,
  strokeWidth = 6,
  label,
}) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const strokeColor = clamped >= 100 ? colors.green : colors.primary;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.cardAlt}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={styles.center}>
            <Text style={[styles.pctText, { color: colors.text }]}>{clamped}%</Text>
          </View>
        </View>
      </View>
      {!!label && (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontFamily: 'outfit-bold',
    fontSize: 14,
  },
  label: {
    fontFamily: 'outfit',
    fontSize: 12,
    marginTop: 4,
  },
});
