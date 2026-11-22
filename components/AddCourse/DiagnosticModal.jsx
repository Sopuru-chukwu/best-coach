import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { generateDiagnosticQuiz } from '../../config/AiModel';
import Button from '../Shared/Button';
import { notifySuccess, tapLight } from '../../config/haptics';

export default function DiagnosticModal({ visible, onClose, topic, onComplete }) {
  const { colors } = useTheme();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});

  const loadQuiz = async () => {
    if (!topic?.trim()) return;
    setLoading(true);
    setError('');
    setAnswers({});
    try {
      const qs = await generateDiagnosticQuiz({ topic: topic.trim() });
      setQuestions(qs);
    } catch (err) {
      setError(err?.message || 'Could not create diagnostic questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadQuiz();
    }
  }, [visible]);

  const handleFinish = () => {
    let correct = 0;
    const summaryParts = [];
    questions.forEach((q, idx) => {
      const ok = answers[idx] === q.correctAns;
      if (ok) correct += 1;
      summaryParts.push(
        `- (${q.difficulty || 'General'}) "${q.question}": ${ok ? 'Mastered' : 'Needs teaching'}`
      );
    });

    const detectedLevel =
      correct >= 3 ? 'Advanced' : correct === 2 ? 'Intermediate' : 'Beginner';

    notifySuccess();
    onComplete?.({
      level: detectedLevel,
      score: correct,
      total: questions.length,
      summary: `Diagnostic score: ${correct}/${questions.length} (${detectedLevel}).\n${summaryParts.join('\n')}`,
    });
    onClose();
  };

  const allAnswered =
    questions.length > 0 && Object.keys(answers).length === questions.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Quick Skill Check</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
              3 quick questions on "{topic}"
            </Text>
          </View>
          <Pressable onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Preparing 3 placement questions...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.loadingText, { color: colors.red }]}>{error}</Text>
            <Button text="Retry" onPress={loadQuiz} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {questions.map((q, qIdx) => (
              <View
                key={qIdx}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.diffTag, { color: colors.primary }]}>
                  Q{qIdx + 1} • {q.difficulty || 'Check'}
                </Text>
                <Text style={[styles.qText, { color: colors.text }]}>{q.question}</Text>
                {(q.options || []).map((opt, oIdx) => {
                  const picked = answers[qIdx] === opt;
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
                          borderColor: picked ? colors.primary : colors.border,
                          backgroundColor: picked ? colors.primarySoft : colors.surface,
                        },
                      ]}
                    >
                      <Text style={[styles.optText, { color: colors.text }]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {allAnswered && (
              <Button text="Apply My Skill Level" onPress={handleFinish} />
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'outfit-bold',
    fontSize: 22,
  },
  sub: {
    fontFamily: 'outfit',
    fontSize: 14,
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontFamily: 'outfit-bold',
    fontSize: 17,
    marginTop: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  diffTag: {
    fontFamily: 'outfit-bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  qText: {
    fontFamily: 'outfit-bold',
    fontSize: 17,
    marginTop: 4,
    marginBottom: 8,
  },
  optBtn: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  optText: {
    fontFamily: 'outfit',
    fontSize: 15,
  },
});
