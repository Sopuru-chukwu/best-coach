import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { generateCourseCheatSheet } from '../../config/AiModel';
import { useTheme } from '../../context/ThemeContext';
import FormattedText from '../Shared/FormattedText';
import Button from '../Shared/Button';
import { copyOrShareText } from '../../config/clipboard';
import { speakText, stopSpeaking } from '../../config/voiceCoach';
import { tapLight } from '../../config/haptics';

export default function CheatSheetModal({ visible, onClose, course }) {
  const { colors } = useTheme();
  const [sheet, setSheet] = useState(course?.cheatSheet || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);

  const loadOrGenerate = async (force = false) => {
    if (!course) return;
    if (!force && (sheet || course.cheatSheet)) {
      setSheet(sheet || course.cheatSheet);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const generated = await generateCourseCheatSheet({
        courseTitle: course.courseTitle,
        description: course.description,
        chapters: course.chapters || [],
        level: course.level || 'Beginner',
        style: course.style || 'Hands-on & Examples',
      });
      setSheet(generated);

      if (course.docId) {
        updateDoc(doc(db, 'Courses', course.docId), {
          cheatSheet: generated,
        }).catch(() => {});
      }
    } catch (err) {
      setError(err?.message || 'Could not generate cheat sheet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadOrGenerate(false);
    } else {
      stopSpeaking();
      setSpeaking(false);
    }
  }, [visible]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const handleToggleSpeech = () => {
    tapLight();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (!sheet) return;
    setSpeaking(true);
    speakText(sheet, {
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const handleShare = () => {
    tapLight();
    copyOrShareText(
      `${course?.courseTitle || 'Course'} — Cheat Sheet\n\n${sheet}`,
      `${course?.courseTitle || 'Course'} Cheat Sheet`
    );
  };

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
            <Text style={[styles.title, { color: colors.text }]}>1-Page Cheat Sheet</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {course?.courseTitle}
            </Text>
          </View>
          <Pressable onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        {!!sheet && !loading && (
          <View style={styles.toolbar}>
            <Pressable
              onPress={handleToggleSpeech}
              style={[
                styles.toolChip,
                { backgroundColor: speaking ? colors.primary : colors.cardAlt },
              ]}
            >
              <Ionicons
                name={speaking ? 'stop-circle' : 'volume-high-outline'}
                size={16}
                color={speaking ? colors.white : colors.text}
              />
              <Text
                style={[
                  styles.toolChipText,
                  { color: speaking ? colors.white : colors.text },
                ]}
              >
                {speaking ? 'Stop' : 'Listen'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={[styles.toolChip, { backgroundColor: colors.cardAlt }]}
            >
              <Ionicons name="share-outline" size={16} color={colors.text} />
              <Text style={[styles.toolChipText, { color: colors.text }]}>Share / Copy</Text>
            </Pressable>

            <Pressable
              onPress={() => loadOrGenerate(true)}
              style={[styles.toolChip, { backgroundColor: colors.primarySoft }]}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={[styles.toolChipText, { color: colors.primary }]}>Refresh</Text>
            </Pressable>
          </View>
        )}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingTitle, { color: colors.text }]}>
              Building your 1-page cheat sheet...
            </Text>
            <Text style={[styles.loadingSub, { color: colors.textMuted }]}>
              Distilling core mental models, formulas, pitfalls, and a revision checklist.
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.red} />
            <Text style={[styles.loadingTitle, { color: colors.text }]}>Generation failed</Text>
            <Text style={[styles.loadingSub, { color: colors.textMuted }]}>{error}</Text>
            <View style={{ width: '100%', marginTop: 12 }}>
              <Button text="Retry" onPress={() => loadOrGenerate(true)} />
            </View>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <FormattedText text={sheet} fontSize={16} />
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
  subtitle: {
    fontFamily: 'outfit',
    fontSize: 14,
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
  },
  toolChipText: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  loadingTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 19,
    marginTop: 14,
    textAlign: 'center',
  },
  loadingSub: {
    fontFamily: 'outfit',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
