import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function Chapters({ course }) {
  const router = useRouter();
  const { colors } = useTheme();
  const completedChapters = Array.isArray(course?.completedChapter)
    ? course.completedChapter
    : [];

  const isChapterCompleted = (index) =>
    completedChapters.includes(parseInt(index, 10));

  return (
    <View style={{ padding: 20, paddingTop: 6 }}>
      <Text style={{ fontFamily: 'outfit-bold', fontSize: 20, color: colors.text }}>Chapters</Text>

      <FlatList
        data={course?.chapters || []}
        scrollEnabled={false}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => {
          const hasCachedLesson =
            Array.isArray(item?.content) && item.content.length > 0;

          return (
            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: '/chapterView',
                  params: {
                    docId: course?.docId ?? '',
                    chapterIndex: String(index),
                    courseTitle: course?.courseTitle ?? '',
                    courseDescription: course?.description ?? '',
                    level: course?.level ?? 'Beginner',
                    style: course?.style ?? 'Hands-on & Examples',
                    sourceNotes: course?.sourceNotes ?? '',
                  },
                });
              }}
              style={[
                styles.chapterItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.chapterInfo}>
                <Text style={[styles.chapterNumber, { color: colors.primary }]}>{index + 1}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chapterName, { color: colors.text }]} numberOfLines={2}>
                    {item?.chapterName}
                  </Text>
                  {!!item?.summary && (
                    <Text style={[styles.chapterSummary, { color: colors.textMuted }]} numberOfLines={2}>
                      {item.summary}
                    </Text>
                  )}
                  <View style={styles.metaRow}>
                    {!!item?.estimatedMinutes && (
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        ~{item.estimatedMinutes} min
                      </Text>
                    )}
                    <Text style={[styles.metaTag, { color: colors.primary }]}>
                      {hasCachedLesson ? 'Lesson ready' : 'Deep lesson on open'}
                    </Text>
                  </View>
                </View>
              </View>
              {isChapterCompleted(index) ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.green} />
              ) : (
                <Ionicons name="play-circle" size={26} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chapterItem: {
    padding: 16,
    borderWidth: 0.7,
    borderColor: '#d1d5db',
    borderRadius: 15,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.WHITE,
  },
  chapterInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  chapterNumber: {
    fontFamily: 'outfit-bold',
    fontSize: 18,
    color: Colors.PRIMARY,
    marginTop: 1,
  },
  chapterName: {
    fontFamily: 'outfit-bold',
    fontSize: 17,
    color: Colors.BLACK,
  },
  chapterSummary: {
    fontFamily: 'outfit',
    fontSize: 14,
    color: Colors.GRAY,
    marginTop: 3,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaText: {
    fontFamily: 'outfit',
    fontSize: 12,
    color: Colors.GRAY,
  },
  metaTag: {
    fontFamily: 'outfit',
    fontSize: 12,
    color: Colors.PRIMARY,
  },
});
