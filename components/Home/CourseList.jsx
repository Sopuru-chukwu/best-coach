import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import { imageAssets } from '../../constant/Options';
import Colors from '../../constant/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function CourseList({ courseList, heading = "Courses", enroll = false, canDelete = false, onDelete }) {
  const router = useRouter();

  const handleDelete = (item) => {
    Alert.alert(
      "Delete Course",
      `Are you sure you want to delete "${item.courseTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete?.(item)  // Call parent's delete handler
        }
      ]
    );
  };

  return (
    <View style={{ marginTop: 15 }}>
      <Text style={{ fontFamily: 'outfit-bold', fontSize: 25 }}>{heading}</Text>

      <FlatList
        data={courseList}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View key={index} style={styles.courseContainer}>
            {canDelete && (
              <TouchableOpacity
                style={styles.deleteIcon}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={20} color="red" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/courseView/' + item?.docId,
                params: {
                  courseParams: JSON.stringify(item),
                  enroll: enroll
                }
              })}
            >
              <Image
                source={imageAssets[item.banner_image]}
                style={{ width: '100%', height: 150, borderRadius: 15 }}
              />
              <Text style={{ fontFamily: 'outfit-bold', fontSize: 18, marginTop: 10 }}>
                {item?.courseTitle}
              </Text>
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 5 }}>
                <Ionicons name="book-outline" size={24} color="black" />
                <Text style={{ fontFamily: 'outfit' }}>{item?.chapters?.length} Chapters</Text>
              </View>
            </TouchableOpacity>
          </View>

        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  courseContainer: {
  padding: 10,
  backgroundColor: Colors.WHITE,
  margin: 6,
  borderRadius: 15,
  width: 260,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
  deleteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 20,
    zIndex: 1,
    elevation: 3
  }
});
