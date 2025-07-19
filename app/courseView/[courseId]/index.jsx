import { View, Text, FlatList, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Intro from "../../../components/CourseView/Intro";
import Chapters from "../../../components/CourseView/Chapters";
import Colors from "../../../constant/Colors";
import { db } from "../../../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function CourseView() {
  const { courseParams, courseId, enroll, refresh } = useLocalSearchParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!courseParams) {
      GetCourseById();
    } else {
      try {
        const parsed = JSON.parse(courseParams);
        const normalized = { docId: courseId ?? parsed.docId, ...parsed };
        setCourse(normalized);
        setLoading(false);
      } catch (error) {
        console.error("Error parsing courseParams:", error);
        setCourse(null);
        setLoading(false);
      }
    }
  }, [courseId, refresh]);

  const GetCourseById = async () => {
    try {
      const snap = await getDoc(doc(db, "Courses", courseId));
      if (snap.exists()) {
        const data = snap.data();
        setCourse({ docId: courseId, ...data });
      } else {
        setCourse(null);
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      setCourse(null);
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => router.replace("/(tabs)/home");

  const openChapter = (chapterIndex = 0) => {
    if (!course) return;
    router.push({
      pathname: "/chapterView",
      params: {
        chapterParams: JSON.stringify(course.chapters?.[chapterIndex] ?? {}),
        docId: course.docId,
        chapterIndex,
      },
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  return (
    <FlatList
      data={[]}
      ListHeaderComponent={
        <View style={{ flex: 1, backgroundColor: Colors.WHITE }}>
          <Intro
            course={course}
            enroll={enroll}
            goHome={goHome}
            startOrContinue={openChapter}
          />
          {Array.isArray(course?.chapters) ? (
            <Chapters course={course} />
          ) : (
            <Text>No Chapters Available</Text>
          )}
        </View>
      }
    />
  );
}
