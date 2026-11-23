import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCourse } from '../../hooks/useCourse';
import { useTheme } from '../../context/ThemeContext';
import Button from './Button';

const firstParam = (val) => (Array.isArray(val) ? val[0] : val);

/**
 * Wraps a screen that needs a course: reads the `courseId` route param,
 * shows a spinner while it loads and a "not found" state if it can't,
 * then renders the screen with a `course` prop.
 */
export function withRouteCourse(Screen) {
  function RouteCourseScreen(props) {
    const params = useLocalSearchParams();
    const courseId = firstParam(params.courseId);
    const { course, loading } = useCourse(courseId);
    const { colors } = useTheme();
    const router = useRouter();

    if (loading) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!course) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 25,
            backgroundColor: colors.background,
          }}
        >
          <Text
            style={{ fontFamily: 'outfit-bold', fontSize: 20, marginBottom: 10, color: colors.text }}
          >
            Course not found
          </Text>
          <Button text="Back To Home" onPress={() => router.replace('/(tabs)/home')} />
        </View>
      );
    }

    // key: remount if a different course is opened on the same screen instance
    return <Screen key={course.docId} {...props} course={course} />;
  }

  RouteCourseScreen.displayName = `withRouteCourse(${Screen.displayName || Screen.name || 'Screen'})`;
  return RouteCourseScreen;
}
