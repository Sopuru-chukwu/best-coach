import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from './../../config/firebaseConfig';
import { CourseCategory, getBannerImage } from './../../constant/Options';
import { UserDetailContext } from './../../context/UserDetailContext';
import { useTheme } from './../../context/ThemeContext';
import Button from './../../components/Shared/Button';
import { CourseCardSkeleton } from './../../components/Shared/SkeletonLoader';
import { tapLight, tapSelection } from './../../config/haptics';
import { getFriendlyErrorMessage } from './../../config/errorMessages';
import { courseRouteParams } from '../../config/courseStore';
import { getCreatedMillis } from '../../config/courseUtils';

const ALL_CATEGORIES = ['All', ...CourseCategory];
const SORT_MODES = [
  { key: 'trending', label: 'Trending' },
  { key: 'newest', label: 'Newest' },
  { key: 'enrolled', label: 'Most Enrolled' },
];

export default function Explore() {
  const { userDetail } = useContext(UserDetailContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('trending');
  const [joinOpen, setJoinOpen] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoinByCode = async () => {
    const trimmed = courseCode.trim();
    if (!trimmed) {
      Alert.alert('Enter Course Code', 'Paste a shared Course Code to open that course.');
      return;
    }

    setJoining(true);
    try {
      const snap = await getDoc(doc(db, 'Courses', trimmed));
      if (!snap.exists()) {
        Alert.alert('Not Found', 'No course was found with that code. Check the code and try again.');
        return;
      }
      const data = { ...snap.data(), docId: snap.id };
      const isMine = (data.createdBy || '').toLowerCase() === userEmail;
      setJoinOpen(false);
      setCourseCode('');
      router.push({
        pathname: '/courseView/' + data.docId,
        params: {
          ...courseRouteParams(data),
          enroll: String(!isMine),
        },
      });
    } catch (err) {
      console.error('Join by code error:', err);
      Alert.alert(
        'Could Not Open Course',
        getFriendlyErrorMessage(err, 'Could not look up that course code. Please check your connection and try again.')
      );
    } finally {
      setJoining(false);
    }
  };

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'Courses'));
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ ...docSnap.data(), docId: docSnap.id });
      });
      setAllCourses(list);
    } catch (error) {
      console.error('Error loading explore courses:', error);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCourses();
    }, [fetchCourses])
  );

  const userEmail = (userDetail?.email || '').toLowerCase();

  const ownedTitles = useMemo(() => {
    const set = new Set();
    for (const c of allCourses) {
      if ((c.createdBy || '').toLowerCase() === userEmail && c.courseTitle) {
        set.add(c.courseTitle.toLowerCase().trim());
      }
    }
    return set;
  }, [allCourses, userEmail]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const seen = new Set();

    const matched = allCourses.filter((course) => {
      const catMatch =
        selectedCategory === 'All' || course.category === selectedCategory;
      if (!catMatch) return false;

      const textMatch =
        !q ||
        (course.courseTitle || '').toLowerCase().includes(q) ||
        (course.description || '').toLowerCase().includes(q) ||
        (course.category || '').toLowerCase().includes(q) ||
        (course.level || '').toLowerCase().includes(q);
      if (!textMatch) return false;

      const titleKey = (course.courseTitle || course.docId).toLowerCase().trim();
      const isMine = (course.createdBy || '').toLowerCase() === userEmail;
      if (seen.has(titleKey)) return false;
      if (!isMine && ownedTitles.has(titleKey)) return false;

      seen.add(titleKey);
      return true;
    });

    return matched.sort((a, b) => {
      const aLikes = Array.isArray(a.likedBy) ? a.likedBy.length : 0;
      const bLikes = Array.isArray(b.likedBy) ? b.likedBy.length : 0;
      const aEnroll = Number(a.enrollCount) || 0;
      const bEnroll = Number(b.enrollCount) || 0;

      if (sortBy === 'newest') {
        return getCreatedMillis(b.createdOn) - getCreatedMillis(a.createdOn);
      }
      if (sortBy === 'enrolled') {
        return bEnroll - aEnroll || bLikes - aLikes;
      }
      // trending: weighted likes + enrollments + recency tiebreaker
      const aScore = aLikes * 2 + aEnroll;
      const bScore = bLikes * 2 + bEnroll;
      return bScore - aScore || getCreatedMillis(b.createdOn) - getCreatedMillis(a.createdOn);
    });
  }, [allCourses, selectedCategory, searchQuery, userEmail, ownedTitles, sortBy]);

  const handleToggleLike = async (course) => {
    if (!userEmail || !course?.docId) return;
    tapLight();
    const likedList = Array.isArray(course.likedBy) ? course.likedBy : [];
    const alreadyLiked = likedList.includes(userEmail);

    // Optimistic update
    setAllCourses((prev) =>
      prev.map((c) => {
        if (c.docId !== course.docId) return c;
        const nextLikedBy = alreadyLiked
          ? likedList.filter((e) => e !== userEmail)
          : [...likedList, userEmail];
        return { ...c, likedBy: nextLikedBy };
      })
    );

    try {
      await updateDoc(doc(db, 'Courses', course.docId), {
        likedBy: alreadyLiked ? arrayRemove(userEmail) : arrayUnion(userEmail),
      });
    } catch {
      // ignore if rules restrict non-owner updates
    }
  };

  const openCourse = (course) => {
    const isMine = (course.createdBy || '').toLowerCase() === userEmail;
    router.push({
      pathname: '/courseView/' + course.docId,
      params: {
        ...courseRouteParams(course),
        enroll: String(!isMine),
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredCourses}
        keyExtractor={(item, index) => item.docId || String(index)}
        onRefresh={fetchCourses}
        refreshing={loading && hasLoaded}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 84 },
        ]}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text, flex: 1 }]}>
                Explore Courses
              </Text>
              <Pressable
                onPress={() => {
                  tapSelection();
                  setJoinOpen(true);
                }}
                style={[styles.joinBtn, { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons name="key-outline" size={16} color={colors.primary} />
                <Text style={[styles.joinBtnText, { color: colors.primary }]}>
                  Join Code
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Discover courses across topics or build your own with AI.
            </Text>

            <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="search-outline" size={20} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search courses, topics, or level..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                returnKeyType="search"
              />
              {!!searchQuery && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {ALL_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      tapSelection();
                      setSelectedCategory(cat);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: active ? colors.white : colors.text },
                        active && { fontFamily: 'outfit-bold' },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {SORT_MODES.map((m) => {
                const active = sortBy === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      tapSelection();
                      setSortBy(m.key);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 99,
                      backgroundColor: active ? colors.primarySoft : colors.cardAlt,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: active ? 'outfit-bold' : 'outfit',
                        fontSize: 12,
                        color: active ? colors.primary : colors.textMuted,
                      }}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          !hasLoaded && loading ? (
            <CourseCardSkeleton count={3} />
          ) : (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="compass-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery || selectedCategory !== 'All'
                  ? 'No matching courses found'
                  : 'No courses to explore yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Create a personalized AI course on any topic you want to learn.
              </Text>
              <View style={{ width: '100%', marginTop: 10 }}>
                <Button
                  text="+ Create New Course"
                  onPress={() => router.push('/addCourse')}
                />
              </View>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isMine = (item.createdBy || '').toLowerCase() === userEmail;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => openCourse(item)}
            >
              <Image
                source={getBannerImage(item.banner_image)}
                style={styles.banner}
              />
              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  {!!item.category && (
                    <Text
                      style={[
                        styles.categoryBadge,
                        { color: colors.primary, backgroundColor: colors.primarySoft },
                      ]}
                    >
                      {item.category}
                    </Text>
                  )}
                  {!!item.level && (
                    <Text
                      style={[
                        styles.levelBadge,
                        { color: colors.textMuted, backgroundColor: colors.cardAlt },
                      ]}
                    >
                      {item.level}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.ownerBadge,
                      isMine
                        ? { color: colors.green, backgroundColor: colors.greenSoft }
                        : { color: colors.white, backgroundColor: colors.primary },
                    ]}
                  >
                    {isMine ? 'My Course' : 'Enroll'}
                  </Text>
                </View>

                <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.courseTitle}
                </Text>

                {!!item.description && (
                  <Text style={[styles.courseDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <Ionicons name="book-outline" size={18} color={colors.primary} />
                  <Text style={[styles.chapterCount, { color: colors.primary }]}>
                    {item.chapters?.length ?? 0} Chapters
                  </Text>
                  {Number(item.enrollCount) > 0 && (
                    <Text style={{ fontFamily: 'outfit', fontSize: 13, color: colors.textMuted, marginLeft: 8 }}>
                      • {item.enrollCount} enrolled
                    </Text>
                  )}
                  <Pressable
                    onPress={() => handleToggleLike(item)}
                    style={{
                      marginLeft: 'auto',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 99,
                      backgroundColor: colors.cardAlt,
                    }}
                  >
                    <Ionicons
                      name={
                        Array.isArray(item.likedBy) && item.likedBy.includes(userEmail)
                          ? 'heart'
                          : 'heart-outline'
                      }
                      size={16}
                      color={
                        Array.isArray(item.likedBy) && item.likedBy.includes(userEmail)
                          ? colors.red
                          : colors.textMuted
                      }
                    />
                    <Text style={{ fontFamily: 'outfit-bold', fontSize: 12, color: colors.text }}>
                      {Array.isArray(item.likedBy) ? item.likedBy.length : 0}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={joinOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.headerRow}>
              <Text style={[styles.modalTitle, { color: colors.text, flex: 1 }]}>
                Join with Course Code
              </Text>
              <Pressable onPress={() => setJoinOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: 12 }]}>
              Paste a shared Best Coach course code to preview and enroll.
            </Text>
            <TextInput
              value={courseCode}
              onChangeText={setCourseCode}
              placeholder="e.g. 1763820123456_0"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[
                styles.codeInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
            <Button text="Open Course" onPress={handleJoinByCode} loading={joining} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  title: {
    fontFamily: 'outfit-bold',
    fontSize: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  joinBtnText: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontFamily: 'outfit',
    fontSize: 16,
  },
  subtitle: {
    fontFamily: 'outfit',
    fontSize: 15,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'outfit',
    fontSize: 16,
  },
  categoryRow: {
    gap: 8,
    paddingVertical: 14,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: 'outfit',
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  banner: {
    width: '100%',
    height: 150,
  },
  cardBody: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryBadge: {
    fontFamily: 'outfit',
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  levelBadge: {
    fontFamily: 'outfit',
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  ownerBadge: {
    fontFamily: 'outfit-bold',
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    marginLeft: 'auto',
  },
  courseTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 19,
  },
  courseDesc: {
    fontFamily: 'outfit',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  chapterCount: {
    fontFamily: 'outfit',
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 28,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 19,
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'outfit',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
