import { View, Text, Image } from 'react-native';
import React from 'react';
import Button from '../Shared/Button';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function NoCourse() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View
      style={{
        marginTop: 40,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 20,
        padding: 24,
      }}
    >
      <Image
        source={require('./../../assets/images/book.png')}
        style={{
          height: 180,
          width: 180,
        }}
      />
      <Text
        style={{
          fontFamily: 'outfit-bold',
          fontSize: 24,
          textAlign: 'center',
          color: colors.text,
          marginTop: 8,
        }}
      >
        You Don't Have any Course
      </Text>

      <Button
        text={'+ Create New Course'}
        onPress={() => router.push('/addCourse')}
      />
      <Button
        text={'+ Explore Existing Courses'}
        type="outline"
        onPress={() => router.push('/(tabs)/explore')}
      />
    </View>
  );
}
