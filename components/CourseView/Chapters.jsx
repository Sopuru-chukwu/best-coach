import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import { useRouter } from 'expo-router';

export default function Chapters({ course }) {
  const router = useRouter();
  const completedChapters = Array.isArray(course?.completedChapter)
    ? course.completedChapter
    : [];

  const isChapterCompleted = (index) => completedChapters.includes(parseInt(index));

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontFamily: 'outfit-bold', fontSize: 20 }}>Chapters</Text>

      <FlatList
        data={course?.chapters || []}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: '/chapterView',
                params: {
                  chapterParams: JSON.stringify(item),
                  docId: course?.docId ?? '',
                  chapterIndex: index,
                },
              });
            }}
            style={styles.chapterItem}
          >
            <View style={styles.chapterInfo}>
              <Text style={styles.chapterText}>{index + 1}. </Text>
              <Text>{item?.chapterName}</Text>
            </View>
            {isChapterCompleted(index) ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.GREEN} />
            ) : (
              <Ionicons name="play" size={24} color={Colors.PRIMARY} />
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chapterItem: {
    padding: 18,
    borderWidth: 0.5,
    borderRadius: 15,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterInfo: {
    flexDirection: 'row',
    gap: 10,
  },
  chapterText: {
    fontFamily: 'outfit',
    fontSize: 20,
  },
});
