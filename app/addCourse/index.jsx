import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import React, { useContext, useState } from 'react';
import Colors from '../../constant/Colors';
import Button from '../../components/Shared/Button';
import { GenerateCourseAIModel, GenerateTopicsAIModel } from '../../config/AiModel';
import { UserDetailContext } from '../../context/UserDetailContext';
import Prompt from '../../constant/Prompts';
import { db } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

const getGeminiKey = () => {
  return (
    Constants.expoConfig?.extra?.geminiApiKey ||
    Constants.manifest?.extra?.geminiApiKey
  );
};

export default function AddCourse() {
  const [loading, setLoading] = useState(false);
  const { userDetail } = useContext(UserDetailContext);
  const [userInput, setUserInput] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const router = useRouter();

  const onGenerateTopic = async () => {
    if (!userInput.trim()) {
      Alert.alert('Error', 'User input is empty');
      return;
    }

    const apiKey = getGeminiKey();
    if (!apiKey) {
      Alert.alert('Error', 'Gemini API key is missing. Please check app.json.');
      return;
    }

    setLoading(true);
    try {
      const PROMPT = userInput + Prompt.IDEA;
      const aiResp = await GenerateTopicsAIModel.sendMessage(PROMPT);
      const responseText = await aiResp.response.text();

      if (!responseText.trim()) throw new Error('AI response is empty');

      let extractedTopics = [];

      try {
        const topicIdea = JSON.parse(responseText);
        extractedTopics = Array.isArray(topicIdea)
          ? topicIdea
          : topicIdea?.course_titles || [];
      } catch {
        // fallback for plain text list
        extractedTopics = responseText
          .split('\n')
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(Boolean);
      }

      if (!Array.isArray(extractedTopics) || extractedTopics.length === 0) {
        throw new Error('Failed to extract topics from AI response.');
      }

      setTopics(extractedTopics);
    } catch (error) {
      console.error('Error generating topics:', error.message);
      Alert.alert('Topic Error', error.message);
      setTopics([]);
    }
    setLoading(false);
  };

  const onTopicSelect = topic => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(item => item !== topic)
        : [...prev, topic]
    );
  };

  const onGenerateCourse = async () => {
    if (selectedTopics.length === 0) {
      Alert.alert('Error', 'No topics selected');
      return;
    }

    const apiKey = getGeminiKey();
    if (!apiKey) {
      Alert.alert('Error', 'Gemini API key is missing.');
      return;
    }

    setLoading(true);
    const PROMPT = selectedTopics.join(', ') + Prompt.COURSE;

    try {
      const aiResp = await GenerateCourseAIModel.sendMessage(PROMPT);
      const textResponse = await aiResp.response.text();

      if (!textResponse.trim()) {
        throw new Error('AI response is empty');
      }

      let courses = [];
      try {
        const resp = JSON.parse(textResponse);
        courses = Array.isArray(resp.courses) ? resp.courses : [];
      } catch {
        Alert.alert(
          'Course Format Error',
          'The course content returned was not in valid JSON format.'
        );
        throw new Error('Invalid format from AI. Try refining your prompt or retry.');
      }

      if (!courses.length) {
        throw new Error('AI did not return any courses.');
      }

      for (const course of courses) {
        if (!course || typeof course !== 'object') continue;

        try {
          const docId = Date.now().toString();
          await setDoc(doc(db, 'Courses', docId), {
            ...course,
            createdOn: new Date(),
            createdBy: userDetail?.email ?? '',
            docId: docId,
          });
        } catch (firestoreError) {
          console.log('Error saving course:', firestoreError);
          Alert.alert('Firestore Error', firestoreError.message);
        }
      }

      router.push('/(tabs)/home');
    } catch (error) {
      console.log('Error generating courses:', error.message);
      Alert.alert('Course Error', error.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Create New Course</Text>
      <Text style={styles.subHeader}>What Do You Want To Learn Today?</Text>
      <Text style={styles.description}>
        What course do you want to create (e.g., Learn Python, React JS, Digital Marketing Guide, 10th Science Chapter)?
      </Text>

      <TextInput
        placeholder='(e.g., Learn Python, Learn 12th Chemistry)'
        style={styles.textInput}
        numberOfLines={3}
        multiline={true}
        onChangeText={setUserInput}
        value={userInput}
      />

      <Button text='Generate Topic' type='outline' onPress={onGenerateTopic} loading={loading} />

      {Array.isArray(topics) && topics.length > 0 && (
        <View style={styles.topicContainer}>
          <Text style={styles.selectTopicText}>Select all topics you want to add in the course:</Text>
          <View style={styles.topicList}>
            {topics.map((item, index) => (
              <Pressable key={index} onPress={() => onTopicSelect(item)}>
                <Text
                  style={[
                    styles.topicItem,
                    selectedTopics.includes(item) && styles.selectedTopic,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {selectedTopics.length > 0 && (
        <Button text='Generate Course' onPress={onGenerateCourse} loading={loading} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 25,
    backgroundColor: Colors.WHITE,
    flex: 1,
  },
  header: {
    fontFamily: 'outfit-bold',
    fontSize: 30,
  },
  subHeader: {
    fontFamily: 'outfit',
    fontSize: 25,
  },
  description: {
    fontFamily: 'outfit',
    fontSize: 20,
    marginTop: 8,
    color: Colors.GRAY,
  },
  textInput: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    height: 100,
    marginTop: 10,
    fontSize: 18,
  },
  topicContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  selectTopicText: {
    fontFamily: 'outfit',
    fontSize: 20,
  },
  topicList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  topicItem: {
    padding: 7,
    borderWidth: 0.4,
    borderRadius: 99,
    paddingHorizontal: 15,
    color: Colors.PRIMARY,
  },
  selectedTopic: {
    backgroundColor: Colors.PRIMARY,
    color: Colors.WHITE,
  },
});
