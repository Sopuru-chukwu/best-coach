import { View, Text, Image, Pressable } from 'react-native';
import React, { useContext, useState, useMemo } from 'react';
import { imageAssets } from '../../constant/Options';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import Button from './../../components/Shared/Button';
import { useRouter } from 'expo-router';
import { UserDetailContext } from './../../context/UserDetailContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function Intro({ course, enroll, goHome, startOrContinue }) {
  const router = useRouter();
  const { userDetail } = useContext(UserDetailContext);
  const [loading, setLoading] = useState(false);

  const completedChapters = Array.isArray(course?.completedChapter) ? course.completedChapter : [];

  const status = useMemo(() => {
    if (enroll === 'true') return 'not_enrolled';
    if (!course?.chapters?.length) return 'no_content';
    if (completedChapters.length === 0) return 'enrolled_not_started';
    if (completedChapters.length < course.chapters.length) return 'in_progress';
    return 'completed';
  }, [enroll, course, completedChapters]);

  const buttonLabel = {
    not_enrolled: 'Enroll Now',
    no_content: 'Start',
    enrolled_not_started: 'Start Now',
    in_progress: 'Continue',
    completed: 'Review Course',
  }[status];

  const handlePrimary = async () => {
    if (status === 'not_enrolled') {
      await onEnrollCourse();
      return;
    }

    const total = course.chapters.length;
    const completedSet = new Set(completedChapters.map(Number));
    let firstIncomplete = 0;

    for (let i = 0; i < total; i++) {
      if (!completedSet.has(i)) {
        firstIncomplete = i;
        break;
      }
    }

    if (status === 'completed') firstIncomplete = 0;

    startOrContinue?.(firstIncomplete);
  };

  const onEnrollCourse = async () => {
    const docId = Date.now().toString();
    setLoading(true);
    try {
      const data = {
        ...course,
        docId,
        createdBy: userDetail?.email ?? null,
        createdOn: new Date(),
        enrolled: true,
        completedChapter: [],
      };
      await setDoc(doc(db, 'Courses', docId), data);
      router.push({
        pathname: '/courseView/' + docId,
        params: {
          courseParams: JSON.stringify(data),
          enroll: false,
          courseId: docId,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Image
        source={imageAssets[course?.banner_image]}
        style={{ width: '100%', height: 280 }}
      />
      <View style={{ padding: 20 }}>
        <Text style={{ fontFamily: 'outfit-bold', fontSize: 25 }}>
          {course?.courseTitle}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center',
            marginTop: 5,
          }}
        >
          <Ionicons name="book-outline" size={24} color={Colors.PRIMARY} />
          <Text style={{ fontFamily: 'outfit', fontSize: 18, color: Colors.PRIMARY }}>
            {course?.chapters?.length ?? 0} Chapters
          </Text>
        </View>

        {status !== 'not_enrolled' && course?.chapters?.length > 0 && (
          <Text
            style={{
              fontFamily: 'outfit',
              fontSize: 16,
              marginTop: 4,
              color: Colors.GRAY,
            }}
          >
            {completedChapters.length}/{course.chapters.length} completed
          </Text>
        )}

        <Text style={{ fontFamily: 'outfit-bold', fontSize: 20, marginTop: 10 }}>
          Description:
        </Text>
        <Text style={{ fontFamily: 'outfit', color: Colors.GRAY }}>
          {course?.description}
        </Text>

        <Button text={buttonLabel} loading={loading} onPress={handlePrimary} />
      </View>

      <Pressable style={{ position: 'absolute', padding: 10 }} onPress={goHome}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </Pressable>
    </View>
  );
}
