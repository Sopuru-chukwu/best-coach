import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import React from 'react';
import Colors from '../../constant/Colors';
import CourseProgressCard from '../Shared/CourseProgressCard';
import { useRouter } from 'expo-router';

export default function CourseProgress({ courseList }) {
  const router = useRouter();

  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          fontFamily: 'outfit-bold',
          fontSize: 25,
          color: Colors.WHITE,
        }}
      >
        Progress
      </Text>

      <FlatList
        data={courseList}
        keyExtractor={(item, index) => item?.docId || String(index)}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/courseView/' + item?.docId,
                params: {
                  courseParams: JSON.stringify(item),
                  enroll: 'false',
                },
              })
            }
          >
            <CourseProgressCard item={item} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
