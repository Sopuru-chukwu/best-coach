import React, { useCallback, useContext, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { UserDetailContext } from '../../context/UserDetailContext';
import {
  loadAllNotes,
  loadBookmarks,
  saveLessonNote,
  toggleBookmark,
} from '../../config/bookmarksStore';
import { tapLight, tapSelection } from '../../config/haptics';

export default function SavedReviewDeck() {
  const { colors } = useTheme();
  const { userDetail } = useContext(UserDetailContext);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tab, setTab] = useState('bookmarks'); // 'bookmarks' | 'notes'
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);

  const refreshData = useCallback(async () => {
    const [bList, nMap] = await Promise.all([loadBookmarks(), loadAllNotes()]);
    setBookmarks(bList);
    const noteItems = Object.entries(nMap).map(([key, text]) => ({
      key,
      text,
    }));
    setNotes(noteItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  const handleRemoveBookmark = async (item) => {
    tapLight();
    const { bookmarks: next } = await toggleBookmark(item, userDetail?.email || '');
    setBookmarks(next);
  };

  const handleDeleteNote = async (key) => {
    tapLight();
    await saveLessonNote(key, '');
    setNotes((prev) => prev.filter((n) => n.key !== key));
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
        <Text style={[styles.title, { color: colors.text }]}>Saved Review Deck</Text>
      </View>

      <View style={[styles.segmentBar, { backgroundColor: colors.cardAlt }]}>
        {[
          { key: 'bookmarks', label: `Bookmarks (${bookmarks.length})` },
          { key: 'notes', label: `My Notes (${notes.length})` },
        ].map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                tapSelection();
                setTab(item.key);
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

      {tab === 'bookmarks' ? (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 30, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="bookmark-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved lessons yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Tap "Save" in any lesson to build your personal review deck across all courses.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (item.courseId) {
                  router.push({
                    pathname: '/courseView/' + item.courseId,
                    params: { courseId: item.courseId, enroll: 'false' },
                  });
                }
              }}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.courseTag, { color: colors.primary }]}>
                    {item.courseTitle} • {item.chapterName}
                  </Text>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {item.topic}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemoveBookmark(item)} style={{ padding: 4 }}>
                  <Ionicons name="bookmark" size={20} color={colors.amber} />
                </Pressable>
              </View>
              {!!item.keyTakeaway && (
                <Text style={[styles.cardBody, { color: colors.textMuted }]} numberOfLines={3}>
                  {item.keyTakeaway}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: insets.bottom + 30, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No study notes yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Tap "Note" inside any lesson to save your own summaries and memory cues.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.courseTag, { color: colors.primary, flex: 1 }]}>
                  Study Note
                </Text>
                <Pressable onPress={() => handleDeleteNote(item.key)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.red} />
                </Pressable>
              </View>
              <Text style={[styles.cardBody, { color: colors.text, marginTop: 6 }]}>
                {item.text}
              </Text>
            </View>
          )}
        />
      )}
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
    marginBottom: 16,
  },
  title: {
    fontFamily: 'outfit-bold',
    fontSize: 25,
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
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  courseTag: {
    fontFamily: 'outfit-medium',
    fontSize: 12,
  },
  cardTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 18,
    marginTop: 3,
  },
  cardBody: {
    fontFamily: 'outfit',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 20,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: 'outfit',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
});
