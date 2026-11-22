import {
  View,
  Text,
  Image,
  Dimensions,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import React, { useContext, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import * as Progress from 'react-native-progress';
import Button from './../../components/Shared/Button';
import { db } from './../../config/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { generateMoreQuizQuestions } from '../../config/AiModel';
import { UserDetailContext } from '../../context/UserDetailContext';
import { recordStudyActivity } from '../../config/learningStats';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapLight } from '../../config/haptics';

export default function Quiz() {
  const { courseParams } = useLocalSearchParams();
  const initialCourse = useMemo(() => {
    try {
      const raw = Array.isArray(courseParams) ? courseParams[0] : courseParams;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [courseParams]);

  const [course, setCourse] = useState(initialCourse);
  const quiz = Array.isArray(course?.quiz) ? course.quiz : [];
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState({});
  const [loading, setLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const GetProgress = (page) => {
    if (!quiz.length) return 0;
    return Math.min(1, (page + 1) / quiz.length);
  };

  const OnOptionSelect = (selectedChoice) => {
    tapLight();
    const questionItem = quiz[currentPage];
    setResult((prev) => ({
      ...prev,
      [currentPage]: {
        userChoice: selectedChoice,
        isCorrect: questionItem?.correctAns === selectedChoice,
        question: questionItem?.question,
        correctAns: questionItem?.correctAns,
        explanation: questionItem?.explanation || '',
      },
    }));
  };

  const onGenerateFreshQuiz = async () => {
    if (!course || generatingQuiz) return;
    setGeneratingQuiz(true);
    try {
      const freshQuestions = await generateMoreQuizQuestions({
        courseTitle: course.courseTitle,
        chapters: course.chapters || [],
        existingQuestions: quiz.map((q) => q?.question).filter(Boolean),
        level: course.level || 'Beginner',
        style: course.style || 'Hands-on & Examples',
      });

      const updatedCourse = { ...course, quiz: freshQuestions };
      setCourse(updatedCourse);
      setCurrentPage(0);
      setSelectedOption(null);
      setResult({});

      if (course.docId) {
        await updateDoc(doc(db, 'Courses', course.docId), {
          quiz: freshQuestions,
        }).catch(() => {});
      }
    } catch (err) {
      Alert.alert('Quiz Error', err?.message || 'Could not generate new questions.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const onQuizFinish = async () => {
    setLoading(true);
    try {
      if (course?.docId) {
        await updateDoc(doc(db, 'Courses', course.docId), {
          quizResult: result,
        });
      }
      await recordStudyActivity(userDetail, setUserDetail);
    } catch (e) {
      console.error('Error saving quiz result:', e);
    } finally {
      setLoading(false);
      router.replace({
        pathname: '/quiz/Summary',
        params: {
          quizResultParam: JSON.stringify(result),
          courseTitle: course?.courseTitle || '',
          level: course?.level || 'Beginner',
          courseParams: JSON.stringify(course),
        },
      });
    }
  };

  const currentQuestion = quiz[currentPage];
  const hasSelection = selectedOption !== null && selectedOption !== undefined;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: colors.background }}>
      <Image
        source={require('./../../assets/images/wave.png')}
        style={{
          position: 'absolute',
          height: 800,
          width: '100%',
          opacity: isDark ? 0.55 : 1,
        }}
      />
      <View
        style={{
          padding: 25,
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 30,
          width: '100%',
        }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.WHITE} />
          </Pressable>

          <Text
            style={{
              fontFamily: 'outfit-bold',
              fontSize: 22,
              color: Colors.WHITE,
            }}
          >
            {quiz.length ? `${currentPage + 1} of ${quiz.length}` : '0 of 0'}
          </Text>

          <Pressable
            onPress={onGenerateFreshQuiz}
            disabled={generatingQuiz}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 99,
            }}
          >
            {generatingQuiz ? (
              <ActivityIndicator size="small" color={Colors.WHITE} />
            ) : (
              <Ionicons name="sparkles" size={15} color={Colors.WHITE} />
            )}
            <Text style={{ fontFamily: 'outfit-bold', fontSize: 13, color: Colors.WHITE }}>
              New Quiz
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 18 }}>
          <Progress.Bar
            progress={GetProgress(currentPage)}
            width={Dimensions.get('window').width - 50}
            color={Colors.WHITE}
            height={10}
          />
        </View>

        {generatingQuiz ? (
          <View
            style={{
              padding: 35,
              backgroundColor: colors.card,
              marginTop: 30,
              borderRadius: 20,
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontFamily: 'outfit-bold', fontSize: 18, marginTop: 14, color: colors.text }}>
              Generating a fresh quiz...
            </Text>
          </View>
        ) : currentQuestion ? (
          <View
            style={{
              padding: 25,
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              marginTop: 26,
              minHeight: Dimensions.get('screen').height * 0.52,
              elevation: 2,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontFamily: 'outfit-bold',
                textAlign: 'center',
                marginBottom: 15,
                color: colors.text,
              }}
            >
              {currentQuestion.question}
            </Text>

            {(currentQuestion.options || []).map((item, index) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedOption(index);
                  OnOptionSelect(item);
                }}
                key={index}
                style={{
                  padding: 18,
                  borderWidth: 1,
                  borderRadius: 15,
                  marginTop: 10,
                  borderColor: selectedOption === index ? colors.green : colors.border,
                  backgroundColor:
                    selectedOption === index ? colors.greenSoft : colors.surface,
                }}
              >
                <Text style={{ fontFamily: 'outfit', fontSize: 17, color: colors.text }}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View
            style={{
              padding: 25,
              backgroundColor: Colors.WHITE,
              marginTop: 30,
              borderRadius: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'outfit', fontSize: 18, textAlign: 'center' }}>
              No quiz questions yet for this course.
            </Text>
            <Button text="Generate Quiz Questions" onPress={onGenerateFreshQuiz} />
          </View>
        )}

        {hasSelection && quiz.length - 1 > currentPage && (
          <Button
            text={'Next'}
            onPress={() => {
              setCurrentPage(currentPage + 1);
              setSelectedOption(null);
            }}
          />
        )}

        {hasSelection && quiz.length - 1 === currentPage && (
          <Button text={'Finish'} loading={loading} onPress={onQuizFinish} />
        )}
      </View>
    </ScrollView>
  );
}
