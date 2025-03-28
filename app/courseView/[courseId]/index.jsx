import { View, FlatList, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import Intro from "../../../components/CourseView/Intro";
import Chapters from "../../../components/CourseView/Chapters";
import Colors from "../../../constant/Colors";
import { db } from "../../../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function CourseView() {
  const { courseParams, courseId, enroll, refresh } = useLocalSearchParams(); // Added `refresh` to track updates
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    console.log("🔄 Fetching course data...");
    if (!courseParams) {
      GetCourseById();
    } else {
      try {
        const parsedCourse = JSON.parse(courseParams);
        console.log("Parsed Course:", parsedCourse);
        setCourse(parsedCourse);
        setLoading(false);
      } catch (error) {
        console.error("Error parsing courseParams:", error);
        setCourse(null);
        setLoading(false);
      }
    }
  }, [courseId, refresh]); // Ensure refresh triggers a re-fetch

  const GetCourseById = async () => {
    try {
      console.log("Fetching course with ID:", courseId);
      const docRef = await getDoc(doc(db, "Courses", courseId));
      if (docRef.exists()) {
        console.log("Fetched Course:", docRef.data());
        setCourse(docRef.data());
      } else {
        console.error("No such course found!");
        setCourse(null);
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      setCourse(null);
    } finally {
      setLoading(false);
    }
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
      data={[]} // Empty since we're using ListHeaderComponent
      ListHeaderComponent={
        <View style={{ flex: 1, backgroundColor: Colors.WHITE }}>
          <Intro course={course} enroll={enroll} />
          {Array.isArray(course.chapters) ? (
            <Chapters course={course} />
          ) : (
            <Text>No Chapters Available</Text>
          )}
        </View>
      }
    />
  );
}
