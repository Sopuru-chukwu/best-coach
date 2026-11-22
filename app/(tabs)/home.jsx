import { View, Text, FlatList, Image, Alert, TouchableOpacity } from "react-native";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Header from "../../components/Home/header";
import NoCourse from "../../components/Home/NoCourse";
import { useTheme } from "../../context/ThemeContext";
import { db } from "./../../config/firebaseConfig";
import { UserDetailContext } from "../../context/UserDetailContext";
import { collection, getDocs, query, where, doc, deleteDoc, setDoc } from "firebase/firestore";
import CourseList from "../../components/Home/CourseList";
import PracticeSection from "../../components/Home/PracticeSection";
import CourseProgress from "../../components/Home/CourseProgress";
import { Snackbar } from "react-native-paper";
import { loadCachedCourses, saveCachedCourses } from "../../config/offlineCache";
import { CourseCardSkeleton } from "../../components/Shared/SkeletonLoader";
import { getDueCards } from "../../config/spacedRepetition";
import { useTutorial } from "../../context/TutorialContext";
import CoachMarkTour from "../../components/Shared/CoachMarkTour";

const getCreatedMillis = (createdOn) => {
  if (!createdOn) return 0;
  if (typeof createdOn?.toMillis === "function") return createdOn.toMillis();
  if (typeof createdOn?.seconds === "number") return createdOn.seconds * 1000;
  const parsed = new Date(createdOn).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function Home() {
  const { userDetail } = useContext(UserDetailContext);
  const { colors, isDark } = useTheme();
  const { shouldShow, markSeen, skipAllTours } = useTutorial();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [courseList, setCourseList] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [deletedCourse, setDeletedCourse] = useState(null);
  const undoTimerRef = useRef(null);

  const GetCourseList = useCallback(async () => {
    if (!userDetail?.email) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "Courses"),
        where("createdBy", "==", userDetail.email)
      );
      const querySnapshot = await getDocs(q);
      const courses = [];
      querySnapshot.forEach((docItem) => {
        courses.push({ ...docItem.data(), docId: docItem.id });
      });
      courses.sort((a, b) => getCreatedMillis(b.createdOn) - getCreatedMillis(a.createdOn));
      setCourseList(courses);
      saveCachedCourses(userDetail.email, courses);
      getDueCards(courses).then(setDueCards).catch(() => {});
    } catch (error) {
      console.error("Error fetching courses:", error);
      const cached = await loadCachedCourses(userDetail.email);
      if (cached.length > 0) {
        setCourseList(cached);
        getDueCards(cached).then(setDueCards).catch(() => {});
      } else {
        Alert.alert("Offline", "Could not load your courses. Check your connection.");
      }
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

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const handleDeleteCourse = async (course) => {
    try {
      if (!course?.docId) return;

      await deleteDoc(doc(db, "Courses", course.docId));

      setDeletedCourse(course);
      setCourseList((prev) => prev.filter((c) => c.docId !== course.docId));
      setSnackbarVisible(true);

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      undoTimerRef.current = setTimeout(() => {
        setDeletedCourse(null);
      }, 5000);
    } catch (err) {
      console.error("Error deleting course:", err);
      Alert.alert("Error", "Failed to delete course.");
    }
  };

  const handleUndoDelete = async () => {
    if (!deletedCourse) return;

    try {
      const courseRef = doc(db, "Courses", deletedCourse.docId);
      await setDoc(courseRef, deletedCourse);
      setCourseList((prev) => [deletedCourse, ...prev]);
      setDeletedCourse(null);
    } catch (err) {
      console.error("Error restoring course:", err);
      Alert.alert("Error", "Failed to restore course.");
    }

    setSnackbarVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={[]}
        onRefresh={GetCourseList}
        refreshing={loading && hasLoaded}
        contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
        ListHeaderComponent={
          <View>
            <Image
              source={require('./../../assets/images/wave.png')}
              style={{
                position: 'absolute',
                width: '100%',
                height: 700,
                opacity: isDark ? 0.55 : 1,
              }}
            />
            <View style={{ padding: 22, paddingTop: insets.top + 14 }}>
              <Header />
              {!hasLoaded && loading ? (
                <CourseCardSkeleton count={3} />
              ) : courseList?.length === 0 ? (
                <NoCourse />
              ) : (
                <View>
                  {dueCards.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() =>
                        router.push({
                          pathname: "/reviewQueue",
                          params: { cardsParam: JSON.stringify(dueCards) },
                        })
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        marginTop: 14,
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: colors.primarySoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="layers-outline" size={22} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "outfit-bold", fontSize: 16, color: colors.text }}>
                          Due for Review Today
                        </Text>
                        <Text style={{ fontFamily: "outfit", fontSize: 13, color: colors.textMuted }}>
                          {dueCards.length} flashcard{dueCards.length === 1 ? "" : "s"} ready for spaced repetition
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  <CourseProgress courseList={courseList} />
                  <PracticeSection />
                  <CourseList
                    courseList={courseList}
                    canDelete={true}
                    onDelete={handleDeleteCourse}
                  />
                </View>
              )}
            </View>
          </View>
        }
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={5000}
        style={{ marginBottom: insets.bottom + 66 }}
        action={{
          label: "Undo",
          onPress: handleUndoDelete,
        }}
      >
        Course deleted
      </Snackbar>

      <CoachMarkTour
        visible={hasLoaded && shouldShow("home")}
        onFinish={() => markSeen("home")}
        onSkipAll={skipAllTours}
        steps={[
          {
            title: "Welcome to Best Coach!",
            icon: "sparkles",
            position: "center",
            description:
              "Your personal AI tutor builds tailored courses, deep chapter lessons, quizzes, and flashcards for anything you want to learn.",
            tip: "Let's take a quick 30-second tour of what to tap.",
          },
          {
            title: "Create a Course Anytime",
            icon: "add-circle-outline",
            position: "top-right",
            description:
              "Tap the '+ New' button in the top-right corner to generate a personalized course from any topic, lecture notes, textbook photo, or PDF.",
            tip: "Look for the white '+ New' pill button at the top right.",
          },
          {
            title: "Daily Review & Practice",
            icon: "layers-outline",
            position: "center",
            description:
              "Once you have courses, your 'Due for Review Today' flashcards, Quiz, Flashcards, and Q&A practice modes all appear right here on Home.",
            tip: "Tap any Progress card to jump straight back into your next unfinished chapter.",
          },
          {
            title: "Explore, Progress & Profile",
            icon: "compass-outline",
            position: "bottom",
            description:
              "Use the bottom tabs to browse community courses (Explore), track streaks & daily goals (Progress), or switch Dark Mode & reminders (Profile).",
            tip: "You can replay this tutorial anytime from the Profile tab.",
            actionLabel: courseList.length === 0 ? "Create First Course" : "Start Learning",
            onAction: () => {
              if (courseList.length === 0) {
                router.push("/addCourse");
              }
            },
          },
        ]}
      />
    </View>
  );
}
