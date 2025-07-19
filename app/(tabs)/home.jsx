import { View, Text, Platform, FlatList, Image } from "react-native";
import React, { useContext, useEffect, useState } from "react";
import Header from "../../components/Home/header";
import Colors from "./../../constant/Colors";
import NoCourse from "../../components/Home/NoCourse";
import { db } from "./../../config/firebaseConfig";
import { UserDetailContext } from "../../context/UserDetailContext";
import { collection, getDocs, query, where, doc, deleteDoc, setDoc } from "firebase/firestore";
import CourseList from "../../components/Home/CourseList";
import PracticeSection from "../../components/Home/PracticeSection";
import CourseProgress from "../../components/Home/CourseProgress";
import { Snackbar } from "react-native-paper"; // 👈 Snackbar import

export default function Home() {
  const { userDetail } = useContext(UserDetailContext);
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [deletedCourse, setDeletedCourse] = useState(null); // for undo

  useEffect(() => {
    userDetail && GetCourseList();
  }, [userDetail]);

  const GetCourseList = async () => {
    setLoading(true);
    setCourseList([]);
    const q = query(collection(db, "Courses"), where("createdBy", "==", userDetail?.email));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docItem) => {
      setCourseList((prev) => [...prev, { ...docItem.data(), docId: docItem.id }]);
    });

    setLoading(false);
  };

  const handleDeleteCourse = async (course) => {
    try {
      if (!course.docId) return;

      // Remove from Firestore
      await deleteDoc(doc(db, "Courses", course.docId));

      // Store deleted course temporarily
      setDeletedCourse(course);

      // Update UI
      setCourseList((prev) => prev.filter((c) => c.docId !== course.docId));

      // Show snackbar
      setSnackbarVisible(true);

      // Auto-clear undo buffer after 5 seconds
      setTimeout(() => {
        setDeletedCourse(null);
      }, 5000);
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("Failed to delete course.");
    }
  };

  const handleUndoDelete = async () => {
    if (!deletedCourse) return;

    try {
      const courseRef = doc(db, "Courses", deletedCourse.docId);
      await setDoc(courseRef, deletedCourse);

      setCourseList((prev) => [...prev, deletedCourse]); // Add back to list
      setDeletedCourse(null);
    } catch (err) {
      console.error("Error restoring course:", err);
    }

    setSnackbarVisible(false);
  };

  return (
    <>
      <FlatList
        data={[]}
        onRefresh={() => GetCourseList()}
        refreshing={loading}
        ListHeaderComponent={
          <View>
            <Image
              source={require('./../../assets/images/wave.png')}
              style={{
                position: 'absolute',
                width: '100%',
                height: 700
              }}
            />
            <View style={{ padding: 25, paddingTop: Platform.OS == "ios" && 45 }}>
              <Header />
              {courseList?.length === 0 ? (
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
        action={{
          label: "Undo",
          onPress: handleUndoDelete
        }}
      >
        Course deleted
      </Snackbar>
    </>
  );
}
