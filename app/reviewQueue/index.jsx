import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Progress from 'react-native-progress';
import { useTheme } from '../../context/ThemeContext';
import { UserDetailContext } from '../../context/UserDetailContext';
import { recordCardReview } from '../../config/spacedRepetition';
import { recordStudyActivity } from '../../config/learningStats';
import { notifySuccess, notifyWarning, tapLight } from '../../config/haptics';
import Button from '../../components/Shared/Button';
import CelebrationBurst from '../../components/Shared/CelebrationBanner';

const SCREEN_WIDTH = Dimensions.get('screen').width;

export default function ReviewQueue() {
  const { cardsParam } = useLocalSearchParams();
  const { colors } = useTheme();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const initialCards = useMemo(() => {
    try {
      const raw = Array.isArray(cardsParam) ? cardsParam[0] : cardsParam;
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [cardsParam]);

  const [queue, setQueue] = useState(initialCards);
  const [completedCount, setCompletedCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const currentCard = queue[0];
  const totalStart = initialCards.length;

  const flipCard = () => {
    tapLight();
    const next = !flipped;
    setFlipped(next);
    Animated.spring(anim, {
      toValue: next ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleRate = async (quality) => {
    if (!currentCard) return;
    if (quality === 'again') {
      notifyWarning();
    } else {
      notifySuccess();
      recordStudyActivity(userDetail, setUserDetail);
    }

    await recordCardReview(currentCard.key, quality);

    setFlipped(false);
    anim.setValue(0);

    if (quality === 'again') {
      // Re-queue card at the end of this session so learner practices it again
      setQueue((prev) => (prev.length > 1 ? [...prev.slice(1), prev[0]] : prev));
    } else {
      setCompletedCount((prev) => prev + 1);
      setQueue((prev) => prev.slice(1));
    }
  };

  const frontRotate = anim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = anim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const done = queue.length === 0;
  const progress = totalStart > 0 ? Math.min(1, completedCount / totalStart) : 1;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 14 },
      ]}
    >
      <CelebrationBurst active={done && totalStart > 0} />

      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Daily Review Queue</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {done ? 'All due cards reviewed!' : `${queue.length} due card${queue.length === 1 ? '' : 's'} remaining`}
          </Text>
        </View>
      </View>

      <Progress.Bar
        progress={progress}
        width={SCREEN_WIDTH - 44}
        color={done ? colors.green : colors.primary}
        unfilledColor={colors.cardAlt}
        borderWidth={0}
        height={8}
      />

      {done ? (
        <View style={styles.doneBox}>
          <View style={[styles.doneIcon, { backgroundColor: colors.greenSoft }]}>
            <Ionicons name="checkmark-done" size={44} color={colors.green} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>
            Review Complete!
          </Text>
          <Text style={[styles.doneSub, { color: colors.textMuted }]}>
            Your spaced-repetition intervals are updated. Come back tomorrow to lock in long-term retention.
          </Text>
          <View style={{ width: '100%', marginTop: 18 }}>
            <Button text="Back to Home" onPress={() => router.replace('/(tabs)/home')} />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'space-between', paddingBottom: Math.max(insets.bottom, 20) }}>
          <View style={{ marginTop: 22 }}>
            <Text style={[styles.courseTag, { color: colors.primary }]}>
              {currentCard.courseTitle}
            </Text>

            <Pressable onPress={flipCard} style={styles.cardWrapper}>
              <Animated.View
                style={[
                  styles.cardFace,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
                  },
                ]}
              >
                <Text style={[styles.cardSideTag, { color: colors.textMuted }]}>PROMPT</Text>
                <Text style={[styles.frontText, { color: colors.text }]}>
                  {currentCard.front}
                </Text>
                <Text style={[styles.hintText, { color: colors.primary }]}>
                  Tap to reveal answer
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.cardFace,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    transform: [{ perspective: 1000 }, { rotateY: backRotate }],
                  },
                ]}
              >
                <Text style={[styles.cardSideTag, { color: 'rgba(255,255,255,0.75)' }]}>
                  ANSWER
                </Text>
                <Text style={styles.backText}>{currentCard.back}</Text>
              </Animated.View>
            </Pressable>
          </View>

          <View>
            <Text style={[styles.ratePrompt, { color: colors.textMuted }]}>
              How well did you recall this?
            </Text>
            <View style={styles.rateRow}>
              <Pressable
                style={[styles.rateBtn, { backgroundColor: colors.redSoft, borderColor: colors.red }]}
                onPress={() => handleRate('again')}
              >
                <Text style={[styles.rateLabel, { color: colors.red }]}>Again</Text>
                <Text style={[styles.rateSub, { color: colors.red }]}>Today</Text>
              </Pressable>

              <Pressable
                style={[styles.rateBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                onPress={() => handleRate('good')}
              >
                <Text style={[styles.rateLabel, { color: colors.primary }]}>Good</Text>
                <Text style={[styles.rateSub, { color: colors.primary }]}>
                  {currentCard.intervalDays >= 3 ? `${Math.round(currentCard.intervalDays * 2)}d` : '3d'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.rateBtn, { backgroundColor: colors.greenSoft, borderColor: colors.green }]}
                onPress={() => handleRate('easy')}
              >
                <Text style={[styles.rateLabel, { color: colors.green }]}>Easy</Text>
                <Text style={[styles.rateSub, { color: colors.green }]}>
                  {currentCard.intervalDays >= 4 ? `${Math.round(currentCard.intervalDays * 3)}d` : '4d+'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  title: {
    fontFamily: 'outfit-bold',
    fontSize: 22,
  },
  subtitle: {
    fontFamily: 'outfit',
    fontSize: 13,
  },
  courseTag: {
    fontFamily: 'outfit-bold',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  cardWrapper: {
    width: '100%',
    height: 360,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  cardSideTag: {
    position: 'absolute',
    top: 18,
    fontFamily: 'outfit-bold',
    fontSize: 11,
    letterSpacing: 1.3,
  },
  frontText: {
    fontFamily: 'outfit-bold',
    fontSize: 23,
    textAlign: 'center',
    lineHeight: 31,
  },
  backText: {
    fontFamily: 'outfit',
    fontSize: 21,
    textAlign: 'center',
    color: '#ffffff',
    lineHeight: 29,
  },
  hintText: {
    position: 'absolute',
    bottom: 18,
    fontFamily: 'outfit-medium',
    fontSize: 14,
  },
  ratePrompt: {
    fontFamily: 'outfit',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  rateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rateBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  rateLabel: {
    fontFamily: 'outfit-bold',
    fontSize: 16,
  },
  rateSub: {
    fontFamily: 'outfit',
    fontSize: 12,
    marginTop: 2,
  },
  doneBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  doneIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doneTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 25,
  },
  doneSub: {
    fontFamily: 'outfit',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
