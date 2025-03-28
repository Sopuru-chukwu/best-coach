import { View, Text, Platform, FlatList, Image } from "react-native";
import React, { useContext, useEffect, useState } from "react";
import Header from "../../components/Home/header";
import Colors from "./../../constant/Colors";
import NoCourse from "../../components/Home/NoCourse";
import { db } from "./../../config/firebaseConfig";
import { UserDetailContext } from "../../context/UserDetailContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import CourseList from "../../components/Home/CourseList";
import PracticeSection from "../../components/Home/PracticeSection";
import CourseProgress from "../../components/Home/CourseProgress";

export default function Home() {
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userDetail && GetCourseList();
  }, [userDetail]);

  const GetCourseList = async () => {
    setLoading(true)
    setCourseList([]);
    const q = query(
      collection(db, "Courses"),
      where("createdBy", "==", userDetail?.email)
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      console.log("==", doc.data());
      setCourseList((prev) => [...prev, doc.data()])
    })
    setLoading(false);
  };

  return (
    <FlatList
      data={[]}
      onRefresh={() => GetCourseList()}
      refreshing={loading}
      ListHeaderComponent={
        <View>
          <Image source={require('./../../assets/images/wave.png')} style={{
            position: 'absolute',
            width: '100%',
            height:700
          }} />
          <View
            style={{
              padding: 25,
              paddingTop: Platform.OS == "ios" && 45,
              
            }}
          >
            <Header />
            {courseList?.length == 0 ? (
              <NoCourse />
            ) : (
              <View>
                <CourseProgress courseList={courseList} />
                <PracticeSection />
                <CourseList courseList={courseList} />
              </View>
            )}
          </View>
        </View>
      }
    />
  );
} 