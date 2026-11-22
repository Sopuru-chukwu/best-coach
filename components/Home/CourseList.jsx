import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import { getBannerImage } from '../../constant/Options';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function CourseList({
  courseList,
  heading = 'Courses',
  enroll = false,
  canDelete = false,
  onDelete,
}) {
  const router = useRouter();
  const { colors } = useTheme();

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${item.courseTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(item),
        },
      ]
    );
  };

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontFamily: 'outfit-bold', fontSize: 24, color: colors.text }}>
        {heading}
      </Text>

      <FlatList
        data={courseList}
        keyExtractor={(item, index) => item?.docId || String(index)}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.courseContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {canDelete && (
              <TouchableOpacity
                style={[styles.deleteIcon, { backgroundColor: colors.card }]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={18} color={colors.red} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/courseView/' + item?.docId,
                  params: {
                    courseParams: JSON.stringify(item),
                    enroll: String(enroll),
                  },
                })
              }
            >
              <Image
                source={getBannerImage(item?.banner_image)}
                style={{ width: '100%', height: 150, borderRadius: 12 }}
              />
              <Text
                style={{
                  fontFamily: 'outfit-bold',
                  fontSize: 18,
                  marginTop: 10,
                  color: colors.text,
                }}
                numberOfLines={2}
              >
                {item?.courseTitle}
              </Text>
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 6 }}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
                <Text style={{ fontFamily: 'outfit', color: colors.textMuted }}>
                  {item?.chapters?.length ?? 0} Chapters
                </Text>
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
    margin: 6,
    borderRadius: 15,
    borderWidth: 1,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 20,
    zIndex: 1,
    elevation: 3,
  },
});
