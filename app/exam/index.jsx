import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { UserDetailContext } from '../../context/UserDetailContext';
import Button from '../../components/Shared/Button';
import { gradeFeynmanExplanation } from '../../config/AiModel';
import { recordStudyActivity } from '../../config/learningStats';
import { notifySuccess, tapLight, tapSelection } from '../../config/haptics';
import { getFriendlyErrorMessage } from '../../config/errorMessages';

function formatSeconds(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ExamScreen() {
  const { courseParams } = useLocalSearchParams();
  const { colors } = useTheme();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const course = useMemo(() => {
    try {
      const raw = Array.isArray(courseParams) ? courseParams[0] : courseParams;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [courseParams]);

  const [mode, setMode] = useState('exam'); // 'exam' | 'feynman'

  // Timed Exam state
  const questions = Array.isArray(course?.quiz) ? course.quiz : [];
  const totalSeconds = Math.max(60, questions.length * 60);
  const [examStarted, setExamStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [answers, setAnswers] = useState({});
  const [submittingExam, setSubmittingExam] = useState(false);

  // Feynman Check state
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0);
  const [explanationInput, setExplanationInput] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);

  useEffect(() => {
    if (!examStarted || mode !== 'exam') return;
    if (secondsLeft <= 0) {
      submitExam();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, mode, secondsLeft]);

  const submitExam = async () => {
    if (submittingExam || !questions.length) return;
    setSubmittingExam(true);
    setExamStarted(false);

    const resultMap = {};
    questions.forEach((q, idx) => {
      const choice = answers[idx] ?? 'Unanswered';
      resultMap[idx] = {
        userChoice: choice,
        isCorrect: q?.correctAns === choice,
        question: q?.question,
        correctAns: q?.correctAns,
        explanation: q?.explanation || '',
      };
    });

    try {
      if (course?.docId) {
        await updateDoc(doc(db, 'Courses', course.docId), {
          quizResult: resultMap,
        });
      }
      await recordStudyActivity(userDetail, setUserDetail);
    } catch (err) {
      console.error('Exam save error:', err);
    } finally {
      setSubmittingExam(false);
      router.replace({
        pathname: '/quiz/Summary',
        params: {
          quizResultParam: JSON.stringify(resultMap),
          courseTitle: course?.courseTitle || '',
          level: course?.level || 'Beginner',
          courseParams: JSON.stringify(course),
        },
      });
    }
  };

  const handleGradeFeynman = async () => {
    if (explanationInput.trim().length < 15) {
      Alert.alert(
        'Write a bit more',
        'Explain the concept in at least 1–2 sentences so your coach can grade it accurately.'
      );
      return;
    }

    const chapter = chapters[selectedChapterIdx];
    setGrading(true);
    setGradeResult(null);
    try {
      const result = await gradeFeynmanExplanation({
        courseTitle: course?.courseTitle || 'Course',
        concept: chapter?.chapterName || course?.courseTitle || 'Core Concept',
        referenceSummary: chapter?.summary || course?.description || '',
        userExplanation: explanationInput.trim(),
        level: course?.level || 'Beginner',
      });
      setGradeResult(result);
      notifySuccess();
      recordStudyActivity(userDetail, setUserDetail);
    } catch (err) {
      console.error('Feynman grading error:', err);
      Alert.alert(
        'Grading Unavailable',
        getFriendlyErrorMessage(err, 'Could not grade your explanation right now. Please try again.')
      );
    } finally {
      setGrading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Exam & Feynman Lab</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {course?.courseTitle}
          </Text>
        </View>
        {mode === 'exam' && examStarted && (
          <View
            style={[
              styles.timerPill,
              {
                backgroundColor: secondsLeft <= 30 ? colors.redSoft : colors.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={secondsLeft <= 30 ? colors.red : colors.primary}
            />
            <Text
              style={[
                styles.timerText,
                { color: secondsLeft <= 30 ? colors.red : colors.primary },
              ]}
            >
              {formatSeconds(secondsLeft)}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.segmentBar, { backgroundColor: colors.cardAlt }]}>
        {[
          { key: 'exam', label: 'Timed Exam' },
          { key: 'feynman', label: 'Feynman Check' },
        ].map((item) => {
          const active = mode === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                tapSelection();
                setMode(item.key);
              }}
              style={[
                styles.segmentBtn,
                active && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.white : colors.text },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'exam' ? (
          !examStarted ? (
            <View
              style={[
                styles.introCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="timer-outline" size={42} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text, marginTop: 10 }]}>
                Ready for a Timed Mock Exam?
              </Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                {questions.length} questions • {formatSeconds(totalSeconds)} total time.
                No hints until you submit—then get a full breakdown and AI review.
              </Text>
              <Button
                text="Start Timed Exam"
                onPress={() => {
                  tapLight();
                  setSecondsLeft(totalSeconds);
                  setAnswers({});
                  setExamStarted(true);
                }}
              />
            </View>
          ) : (
            <View>
              {questions.map((q, qIdx) => (
                <View
                  key={qIdx}
                  style={[
                    styles.questionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.qNum, { color: colors.primary }]}>
                    Question {qIdx + 1} of {questions.length}
                  </Text>
                  <Text style={[styles.qText, { color: colors.text }]}>{q.question}</Text>
                  {(q.options || []).map((opt, oIdx) => {
                    const selected = answers[qIdx] === opt;
                    return (
                      <TouchableOpacity
                        key={oIdx}
                        onPress={() => {
                          tapLight();
                          setAnswers((prev) => ({ ...prev, [qIdx]: opt }));
                        }}
                        style={[
                          styles.optBtn,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primarySoft : colors.surface,
                          },
                        ]}
                      >
                        <Text style={[styles.optText, { color: colors.text }]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <Button
                text={`Submit Exam (${Object.keys(answers).length}/${questions.length} answered)`}
                onPress={submitExam}
                loading={submittingExam}
              />
            </View>
          )
        ) : (
          <View>
            <View
              style={[
                styles.questionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Explain It In Your Own Words
              </Text>
              <Text style={[styles.cardSub, { color: colors.textMuted, textAlign: 'left' }]}>
                Pick a chapter and teach the core idea back to your AI coach. Teaching from memory is the fastest way to spot hidden gaps.
              </Text>

              {chapters.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, marginTop: 12 }}
                >
                  {chapters.map((ch, idx) => {
                    const active = selectedChapterIdx === idx;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          tapSelection();
                          setSelectedChapterIdx(idx);
                          setGradeResult(null);
                        }}
                        style={[
                          styles.chapChip,
                          {
                            backgroundColor: active ? colors.primary : colors.cardAlt,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chapChipText,
                            { color: active ? colors.white : colors.text },
                          ]}
                        >
                          {idx + 1}. {ch?.chapterName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <TextInput
                value={explanationInput}
                onChangeText={setExplanationInput}
                placeholder="Explain this concept simply as if teaching a friend..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={[
                  styles.feynmanInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              <Button
                text="Grade My Explanation"
                onPress={handleGradeFeynman}
                loading={grading}
              />
            </View>

            {gradeResult && (
              <View
                style={[
                  styles.questionCard,
                  { backgroundColor: colors.card, borderColor: colors.primary },
                ]}
              >
                <View style={styles.scoreRow}>
                  <Text style={[styles.scoreNum, { color: gradeResult.score >= 70 ? colors.green : colors.amber }]}>
                    {gradeResult.score}/100
                  </Text>
                  <Text style={[styles.verdictText, { color: colors.text, flex: 1 }]}>
                    {gradeResult.verdict}
                  </Text>
                </View>

                {gradeResult.strengths.length > 0 && (
                  <View style={[styles.feedbackBox, { backgroundColor: colors.greenSoft }]}>
                    <Text style={[styles.feedbackTitle, { color: colors.green }]}>
                      What you nailed
                    </Text>
                    {gradeResult.strengths.map((s, i) => (
                      <Text key={i} style={[styles.feedbackLine, { color: colors.text }]}>
                        • {s}
                      </Text>
                    ))}
                  </View>
                )}

                {gradeResult.gaps.length > 0 && (
                  <View style={[styles.feedbackBox, { backgroundColor: colors.amberSoft }]}>
                    <Text style={[styles.feedbackTitle, { color: colors.amber }]}>
                      Gaps to tighten up
                    </Text>
                    {gradeResult.gaps.map((g, i) => (
                      <Text key={i} style={[styles.feedbackLine, { color: colors.text }]}>
                        • {g}
                      </Text>
                    ))}
                  </View>
                )}

                {!!gradeResult.improvedExplanation && (
                  <View style={[styles.feedbackBox, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.feedbackTitle, { color: colors.primary }]}>
                      Model Explanation
                    </Text>
                    <Text style={[styles.feedbackLine, { color: colors.text }]}>
                      {gradeResult.improvedExplanation}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
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
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  timerText: {
    fontFamily: 'outfit-bold',
    fontSize: 14,
  },
  segmentBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentText: {
    fontFamily: 'outfit-bold',
    fontSize: 14,
  },
  introCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 20,
  },
  cardSub: {
    fontFamily: 'outfit',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  questionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  qNum: {
    fontFamily: 'outfit-bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  qText: {
    fontFamily: 'outfit-bold',
    fontSize: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  optBtn: {
    padding: 13,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
  },
  optText: {
    fontFamily: 'outfit',
    fontSize: 15,
  },
  chapChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  chapChipText: {
    fontFamily: 'outfit-medium',
    fontSize: 13,
  },
  feynmanInput: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 130,
    fontFamily: 'outfit',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  scoreNum: {
    fontFamily: 'outfit-bold',
    fontSize: 30,
  },
  verdictText: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
    lineHeight: 21,
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  feedbackTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 14,
    marginBottom: 4,
  },
  feedbackLine: {
    fontFamily: 'outfit',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
});
