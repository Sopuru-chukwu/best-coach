import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';
import Colors from '../../constant/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

function getPracticeStatus(course, optionName) {
  if (optionName === 'Quiz') {
    const entries = course?.quizResult ? Object.values(course.quizResult) : [];
    if (entries.length > 0) {
      const correct = entries.filter((e) => e?.isCorrect === true).length;
      const pct = Math.round((correct / entries.length) * 100);
      return { completed: true, label: `Last score: ${pct}%` };
    }
    const count = Array.isArray(course?.quiz) ? course.quiz.length : 0;
    return { completed: false, label: `${count} questions` };
  }

  if (optionName === 'Flashcards') {
    const total = Array.isArray(course?.flashcards) ? course.flashcards.length : 0;
    const mastered = Array.isArray(course?.masteredFlashcards)
      ? course.masteredFlashcards.length
      : 0;
    return {
      completed: total > 0 && mastered >= total,
      inProgress: mastered > 0 && mastered < total,
      label: total > 0 ? `${mastered}/${total} mastered` : '0 cards',
    };
  }

  const totalQa = Array.isArray(course?.qa) ? course.qa.length : 0;
  const reviewed = Array.isArray(course?.reviewedQa) ? course.reviewedQa.length : 0;
  return {
    completed: totalQa > 0 && reviewed >= totalQa,
    inProgress: reviewed > 0 && reviewed < totalQa,
    label: reviewed > 0 ? `${reviewed}/${totalQa} reviewed` : `${totalQa} Q&As`,
  };
}

export default function CourseListGrid({ courseList, option }) {
  const router = useRouter();

  const onPress = (course) => {
    router.push({
      pathname: option.path,
      params: {
        courseParams: JSON.stringify(course),
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={courseList}
        keyExtractor={(item, index) => item?.docId || String(index)}
        numColumns={2}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const status = getPracticeStatus(item, option?.name);
          const badgeColor = status.completed
            ? Colors.GREEN
            : status.inProgress
              ? Colors.PRIMARY
              : '#cbd5e1';

          return (
            <TouchableOpacity onPress={() => onPress(item)} style={styles.card}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={badgeColor}
                style={styles.checkIcon}
              />
              <Image
                source={option?.icon}
                resizeMode="contain"
                style={{ width: '100%', height: 64 }}
              />
              <Text style={styles.title} numberOfLines={2}>
                {item?.courseTitle}
              </Text>
              <Text
                style={[
                  styles.statusText,
                  status.completed && { color: Colors.GREEN },
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: Colors.WHITE,
    margin: 7,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  checkIcon: {
    position: 'absolute',
    top: 10,
    right: 12,
  },
  title: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    color: Colors.BLACK,
  },
  statusText: {
    fontFamily: 'outfit',
    fontSize: 12,
    color: Colors.GRAY,
    marginTop: 4,
  },
});
