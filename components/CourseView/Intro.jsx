import { View, Text, Image, Pressable, Alert, StyleSheet, Share } from 'react-native';
import React, { useContext, useState, useMemo } from 'react';
import { getBannerImage } from '../../constant/Options';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import Button from './../../components/Shared/Button';
import { useRouter } from 'expo-router';
import { UserDetailContext } from './../../context/UserDetailContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CheatSheetModal from './CheatSheetModal';
import CertificateModal from './CertificateModal';
import { tapLight } from '../../config/haptics';

export default function Intro({ course, enroll, goHome, startOrContinue }) {
  const router = useRouter();
  const { userDetail } = useContext(UserDetailContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);

  const handleShareCourse = async () => {
    tapLight();
    const chaptersText = (course?.chapters || [])
      .map((ch, idx) => `${idx + 1}. ${ch?.chapterName}`)
      .join('\n');
    const message =
      `📚 Check out this course on Best Coach: "${course?.courseTitle}"\n\n` +
      `${course?.description || ''}\n\n` +
      (chaptersText ? `Chapters:\n${chaptersText}\n\n` : '') +
      (course?.docId ? `Course Code: ${course.docId}\n(Open Explore → Join with Code in Best Coach)` : '');

    try {
      await Share.share({
        title: course?.courseTitle || 'Best Coach Course',
        message,
      });
    } catch {
      // cancelled
    }
  };

  const isEnrollMode = enroll === 'true' || enroll === true;
  const completedChapters = Array.isArray(course?.completedChapter)
    ? course.completedChapter
    : [];

  const status = useMemo(() => {
    if (isEnrollMode) return 'not_enrolled';
    if (!course?.chapters?.length) return 'no_content';
    if (completedChapters.length === 0) return 'enrolled_not_started';
    if (completedChapters.length < course.chapters.length) return 'in_progress';
    return 'completed';
  }, [isEnrollMode, course, completedChapters]);

  const buttonLabel = {
    not_enrolled: 'Enroll Now',
    no_content: 'Start',
    enrolled_not_started: 'Start Now',
    in_progress: 'Continue',
    completed: 'Review Course',
  }[status];

  const handlePrimary = async () => {
    if (status === 'not_enrolled') {
      await onEnrollCourse();
      return;
    }

    if (!course?.chapters?.length) {
      Alert.alert('No Content', 'This course does not have any chapters yet.');
      return;
    }

    const total = course.chapters.length;
    const completedSet = new Set(completedChapters.map(Number));
    let firstIncomplete = 0;

    for (let i = 0; i < total; i++) {
      if (!completedSet.has(i)) {
        firstIncomplete = i;
        break;
      }
    }

    if (status === 'completed') firstIncomplete = 0;

    startOrContinue?.(firstIncomplete);
  };

  const onEnrollCourse = async () => {
    const docId = Date.now().toString();
    setLoading(true);
    try {
      const data = {
        ...course,
        docId,
        createdBy: userDetail?.email ?? null,
        createdOn: new Date(),
        enrolled: true,
        completedChapter: [],
      };
      await setDoc(doc(db, 'Courses', docId), data);
      router.push({
        pathname: '/courseView/' + docId,
        params: {
          courseParams: JSON.stringify(data),
          enroll: 'false',
          courseId: docId,
        },
      });
    } catch (error) {
      console.error('Error enrolling in course:', error);
      Alert.alert('Error', 'Could not enroll in this course.');
    } finally {
      setLoading(false);
    }
  };

  const objectives = Array.isArray(course?.learningObjectives)
    ? course.learningObjectives
    : [];

  return (
    <View>
      <Image
        source={getBannerImage(course?.banner_image)}
        style={{ width: '100%', height: 260 }}
      />
      <View style={{ padding: 20 }}>
        <Text style={{ fontFamily: 'outfit-bold', fontSize: 25, color: colors.text }}>
          {course?.courseTitle}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.chapterCount}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
            <Text style={{ fontFamily: 'outfit', fontSize: 16, color: colors.primary }}>
              {course?.chapters?.length ?? 0} Chapters
            </Text>
          </View>
          {!!course?.level && (
            <Text style={[styles.badge, { backgroundColor: colors.primarySoft, color: colors.primary }]}>
              {course.level}
            </Text>
          )}
          {!!course?.style && (
            <Text style={[styles.badge, { backgroundColor: colors.primarySoft, color: colors.primary }]}>
              {course.style}
            </Text>
          )}
        </View>

        {status !== 'not_enrolled' && course?.chapters?.length > 0 && (
          <Text
            style={{
              fontFamily: 'outfit',
              fontSize: 15,
              marginTop: 6,
              color: colors.textMuted,
            }}
          >
            {completedChapters.length}/{course.chapters.length} chapters completed
          </Text>
        )}

        <Text style={{ fontFamily: 'outfit-bold', fontSize: 20, marginTop: 12, color: colors.text }}>
          Description
        </Text>
        <Text style={{ fontFamily: 'outfit', color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 4 }}>
          {course?.description}
        </Text>

        {objectives.length > 0 && (
          <View style={[styles.objectivesBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.objectivesTitle, { color: colors.text }]}>What you'll master</Text>
            {objectives.map((obj, idx) => (
              <View key={idx} style={styles.objectiveRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.green} />
                <Text style={[styles.objectiveText, { color: colors.text }]}>{obj}</Text>
              </View>
            ))}
          </View>
        )}

        <Button text={buttonLabel} loading={loading} onPress={handlePrimary} />

        {status === 'completed' && (
          <Button
            text="View Completion Certificate 🏆"
            type="outline"
            onPress={() => {
              tapLight();
              setCertOpen(true);
            }}
          />
        )}

        {!isEnrollMode && (
          <Button
            text="1-Page Cheat Sheet"
            type="outline"
            onPress={() => setCheatSheetOpen(true)}
          />
        )}
      </View>

      <CheatSheetModal
        visible={cheatSheetOpen}
        onClose={() => setCheatSheetOpen(false)}
        course={course}
      />

      <CertificateModal
        visible={certOpen}
        onClose={() => setCertOpen(false)}
        course={course}
        learnerName={userDetail?.name}
      />

      <Pressable
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 14,
          padding: 8,
          backgroundColor: colors.card,
          borderRadius: 99,
        }}
        onPress={goHome}
      >
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      <Pressable
        style={{
          position: 'absolute',
          top: insets.top + 10,
          right: 14,
          padding: 8,
          backgroundColor: colors.card,
          borderRadius: 99,
        }}
        onPress={handleShareCourse}
        accessibilityLabel="Share course"
      >
        <Ionicons name="share-outline" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  chapterCount: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#eef5ff',
    color: Colors.PRIMARY,
    fontFamily: 'outfit',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  objectivesBox: {
    marginTop: 14,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  objectivesTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 16,
    marginBottom: 8,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  objectiveText: {
    fontFamily: 'outfit',
    fontSize: 14,
    color: '#334155',
    flex: 1,
    lineHeight: 20,
  },
});
