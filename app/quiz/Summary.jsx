import { View, Text, Image, StyleSheet, ScrollView, ImageBackground } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '../../constant/Colors';
import Button from '../../components/Shared/Button';

export default function QuizSummary() {
  const { quizResultParam } = useLocalSearchParams();
  const quizResult = JSON.parse(quizResultParam);
  const [correctAns, setCorrectAns] = useState(0);
  const [totalQuestion, setTotalQuestion] = useState(0);
  const router = useRouter();

  useEffect(() => {
    quizResult && CalculateResult();
  }, [quizResult]);

  const CalculateResult = () => {
    if (quizResult !== undefined) {
      const correctAns_ = Object.entries(quizResult)?.filter(
        ([key, value]) => value?.isCorrect === true
      );
      setCorrectAns(correctAns_.length);
      setTotalQuestion(Object.keys(quizResult).length);
    }
  };

  const GetPercMark = () => {
    return ((correctAns / totalQuestion) * 100).toFixed(0);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <ImageBackground
        source={require('./../../assets/images/wave.png')}
        style={styles.headerBackground}
        resizeMode="cover"
      >
        <Text style={styles.headerText}>Quiz Summary</Text>
      </ImageBackground>

      <View style={styles.contentContainer}>
        <View style={styles.resultCard}>
          <Image
            source={require('./../../assets/images/trophy.png')}
            style={styles.trophy}
          />
          <Text style={styles.resultTitle}>
            {GetPercMark() > 60 ? 'Congratulations!' : 'Try Again!'}
          </Text>
          <Text style={styles.resultSubtitle}>
            You gave {GetPercMark()}% Correct answer
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.resultTextContainer}>
              <Text style={styles.resultText}>Q {totalQuestion}</Text>
            </View>
            <View style={styles.resultTextContainer}>
              <Text style={styles.resultText}>✅ {correctAns}</Text>
            </View>
            <View style={styles.resultTextContainer}>
              <Text style={styles.resultText}>❌ {totalQuestion - correctAns}</Text>
            </View>
          </View>
        </View>

        <Button text={'Back To Home'} onPress={() => router.replace('/(tabs)/home')} />

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryHeader}>Summary</Text>

          {Object.entries(quizResult).map(([key, quizItem], index) => (
            <View
              key={index}
              style={{
                padding: 15,
                borderWidth: 1,
                marginTop: 5,
                borderRadius: 15,
                backgroundColor:
                  quizItem?.isCorrect == true ? Colors.LIGTH_GREEN : Colors.LIGHT_RED,
                borderColor: quizItem?.isCorrect == true ? Colors.GREEN : Colors.RED,
              }}
            >
              <Text style={styles.questionText}>{quizItem.question}</Text>
              <Text style={styles.answerText}>Ans: {quizItem?.correctAns}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 50,
    backgroundColor: Colors.WHITE,
  },
  headerBackground: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 70
  },
  headerText: {
    fontFamily: 'outfit-bold',
    fontSize: 30,
    color: Colors.WHITE,
    textAlign: 'center',
  },
  contentContainer: {
    padding: 25,
  },
  resultCard: {
    backgroundColor: Colors.WHITE,
    padding: 20,
    borderRadius: 20,
    marginTop: -60,
    alignItems: 'center',
    shadowColor: '#000',
    elevation: 3,
  },
  trophy: {
    width: 100,
    height: 100,
    marginTop: -60,
  },
  resultTitle: {
    fontSize: 20,
    fontFamily: 'outfit-bold',
  },
  resultSubtitle: {
    fontFamily: 'outfit',
    color: Colors.GRAY,
    fontSize: 17,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  resultTextContainer: {
    padding: 15,
    backgroundColor: Colors.WHITE,
    elevation: 1,
    borderRadius: 10,
  },
  resultText: {
    fontFamily: 'outfit',
    fontSize: 20,
  },
  summaryContainer: {
    marginTop: 25,
  },
  summaryHeader: {
    fontFamily: 'outfit-bold',
    fontSize: 25,
  },
  questionText: {
    fontFamily: 'outfit',
    fontSize: 20,
  },
  answerText: {
    fontFamily: 'outfit',
    fontSize: 15,
    marginTop: 5,
  },
});
