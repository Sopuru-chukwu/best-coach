import { View, Text, Image, ActivityIndicator, Pressable } from 'react-native';
import React, { useCallback, useContext, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { PraticeOption } from '../../../constant/Options';
import Colors from '../../../constant/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from './../../../config/firebaseConfig';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { UserDetailContext } from './../../../context/UserDetailContext';
import CourseListGrid from '../../../components/PracticeScreen/CourseListGrid';
import { useTheme } from '../../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getCreatedMillis = (createdOn) => {
  if (!createdOn) return 0;
  if (typeof createdOn?.toMillis === 'function') return createdOn.toMillis();
  if (typeof createdOn?.seconds === 'number') return createdOn.seconds * 1000;
  const parsed = new Date(createdOn).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function PracticeTypeHomeScreen() {
  const { type } = useLocalSearchParams();
  const decodedType = decodeURIComponent(Array.isArray(type) ? type[0] : type || '');
  const router = useRouter();
  const { userDetail } = useContext(UserDetailContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const option = PraticeOption.find((item) => item.name === decodedType);
  const [loading, setLoading] = useState(false);
  const [courseList, setCourseList] = useState([]);

  const GetCourseList = useCallback(async () => {
    if (!userDetail?.email) return;
    setLoading(true);
    try {
      let querySnapshot;
      try {
        const q = query(
          collection(db, 'Courses'),
          where('createdBy', '==', userDetail.email),
          orderBy('createdOn', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch {
        const fallbackQuery = query(
          collection(db, 'Courses'),
          where('createdBy', '==', userDetail.email)
        );
        querySnapshot = await getDocs(fallbackQuery);
      }

      const courses = [];
      querySnapshot.forEach((docSnap) => {
        courses.push({ ...docSnap.data(), docId: docSnap.id });
      });
      courses.sort((a, b) => getCreatedMillis(b.createdOn) - getCreatedMillis(a.createdOn));
      setCourseList(courses);
    } catch (e) {
      console.error('Error loading practice courses:', e);
      setCourseList([]);
    } finally {
      setLoading(false);
    }
  }, [userDetail?.email]);

  useFocusEffect(
    useCallback(() => {
      if (userDetail?.email) {
        GetCourseList();
      }
    }, [userDetail?.email, GetCourseList])
  );

  if (!option) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, backgroundColor: colors.background }}>
        <Text style={{ fontFamily: 'outfit-bold', fontSize: 20, marginBottom: 15, color: colors.text }}>
          Practice mode not found.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: 'outfit-bold', color: colors.primary, fontSize: 16 }}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Image
        source={option.image}
        style={{
          height: 200,
          width: '100%',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 10,
          padding: 10,
          display: 'flex',
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
            style={{
              backgroundColor: colors.card,
              padding: 8,
              borderRadius: 10,
            }}
          />
        </Pressable>
        <Text
          style={{
            fontFamily: 'outfit-bold',
            fontSize: 32,
            color: colors.white,
          }}
        >
          {decodedType}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size={'large'}
          color={colors.primary}
          style={{ marginTop: 120 }}
        />
      ) : (
        <CourseListGrid courseList={courseList} option={option} />
      )}
    </View>
  );
}
