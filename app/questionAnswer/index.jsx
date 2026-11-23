import { View, Text, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import Colors from './../../constant/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import AskCoachModal from '../../components/ChapterView/AskCoachModal';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateCachedCourse } from '../../config/courseStore';
import { withRouteCourse } from '../../components/Shared/withRouteCourse';

function QuestionAnswer({ course }) {

  const qaList = Array.isArray(course?.qa) ? course.qa : [];
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [coachTopic, setCoachTopic] = useState(null);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const OnQuestionSelect = (index) => {
    const isOpening = selectedQuestion !== index;
    setSelectedQuestion(isOpening ? index : null);

    if (isOpening && course?.docId) {
      updateDoc(doc(db, 'Courses', course.docId), {
        reviewedQa: arrayUnion(index),
      }).catch(() => {});
      updateCachedCourse(course.docId, (prev) => ({
        reviewedQa: [...new Set([...(prev.reviewedQa || []), index])],
      }));
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <Image
        source={require('./../../assets/images/wave.png')}
        style={{
          position: 'absolute',
          height: 800,
          width: '100%',
          opacity: isDark ? 0.55 : 1,
        }}
      />

      <View
        style={{
          width: '100%',
          padding: 20,
          paddingTop: insets.top + 14,
        }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 7,
            alignItems: 'center',
          }}
        >
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </Pressable>
          <Text
            style={{
              fontFamily: 'outfit-bold',
              fontSize: 28,
              color: colors.white,
            }}
          >
            Questions & Answers
          </Text>
        </View>
        <Text
          style={{
            fontFamily: 'outfit',
            color: colors.white,
            fontSize: 20,
            marginTop: 5,
          }}
        >
          {course?.courseTitle}
        </Text>

        {qaList.map((item, index) => (
          <Pressable
            key={index}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={() => OnQuestionSelect(index)}
          >
            <Text style={{ fontFamily: 'outfit-bold', fontSize: 19, color: colors.text }}>
              {item?.question}
            </Text>
            {selectedQuestion === index && (
              <View style={{ borderTopWidth: 0.6, borderTopColor: colors.border, marginTop: 12, paddingTop: 10 }}>
                <Text
                  style={{
                    fontFamily: 'outfit',
                    fontSize: 16,
                    color: colors.green,
                    lineHeight: 23,
                  }}
                >
                  Answer: {item?.answer}
                </Text>

                <Pressable
                  style={[styles.askCoachBtn, { backgroundColor: colors.primarySoft }]}
                  onPress={() =>
                    setCoachTopic({
                      topic: item?.question,
                      explain: item?.answer,
                    })
                  }
                >
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={[styles.askCoachText, { color: colors.primary }]}>
                    Ask Coach to explain deeper
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <AskCoachModal
        visible={Boolean(coachTopic)}
        onClose={() => setCoachTopic(null)}
        courseTitle={course?.courseTitle}
        chapterName="Questions & Answers"
        currentLesson={coachTopic}
        level={course?.level || 'Beginner'}
        style={course?.style || 'Hands-on & Examples'}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    backgroundColor: Colors.WHITE,
    marginTop: 14,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  askCoachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
  },
  askCoachText: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
    color: Colors.PRIMARY,
  },
});

export default withRouteCourse(QuestionAnswer);
