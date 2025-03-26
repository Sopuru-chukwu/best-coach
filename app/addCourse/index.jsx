import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import React, { useContext, useState } from 'react';
import Colors from '../../constant/Colors';
import Button from '../../components/Shared/Button';
import { GenerateCourseAIModel, GenerateTopicsAIModel } from './../../config/AiModel';
import { UserDetailContext } from './../../context/UserDetailContext';
import Prompt from './../../constant/Prompts';
import { db } from './../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';

export default function AddCourse() {
    const [loading, setLoading] = useState(false);
    const { userDetail } = useContext(UserDetailContext);
    const [userInput, setUserInput] = useState('');
    const [topics, setTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const router = useRouter();

    const onGenerateTopic = async () => {
        if (!userInput.trim()) {
            console.log("Error: User input is empty");
            return;
        }
        
        setLoading(true);
        const PROMPT = userInput + Prompt.IDEA;
        try {
            const aiResp = await GenerateTopicsAIModel.sendMessage(PROMPT);
            const textResponse = await aiResp.response.text();
            console.log("AI Response:", textResponse);
            
            if (!textResponse) {
                throw new Error("AI response is empty");
            }
            
            const topicIdea = JSON.parse(textResponse);
            setTopics(Array.isArray(topicIdea) ? topicIdea : []);
        } catch (error) {
            console.log("Error generating topics:", error);
        }
        setLoading(false);
    };

    const onTopicSelect = (topic) => {
        setSelectedTopics(prev => prev.includes(topic) ? prev.filter(item => item !== topic) : [...prev, topic]);
    };

    const onGenerateCourse = async () => {
        if (selectedTopics.length === 0) {
            console.log("Error: No topics selected");
            return;
        }

        setLoading(true);
        const PROMPT = selectedTopics.join(", ") + Prompt.COURSE;

        try {
            const aiResp = await GenerateCourseAIModel.sendMessage(PROMPT);
            const textResponse = await aiResp.response.text();
            console.log("AI Response for Courses:", textResponse);
            
            if (!textResponse) {
                throw new Error("AI response is empty");
            }
            
            const resp = JSON.parse(textResponse);
            const courses = Array.isArray(resp.courses) ? resp.courses : [];
            if (courses.length === 0) {
                throw new Error("Invalid courses format");
            }

            for (const course of courses) {
                try {
                    await setDoc(doc(db, 'Courses', Date.now().toString()), {
                        ...course,
                        createdOn: new Date(),
                        createdBy: userDetail?.email,
                    });
                    console.log("Course saved successfully:", course);
                } catch (error) {
                    console.log("Error saving course to Firestore:", error);
                }
            }
            
            router.push('/(tabs)/home');
        } catch (error) {
            console.log("Error generating courses:", error);
        }
        setLoading(false);
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Create New Course</Text>
            <Text style={styles.subHeader}>What Do You Want To Learn Today?</Text>
            <Text style={styles.description}>What course do you want to create (e.g., Learn Python, React JS, Digital Marketing Guide, 10th Science Chapter)?</Text>

            <TextInput 
                placeholder='(e.g., Learn Python, Learn 12th Chemistry)'
                style={styles.textInput}
                numberOfLines={3}
                multiline={true}
                onChangeText={setUserInput}
                value={userInput}
            />

            <Button text={'Generate Topic'} type='outline' onPress={onGenerateTopic} loading={loading} />

            {topics.length > 0 && (
                <View style={styles.topicContainer}>
                    <Text style={styles.selectTopicText}>Select all topics you want to add in the course:</Text>
                    <View style={styles.topicList}>
                        {topics.map((item, index) => (
                            <Pressable key={index} onPress={() => onTopicSelect(item)}>
                                <Text style={[styles.topicItem, selectedTopics.includes(item) && styles.selectedTopic]}>
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
