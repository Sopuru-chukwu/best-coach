import { View, Text, Image, TouchableOpacity, FlatList } from 'react-native';
import React from 'react';
import { PraticeOption } from '../../constant/Options';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function PracticeSection() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          fontFamily: 'outfit-bold',
          fontSize: 24,
          color: colors.text,
        }}
      >
        Practice
      </Text>

      <FlatList
        data={PraticeOption}
        keyExtractor={(item) => item.name}
        numColumns={3}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push('/practice/' + encodeURIComponent(item.name))}
            style={{
              flex: 1,
              margin: 5,
              aspectRatio: 1,
            }}
          >
            <Image
              source={item?.image}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 160,
                borderRadius: 15,
              }}
            />
            <Text
              style={{
                position: 'absolute',
                padding: 12,
                fontSize: 15,
                fontFamily: 'outfit-bold',
                color: colors.white,
              }}
            >
              {item?.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
