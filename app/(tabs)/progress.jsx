import { View, Text, Image, TouchableOpacity, FlatList, SafeAreaView } from 'react-native'
import React, { useContext, useState, useEffect } from 'react'
import { UserDetailContext } from '../../context/UserDetailContext'
import { db } from '../../config/firebaseConfig'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import CourseProgressCard from '../../components/Shared/CourseProgressCard'
import Colors from '../../constant/Colors'
import { useRouter } from 'expo-router'

export default function Progress() {
  const { userDetail } = useContext(UserDetailContext)
  const [courseList, setCourseList] = useState([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (userDetail) GetCourseList()
  }, [userDetail])

  const GetCourseList = async () => {
    setLoading(true)
    setCourseList([])

    const q = query(
      collection(db, "Courses"),
      where("createdBy", "==", userDetail?.email),
      orderBy('createdOn', 'desc')
    )

    const querySnapshot = await getDocs(q)
    const newList = []
    querySnapshot.forEach((docSnap) => {
      newList.push({ ...docSnap.data(), docId: docSnap.id }) // Attach docId for navigation
    })
    setCourseList(newList)
    setLoading(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <Image
        source={require('./../../assets/images/wave.png')}
        style={{
          position: 'absolute',
          width: '100%',
          height: 700,
          resizeMode: 'cover'
        }}
      />
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{
          fontFamily: 'outfit-bold',
          fontSize: 30,
          color: Colors.WHITE,
          marginBottom: 10
        }}>
          Course Progress
        </Text>

        <FlatList
          data={courseList}
          keyExtractor={(item) => item.docId}
          showsVerticalScrollIndicator={false}
          onRefresh={GetCourseList}
          refreshing={loading}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/courseView/' + item.docId,
                params: {
                  courseParams: JSON.stringify(item)
                }
              })}
              style={{ marginBottom: 16 }}
            >
              <CourseProgressCard item={item} width={'95%'} />
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  )
}
