import { View, Text, Image, ActivityIndicator } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { imageAssets, PraticeOption } from '../../../constant/Options';
import Colors from '../../../constant/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';
import { db } from './../../../config/firebaseConfig'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { UserDetailContext } from './../../../context/UserDetailContext'
import CourseListGrid from '../../../components/PracticeScreen/CourseListGrid';

export default function PracticeTypeHomeScreen() {
    const { type } = useLocalSearchParams();
    const router = useRouter();
    const { userDetail, setUserDetail } = useContext(UserDetailContext);
    const option = PraticeOption.find(item => item.name == type);
    console.log(option)
    const [loading, setloading]=useState(false);
    const [courseList,setCourseList]=useState([]);

    useEffect(() => {
        userDetail && GetCourseList();
    }, [userDetail])

    const GetCourseList = async () => {
        setloading(true);
        setCourseList([]);
        try {
        const q = query(collection(db, 'Courses')
            , where('createdBy', '==', userDetail?.email),
        orderBy('createdOn', 'desc'));

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            // console.log(doc.data());
            setCourseList(prev=>[...prev,doc.data()])
        })
        setloading(false);
    }
    catch (e) {
        console.log(e)
        setloading(false);
    }
    }
    return (
        <View>
            <Image source={option.image} style={{
                height: 200,
                width: '100%'
            }} />
            <View style={{
                position: 'absolute',
                padding: 10,
                display: 'flex',
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center'
            }}>
                <Pressable onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="black" style={{
                        backgroundColor: Colors.WHITE,
                        padding: 8,
                        borderRadius: 10
                    }} />
                </Pressable>
                <Text style={{
                    fontFamily: 'outfit-bold',
                    fontSize: 35,
                    color: Colors.WHITE
                }}>{type}</Text>
            </View>
            {loading&&<ActivityIndicator size={'large'} color={Colors.PRIMARY} style={{
                marginTop: 150
            }} />}
            <CourseListGrid courseList={courseList} 
                option={option}
            />
        </View>
    )
}