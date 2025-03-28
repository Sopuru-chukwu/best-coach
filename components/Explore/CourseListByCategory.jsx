import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import { db } from './../../config/firebaseConfig'
import { collection, doc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constant/Colors';
import { imageAssets } from '../../constant/Options';
import CourseList from '../Home/CourseList';

export default function CourseListByCategory({ category }) {

    const [courseList, setCourseList] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        GetCourseListByCategory();
    }, [category])

    const GetCourseListByCategory = async () => {
        setCourseList([]);
        setLoading(true);
        const q = query(collection(db, 'Courses'), where('category', '==', category),)

        const querySnapshot = await getDocs(q);

        querySnapshot?.forEach((doc) => {
            console.log("--", doc.data());
            setCourseList(prev => [...prev, doc.data()])
        })
        setLoading(false);
    }

    return (
        <View>
            {courseList?.length > 0 && <CourseList courseList={courseList} heading={category} enroll={true} />}
        </View>
    )
}

const styles = StyleSheet.create({
    courseContainer: {
        padding: 10,
        backgroundColor: Colors.WHITE,
        margin: 6,
        borderRadius: 15,
        width: 260
    }
})