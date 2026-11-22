import { View, FlatList, Image, Alert, ActivityIndicator } from "react-native";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const [courseList, setCourseList] = useState([]);
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
    } catch (error) {
      console.error("Error fetching courses:", error);
      const cached = await loadCachedCourses(userDetail.email);
      if (cached.length > 0) {
        setCourseList(cached);
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
    </View>
  );
}
