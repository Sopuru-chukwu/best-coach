import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserDetailContext } from '../../context/UserDetailContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import CourseProgressCard from '../../components/Shared/CourseProgressCard';
import Button from '../../components/Shared/Button';
import { computeLearningStats } from '../../config/learningStats';
import MasteryRing from '../../components/Shared/MasteryRing';
import WeeklyHeatmapCard from '../../components/Progress/WeeklyHeatmapCard';

const getCreatedMillis = (createdOn) => {
  if (!createdOn) return 0;
  if (typeof createdOn?.toMillis === 'function') return createdOn.toMillis();
  if (typeof createdOn?.seconds === 'number') return createdOn.seconds * 1000;
  const parsed = new Date(createdOn).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function Progress() {
  const { userDetail } = useContext(UserDetailContext);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const router = useRouter();

  const GetCourseList = useCallback(async () => {
    if (!userDetail?.email) return;
    setLoading(true);
    try {
      let querySnapshot;
      try {
        const q = query(
          collection(db, 'Courses'),
          where('createdBy', '==', userDetail.email),
          orderBy('createdOn', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch {
        const fallbackQuery = query(
          collection(db, 'Courses'),
          where('createdBy', '==', userDetail.email)
        );
        querySnapshot = await getDocs(fallbackQuery);
      }

      const newList = [];
      querySnapshot.forEach((docSnap) => {
        newList.push({ ...docSnap.data(), docId: docSnap.id });
      });
      newList.sort((a, b) => getCreatedMillis(b.createdOn) - getCreatedMillis(a.createdOn));
      setCourseList(newList);
    } catch (error) {
      console.error('Error loading course progress:', error);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [userDetail?.email]);

  useFocusEffect(
    useCallback(() => {
      if (userDetail?.email) {
        GetCourseList();
      }
    }, [userDetail?.email, GetCourseList])
  );

  const stats = useMemo(() => computeLearningStats(courseList), [courseList]);
  const streakDays = Number(userDetail?.streakDays) || 0;
  const overallMasteryPct =
    stats.totalChapters > 0
      ? (stats.completedChapters / stats.totalChapters) * 100
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Image
        source={require('./../../assets/images/wave.png')}
        style={{
          position: 'absolute',
          width: '100%',
          height: 700,
          resizeMode: 'cover',
          opacity: isDark ? 0.55 : 1,
        }}
      />
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: insets.top + 14 }}>
        <Text
          style={{
            fontFamily: 'outfit-bold',
            fontSize: 30,
            color: colors.white,
            marginBottom: 12,
          }}
        >
          Course Progress
        </Text>

        <View
          style={[
            styles.statsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.statCol}>
            <MasteryRing percent={overallMasteryPct} size={58} strokeWidth={6} label="Overall" />
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: colors.text }]}>🔥 {streakDays}d</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.completedChapters}/{stats.totalChapters}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Chapters</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.avgQuizScore !== null ? `${stats.avgQuizScore}%` : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg Quiz</Text>
          </View>
        </View>

        <FlatList
          data={courseList}
          keyExtractor={(item, index) => item.docId || String(index)}
          showsVerticalScrollIndicator={false}
          onRefresh={GetCourseList}
          refreshing={loading}
          contentContainerStyle={{ paddingBottom: insets.bottom + 84, flexGrow: 1 }}
          ListHeaderComponent={<WeeklyHeatmapCard />}
          ListEmptyComponent={
            hasLoaded && !loading ? (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 24,
                  marginTop: 20,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'outfit-bold', fontSize: 20, textAlign: 'center', color: colors.text }}>
                  No courses started yet
                </Text>
                <Text
                  style={{
                    fontFamily: 'outfit',
                    fontSize: 15,
                    color: colors.textMuted,
                    textAlign: 'center',
                    marginTop: 6,
                  }}
                >
                  Create your first course to start tracking chapter progress.
                </Text>
                <Button
                  text="+ Create New Course"
                  onPress={() => router.push('/addCourse')}
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/courseView/' + item.docId,
                  params: {
                    courseParams: JSON.stringify(item),
                    enroll: 'false',
                  },
                })
              }
              style={{ marginBottom: 14 }}
            >
              <CourseProgressCard item={item} width={'96%'} />
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'outfit-bold',
    fontSize: 20,
  },
  statLabel: {
    fontFamily: 'outfit',
    fontSize: 13,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
});
