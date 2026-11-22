import { View, Text, FlatList, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Intro from "../../../components/CourseView/Intro";
import Chapters from "../../../components/CourseView/Chapters";
import Colors from "../../../constant/Colors";
import { db } from "../../../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import Button from "../../../components/Shared/Button";
import { useTheme } from "../../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CourseView() {
  const { courseParams, courseId, enroll, refresh } = useLocalSearchParams();
  const resolvedCourseId = Array.isArray(courseId) ? courseId[0] : courseId;
  const rawCourseParams = Array.isArray(courseParams) ? courseParams[0] : courseParams;
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    if (!rawCourseParams || refresh) {
      GetCourseById();
    } else {
      try {
        const parsed = JSON.parse(rawCourseParams);
        const normalized = { docId: resolvedCourseId ?? parsed.docId, ...parsed };
        setCourse(normalized);
        setLoading(false);
      } catch (error) {
        console.error("Error parsing courseParams:", error);
        GetCourseById();
      }
    }
  }, [resolvedCourseId, refresh]);

  const GetCourseById = async () => {
    if (!resolvedCourseId) {
      setCourse(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "Courses", resolvedCourseId));
      if (snap.exists()) {
        const data = snap.data();
        setCourse({ docId: resolvedCourseId, ...data });
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
        chapterIndex: String(chapterIndex),
        courseTitle: course.courseTitle ?? "",
        courseDescription: course.description ?? "",
        level: course.level ?? "Beginner",
        style: course.style ?? "Hands-on & Examples",
        sourceNotes: course.sourceNotes ?? "",
      },
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 25, backgroundColor: colors.background }}>
        <Text style={{ fontFamily: "outfit-bold", fontSize: 20, marginBottom: 10, color: colors.text }}>
          Course not found
        </Text>
        <Button text="Back To Home" onPress={goHome} />
      </View>
    );
  }

  return (
    <FlatList
      data={[]}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      ListHeaderComponent={
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Intro
            course={course}
            enroll={enroll}
            goHome={goHome}
            startOrContinue={openChapter}
          />
          {Array.isArray(course?.chapters) ? (
            <Chapters course={course} />
          ) : (
            <Text style={{ padding: 20, fontFamily: "outfit", color: colors.textMuted }}>
              No Chapters Available
            </Text>
          )}
        </View>
      }
    />
  );
}
