import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { tapLight, tapSelection } from '../../config/haptics';

/**
 * Interactive coach-mark walkthrough modal with animated target pointer.
 * Each step: { title, description, tip, icon, position?: 'top-right' | 'top' | 'middle' | 'bottom' | 'center', actionLabel?: string, onAction?: () => void }
 */
export default function CoachMarkTour({
  visible,
  steps = [],
  onFinish,
  onSkipAll,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setStepIndex(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.18,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  if (!visible || !steps.length) return null;

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex === steps.length - 1;
  const pos = step.position || 'center';

  const containerJustify =
    pos === 'top' || pos === 'top-right'
      ? 'flex-start'
      : pos === 'bottom'
        ? 'flex-end'
        : 'center';

  const handleNext = () => {
    tapLight();
    if (isLast) {
      onFinish?.();
      step.onAction?.();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    tapSelection();
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onFinish}
    >
      <View
        style={[
          styles.backdrop,
          {
            justifyContent: containerJustify,
            paddingTop: insets.top + 68,
            paddingBottom: insets.bottom + 78,
          },
        ]}
      >
        {(pos === 'top-right' || pos === 'top') && (
          <View
            style={[
              styles.pointerRow,
              { justifyContent: pos === 'top-right' ? 'flex-end' : 'center' },
            ]}
          >
            <Animated.View
              style={[
                styles.pointerBadge,
                { backgroundColor: colors.primary, transform: [{ scale: pulse }] },
              ]}
            >
              <Ionicons name="arrow-up" size={20} color={colors.white} />
              <Text style={styles.pointerText}>Tap here</Text>
            </Animated.View>
          </View>
        )}

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.primary },
          ]}
        >
          <View style={styles.topMeta}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
              <Ionicons
                name={step.icon || 'sparkles'}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepCounter, { color: colors.primary }]}>
                STEP {stepIndex + 1} OF {steps.length}
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>
            </View>
            <Pressable
              onPress={() => {
                tapSelection();
                onSkipAll ? onSkipAll() : onFinish?.();
              }}
              style={{ padding: 4 }}
            >
              <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
            </Pressable>
          </View>

          <Text style={[styles.desc, { color: colors.text }]}>{step.description}</Text>

          {!!step.tip && (
            <View
              style={[
                styles.tipBox,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons name="hand-left-outline" size={16} color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.primary }]}>{step.tip}</Text>
            </View>
          )}

          <View style={styles.dotsRow}>
            {steps.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      idx === stepIndex ? colors.primary : colors.border,
                    width: idx === stepIndex ? 20 : 7,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.btnRow}>
            {stepIndex > 0 && (
              <TouchableOpacity
                onPress={handleBack}
                style={[
                  styles.secondaryBtn,
                  { borderColor: colors.border, backgroundColor: colors.cardAlt },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleNext}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryBtnText}>
                {isLast ? step.actionLabel || 'Got It!' : 'Next'}
              </Text>
              <Ionicons
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={18}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>
        </View>

        {pos === 'bottom' && (
          <View style={[styles.pointerRow, { justifyContent: 'center', marginTop: 10, marginBottom: 0 }]}>
            <Animated.View
              style={[
                styles.pointerBadge,
                { backgroundColor: colors.primary, transform: [{ scale: pulse }] },
              ]}
            >
              <Ionicons name="arrow-down" size={20} color={colors.white} />
              <Text style={styles.pointerText}>Explore tabs below</Text>
            </Animated.View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    paddingHorizontal: 20,
  },
  pointerRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  pointerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    elevation: 4,
  },
  pointerText: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
    color: '#ffffff',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounter: {
    fontFamily: 'outfit-bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: 'outfit-bold',
    fontSize: 20,
    marginTop: 2,
  },
  skipText: {
    fontFamily: 'outfit-medium',
    fontSize: 14,
  },
  desc: {
    fontFamily: 'outfit',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    marginTop: 12,
  },
  tipText: {
    flex: 1,
    fontFamily: 'outfit-medium',
    fontSize: 13,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    height: 7,
    borderRadius: 99,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryBtn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 13,
  },
  primaryBtnText: {
    fontFamily: 'outfit-bold',
    fontSize: 16,
    color: '#ffffff',
  },
});
