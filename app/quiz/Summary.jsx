import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Alert,
} from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import Button from '../../components/Shared/Button';
import { generateQuizRemediation } from '../../config/AiModel';
import CelebrationBurst from '../../components/Shared/CelebrationBanner';
import { notifySuccess } from '../../config/haptics';
import { useTheme } from '../../context/ThemeContext';
import { getFriendlyErrorMessage } from '../../config/errorMessages';

const firstParam = (v) => (Array.isArray(v) ? v[0] : v);

export default function QuizSummary() {
  const params = useLocalSearchParams();
  const quizResultParam = firstParam(params.quizResultParam);
  const courseTitle = firstParam(params.courseTitle) || '';
  const level = firstParam(params.level) || 'Beginner';
  const courseId = firstParam(params.courseId) || '';
  const router = useRouter();

  const [remediation, setRemediation] = useState('');
  const [loadingRemediation, setLoadingRemediation] = useState(false);
  const { colors } = useTheme();

  const quizResult = useMemo(() => {
    try {
      return quizResultParam ? JSON.parse(quizResultParam) : {};
    } catch {
      return {};
    }
  }, [quizResultParam]);

  const entries = useMemo(() => Object.entries(quizResult || {}), [quizResult]);
  const totalQuestion = entries.length;
  const correctAns = useMemo(
    () => entries.filter(([, value]) => value?.isCorrect === true).length,
    [entries]
  );
  const missedItems = useMemo(
    () => entries.map(([, value]) => value).filter((v) => v && v.isCorrect !== true),
    [entries]
  );

  const percMark =
    totalQuestion > 0 ? Math.round((correctAns / totalQuestion) * 100) : 0;

  useEffect(() => {
    if (percMark >= 60 && totalQuestion > 0) {
      notifySuccess();
    }
  }, [percMark, totalQuestion]);

  const onTeachMissed = async () => {
    if (!missedItems.length || loadingRemediation) return;
    setLoadingRemediation(true);
    try {
      const lesson = await generateQuizRemediation({
        courseTitle,
        missedItems,
        level,
      });
      setRemediation(lesson);
    } catch (err) {
      console.error('Remediation error:', err);
      Alert.alert(
        'Review Unavailable',
        getFriendlyErrorMessage(err, 'Could not prepare your review lesson right now. Please try again.')
      );
    } finally {
      setLoadingRemediation(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
    >
      <CelebrationBurst active={percMark >= 60 && totalQuestion > 0} />
      <ImageBackground
        source={require('./../../assets/images/wave.png')}
        style={styles.headerBackground}
        resizeMode="cover"
      >
        <Text style={styles.headerText}>Quiz Summary</Text>
      </ImageBackground>

      <View style={styles.contentContainer}>
        <View
          style={[
            styles.resultCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Image
            source={require('./../../assets/images/trophy.png')}
            style={styles.trophy}
          />
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {percMark >= 60 ? 'Congratulations!' : 'Keep Practicing!'}
          </Text>
          <Text style={[styles.resultSubtitle, { color: colors.textMuted }]}>
            You scored {percMark}% ({correctAns}/{totalQuestion} correct)
          </Text>

          <View style={styles.statsRow}>
            <View style={[styles.resultTextContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.resultText, { color: colors.text }]}>Q {totalQuestion}</Text>
            </View>
            <View style={[styles.resultTextContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.resultText, { color: colors.text }]}>✅ {correctAns}</Text>
            </View>
            <View style={[styles.resultTextContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.resultText, { color: colors.text }]}>❌ {totalQuestion - correctAns}</Text>
            </View>
          </View>
        </View>

        {missedItems.length > 0 && !remediation && (
          <Button
            text="Teach Me What I Missed"
            onPress={onTeachMissed}
            loading={loadingRemediation}
          />
        )}

        {!!remediation && (
          <View style={styles.remediationCard}>
            <View style={styles.remediationHeader}>
              <Ionicons name="sparkles" size={20} color={Colors.PRIMARY} />
              <Text style={styles.remediationTitle}>Coach Review Lesson</Text>
            </View>
            <Text style={styles.remediationBody}>{remediation}</Text>
          </View>
        )}

        {!!courseId && (
          <Button
            text="Retake Quiz"
            type="outline"
            onPress={() =>
              router.replace({
                pathname: '/quiz',
                params: { courseId },
              })
            }
          />
        )}

        <Button
          text={'Back To Home'}
          type={missedItems.length > 0 && !remediation ? 'outline' : 'fill'}
          onPress={() => router.replace('/(tabs)/home')}
        />

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryHeader}>Answer Breakdown</Text>

          {entries.map(([key, quizItem]) => (
            <View
              key={key}
              style={{
                padding: 15,
                borderWidth: 1,
                marginTop: 8,
                borderRadius: 15,
                backgroundColor:
                  quizItem?.isCorrect === true ? Colors.LIGTH_GREEN : Colors.LIGHT_RED,
                borderColor: quizItem?.isCorrect === true ? Colors.GREEN : Colors.RED,
              }}
            >
              <Text style={styles.questionText}>{quizItem?.question}</Text>
              {quizItem?.isCorrect !== true && !!quizItem?.userChoice && (
                <Text style={styles.wrongChoiceText}>
                  Your answer: {quizItem.userChoice}
                </Text>
              )}
              <Text style={styles.answerText}>Correct: {quizItem?.correctAns}</Text>
              {!!quizItem?.explanation && (
                <Text style={styles.explanationText}>
                  Why: {quizItem.explanation}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 50,
    backgroundColor: Colors.WHITE,
  },
  headerBackground: {
    width: '100%',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 70,
  },
  headerText: {
    fontFamily: 'outfit-bold',
    fontSize: 30,
    color: Colors.WHITE,
    textAlign: 'center',
  },
  contentContainer: {
    padding: 25,
  },
  resultCard: {
    backgroundColor: Colors.WHITE,
    padding: 20,
    borderRadius: 20,
    marginTop: -60,
    alignItems: 'center',
    shadowColor: '#000',
    elevation: 3,
  },
  trophy: {
    width: 100,
    height: 100,
    marginTop: -60,
  },
  resultTitle: {
    fontSize: 22,
    fontFamily: 'outfit-bold',
  },
  resultSubtitle: {
    fontFamily: 'outfit',
    color: Colors.GRAY,
    fontSize: 16,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  resultTextContainer: {
    padding: 14,
    backgroundColor: Colors.WHITE,
    elevation: 1,
    borderRadius: 10,
  },
  resultText: {
    fontFamily: 'outfit',
    fontSize: 18,
  },
  remediationCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
    borderRadius: 14,
  },
  remediationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  remediationTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 18,
    color: Colors.PRIMARY,
  },
  remediationBody: {
    fontFamily: 'outfit',
    fontSize: 15,
    lineHeight: 23,
    color: '#1f2937',
  },
  summaryContainer: {
    marginTop: 25,
  },
  summaryHeader: {
    fontFamily: 'outfit-bold',
    fontSize: 24,
  },
  questionText: {
    fontFamily: 'outfit-bold',
    fontSize: 18,
  },
  wrongChoiceText: {
    fontFamily: 'outfit',
    fontSize: 14,
    color: Colors.RED,
    marginTop: 5,
  },
  answerText: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
    marginTop: 4,
    color: '#14532d',
  },
  explanationText: {
    fontFamily: 'outfit',
    fontSize: 14,
    color: '#374151',
    marginTop: 6,
    lineHeight: 20,
  },
});
