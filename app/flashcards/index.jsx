import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  Dimensions,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import * as Progress from 'react-native-progress';
import { db } from '../../config/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { generateMoreFlashcards } from '../../config/AiModel';
import { notifySuccess, notifyWarning, tapLight } from '../../config/haptics';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { speakText, stopSpeaking } from '../../config/voiceCoach';
import { UserDetailContext } from '../../context/UserDetailContext';
import { recordStudyActivity } from '../../config/learningStats';
import { makeCardKey, recordCardReview } from '../../config/spacedRepetition';
import { getFriendlyErrorMessage } from '../../config/errorMessages';

const SCREEN_WIDTH = Dimensions.get('screen').width;
const CARD_WIDTH = SCREEN_WIDTH - 50;

function FlashcardItem({ front, back, mastered }) {
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggleFlip = () => {
    tapLight();
    const nextFlipped = !flipped;
    setFlipped(nextFlipped);
    Animated.spring(anim, {
      toValue: nextFlipped ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const frontRotate = anim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = anim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <Pressable onPress={toggleFlip} style={styles.cardWrapper}>
      <Animated.View
        style={[
          styles.cardFace,
          styles.frontCard,
          { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
        ]}
      >
        {mastered && (
          <View style={styles.masteredPill}>
            <Ionicons name="checkmark-circle" size={15} color={Colors.GREEN} />
            <Text style={styles.masteredPillText}>Mastered</Text>
          </View>
        )}
        <Text style={styles.frontText}>{front}</Text>
        <Text style={styles.tapHint}>Tap card to flip</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.cardFace,
          styles.backCard,
          { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
        ]}
      >
        <Text style={styles.backText}>{back}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function Flashcards() {
  const { courseParams } = useLocalSearchParams();
  const router = useRouter();
  const initialCourse = useMemo(() => {
    try {
      const raw = Array.isArray(courseParams) ? courseParams[0] : courseParams;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [courseParams]);

  const [course, setCourse] = useState(initialCourse);
  const flashcards = Array.isArray(course?.flashcards) ? course.flashcards : [];
  const [masteredIndices, setMasteredIndices] = useState(
    Array.isArray(initialCourse?.masteredFlashcards)
      ? initialCourse.masteredFlashcards
      : []
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const toggleSpeakCard = () => {
    tapLight();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const card = flashcards[currentPage];
    if (!card) return;
    setSpeaking(true);
    speakText(`${card.front || ''}. Answer: ${card.back || ''}`, {
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const persistMastered = async (nextMastered) => {
    setMasteredIndices(nextMastered);
    if (course?.docId) {
      await updateDoc(doc(db, 'Courses', course.docId), {
        masteredFlashcards: nextMastered,
      }).catch(() => {});
    }
  };

  const advanceCard = () => {
    if (currentPage < flashcards.length - 1) {
      const next = currentPage + 1;
      setCurrentPage(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  const markCard = async (isMastered) => {
    const activeCard = flashcards[currentPage];
    if (activeCard) {
      recordCardReview(
        makeCardKey(course?.docId || course?.courseTitle, currentPage, activeCard.front),
        isMastered ? 'good' : 'again'
      );
    }
    if (isMastered) {
      notifySuccess();
      recordStudyActivity(userDetail, setUserDetail);
    } else {
      notifyWarning();
    }
    const nextMastered = isMastered
      ? [...new Set([...masteredIndices, currentPage])]
      : masteredIndices.filter((i) => i !== currentPage);
    await persistMastered(nextMastered);
    advanceCard();
  };

  const onGenerateMore = async () => {
    if (!course || generatingMore) return;
    setGeneratingMore(true);
    try {
      const newCards = await generateMoreFlashcards({
        courseTitle: course.courseTitle,
        chapters: course.chapters || [],
        existingFronts: flashcards.map((c) => c?.front).filter(Boolean),
        level: course.level || 'Beginner',
      });
      const updatedCards = [...flashcards, ...newCards];
      setCourse((prev) => ({ ...prev, flashcards: updatedCards }));

      if (course.docId) {
        await updateDoc(doc(db, 'Courses', course.docId), {
          flashcards: updatedCards,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Flashcards generation error:', err);
      Alert.alert(
        'Could Not Add Cards',
        getFriendlyErrorMessage(err, 'Could not generate more flashcards right now. Please try again.')
      );
    } finally {
      setGeneratingMore(false);
    }
  };

  const onScroll = (event) => {
    if (!flashcards.length) return;
    stopSpeaking();
    setSpeaking(false);
    const rawIndex = Math.round(event?.nativeEvent?.contentOffset.x / CARD_WIDTH);
    const clampedIndex = Math.max(0, Math.min(flashcards.length - 1, rawIndex));
    setCurrentPage(clampedIndex);
  };

  const masteryProgress = flashcards.length
    ? Math.min(1, masteredIndices.length / flashcards.length)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Image
        source={require('./../../assets/images/wave.png')}
        style={{
          position: 'absolute',
          height: 800,
          width: '100%',
          opacity: isDark ? 0.55 : 1,
        }}
      />

      <View style={{ flex: 1, padding: 25, paddingTop: insets.top + 14 }}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.WHITE} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.counterText}>
              {flashcards.length ? `${currentPage + 1} of ${flashcards.length}` : '0 of 0'}
            </Text>
            <Text style={styles.masteryLabel}>
              {masteredIndices.length}/{flashcards.length} mastered
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={toggleSpeakCard} style={styles.moreBtn}>
              <Ionicons
                name={speaking ? 'stop-circle' : 'volume-high-outline'}
                size={18}
                color={Colors.WHITE}
              />
            </Pressable>
            <Pressable
              onPress={onGenerateMore}
              disabled={generatingMore}
              style={styles.moreBtn}
            >
              {generatingMore ? (
                <ActivityIndicator size="small" color={Colors.WHITE} />
              ) : (
                <Ionicons name="add" size={18} color={Colors.WHITE} />
              )}
              <Text style={styles.moreBtnText}>More</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <Progress.Bar
            progress={masteryProgress}
            width={CARD_WIDTH}
            color={Colors.WHITE}
            unfilledColor="rgba(255,255,255,0.3)"
            borderWidth={0}
            height={10}
          />
        </View>

        <FlatList
          ref={listRef}
          data={flashcards}
          keyExtractor={(_, index) => String(index)}
          horizontal={true}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH,
            offset: CARD_WIDTH * index,
            index,
          })}
          style={{ marginTop: 28, flexGrow: 0 }}
          renderItem={({ item, index }) => (
            <FlashcardItem
              front={item?.front}
              back={item?.back}
              mastered={masteredIndices.includes(index)}
            />
          )}
        />

        {flashcards.length > 0 && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, styles.learningBtn]}
              onPress={() => markCard(false)}
            >
              <Ionicons name="refresh" size={20} color="#b45309" />
              <Text style={[styles.actionText, { color: '#b45309' }]}>
                Still Learning
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.gotItBtn]}
              onPress={() => markCard(true)}
            >
              <Ionicons name="checkmark-circle" size={20} color={Colors.WHITE} />
              <Text style={[styles.actionText, { color: Colors.WHITE }]}>
                Got It!
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    fontFamily: 'outfit-bold',
    fontSize: 22,
    color: Colors.WHITE,
  },
  masteryLabel: {
    fontFamily: 'outfit',
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  moreBtnText: {
    fontFamily: 'outfit-bold',
    fontSize: 14,
    color: Colors.WHITE,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: 380,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  frontCard: {
    backgroundColor: Colors.WHITE,
  },
  backCard: {
    backgroundColor: Colors.PRIMARY,
  },
  masteredPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  masteredPillText: {
    fontFamily: 'outfit-bold',
    fontSize: 12,
    color: Colors.GREEN,
  },
  frontText: {
    fontFamily: 'outfit-bold',
    fontSize: 24,
    textAlign: 'center',
    color: Colors.BLACK,
  },
  backText: {
    fontFamily: 'outfit',
    fontSize: 22,
    textAlign: 'center',
    color: Colors.WHITE,
    lineHeight: 30,
  },
  tapHint: {
    position: 'absolute',
    bottom: 18,
    fontFamily: 'outfit',
    fontSize: 14,
    color: Colors.GRAY,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    elevation: 2,
  },
  learningBtn: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  gotItBtn: {
    backgroundColor: Colors.GREEN,
  },
  actionText: {
    fontFamily: 'outfit-bold',
    fontSize: 16,
  },
});
