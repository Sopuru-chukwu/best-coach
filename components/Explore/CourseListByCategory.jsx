import { View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { db } from './../../config/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import CourseList from '../Home/CourseList';

export default function CourseListByCategory({ category }) {
  const [courseList, setCourseList] = useState([]);

  useEffect(() => {
    GetCourseListByCategory();
  }, [category]);

  const GetCourseListByCategory = async () => {
    try {
      const q = query(collection(db, 'Courses'), where('category', '==', category));
      const querySnapshot = await getDocs(q);
      const courses = [];
      querySnapshot.forEach((docSnap) => {
        courses.push({ ...docSnap.data(), docId: docSnap.id });
      });
      setCourseList(courses);
    } catch (error) {
      console.error(`Error loading courses for ${category}:`, error);
      setCourseList([]);
    }
  };

  return (
    <View>
      {courseList.length > 0 && (
        <CourseList courseList={courseList} heading={category} enroll={true} />
      )}
    </View>
  );
}
