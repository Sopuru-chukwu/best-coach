import { View, Text, Image, FlatList } from "react-native";
import React from "react";
import { useLocalSearchParams } from "expo-router";
import { imageAssets } from "../../constant/Options";
import Intro from "../../components/CourseView/Intro";
import Chapters from "../../components/CourseView/Chapters";

export default function CourseView() {
  const { courseParams } = useLocalSearchParams();
  const course = JSON.parse(courseParams);
  return (
    <FlatList
      data={[]}
      ListHeaderComponent={
        <View>
          <Intro course={course} />
          <Chapters course={course} />
        </View>
      }
    />
  );
}
