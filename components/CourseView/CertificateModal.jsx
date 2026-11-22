import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import Button from '../Shared/Button';
import CelebrationBurst from '../Shared/CelebrationBanner';
import { getCourseQuizPercent } from '../../config/learningStats';
import { notifySuccess, tapLight } from '../../config/haptics';

export default function CertificateModal({ visible, onClose, course, learnerName }) {
  const { colors } = useTheme();
  const quizPct = getCourseQuizPercent(course);
  const totalChapters = Array.isArray(course?.chapters) ? course.chapters.length : 0;
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleShareCertificate = async () => {
    tapLight();
    notifySuccess();
    const lines = [
      `🏆 Certificate of Completion — Best Coach`,
      ``,
      `${learnerName || 'Learner'} completed "${course?.courseTitle || 'Course'}"!`,
      `• Level: ${course?.level || 'Beginner'}`,
      `• Chapters Completed: ${totalChapters}/${totalChapters}`,
      ...(quizPct !== null ? [`• Quiz Score: ${quizPct}%`] : []),
      `• Date: ${dateStr}`,
      ...(course?.docId ? [`\nJoin this course in Best Coach with code: ${course.docId}`] : []),
    ];

    try {
      await Share.share({
        title: `${course?.courseTitle} — Certificate`,
        message: lines.join('\n'),
      });
    } catch {
      // cancelled
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CelebrationBurst active={visible} />

        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Course Completed!
          </Text>
          <Pressable onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.certCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.ribbon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="trophy" size={38} color={colors.amber} />
          </View>

          <Text style={[styles.certEyebrow, { color: colors.primary }]}>
            CERTIFICATE OF COMPLETION
          </Text>
          <Text style={[styles.certSub, { color: colors.textMuted }]}>
            This certifies that
          </Text>
          <Text style={[styles.learnerName, { color: colors.text }]}>
            {learnerName || 'Best Coach Learner'}
          </Text>
          <Text style={[styles.certSub, { color: colors.textMuted }]}>
            has successfully completed
          </Text>
          <Text style={[styles.courseTitle, { color: colors.primary }]}>
            {course?.courseTitle}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>
                {totalChapters} Chapters
              </Text>
              <Text style={[styles.metaLbl, { color: colors.textMuted }]}>Completed</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>
                {course?.level || 'Beginner'}
              </Text>
              <Text style={[styles.metaLbl, { color: colors.textMuted }]}>Level</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>
                {quizPct !== null ? `${quizPct}%` : 'Passed'}
              </Text>
              <Text style={[styles.metaLbl, { color: colors.textMuted }]}>Quiz</Text>
            </View>
          </View>

          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            Awarded on {dateStr} • Best Coach AI
          </Text>
        </View>

        <Button text="Share Certificate" onPress={handleShareCertificate} />
        <Button text="Done" type="outline" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 28 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 24,
  },
  certCard: {
    borderWidth: 2,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    marginBottom: 10,
  },
  ribbon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  certEyebrow: {
    fontFamily: 'outfit-bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  certSub: {
    fontFamily: 'outfit',
    fontSize: 14,
    marginTop: 8,
  },
  learnerName: {
    fontFamily: 'outfit-bold',
    fontSize: 26,
    marginTop: 4,
    textAlign: 'center',
  },
  courseTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaVal: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
  },
  metaLbl: {
    fontFamily: 'outfit',
    fontSize: 12,
    marginTop: 2,
  },
  dateText: {
    fontFamily: 'outfit',
    fontSize: 12,
    marginTop: 18,
  },
});
