import { View, Text, Image, Dimensions, ScrollView } from 'react-native'
import React, { useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import * as Progress from 'react-native-progress';
import Button from './../../components/Shared/Button'
import { TouchableOpacity } from 'react-native';
import { db } from './../../config/firebaseConfig'
import { doc, updateDoc } from 'firebase/firestore';

export default function Quiz() {
    const { courseParams } = useLocalSearchParams();
    const course = JSON.parse(courseParams);
    const [currentPage, setCurrentPage] = useState(0);
    const quiz = course?.quiz;
    const [selectedOption, setSelectedOption] = useState();
    const [result, setResult] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const GetProgress = (currentPage) => {
        const perc = (currentPage / quiz?.length);
        return perc;
    }

    const OnOptionSelect = (selectedChoice) => {
        setResult(prev => ({
            ...prev,
            [currentPage]: {
                userChoice: selectedChoice,
                isCorrect: quiz[currentPage]?.correctAns == selectedChoice,
                question: quiz[currentPage]?.question,
                correctAns: quiz[currentPage]?.correctAns
            }
        }));
        console.log(result);
    }

    const onQuizFinish = async () => {
        setLoading(true);
        //save result to database fro quiz
        try {
            await updateDoc(doc(db, 'Courses', course?.docId), {
                quizResult: result
            })
            setLoading(false);

            router.replace({
                pathname: '/quiz/Summary',
                params: {
                    quizResultParam: JSON.stringify(result)
                }
            })
        }
        catch (e) {
            setLoading(false)
        }
        //redirect user to quiz summary
    }
    return (
        <ScrollView>
            <Image source={require('./../../assets/images/wave.png')} style={{
                height: 800,
                width: '100%'
            }} />
            <View style={{
                position: 'absolute',
                padding: 25,
                width: '100%'
            }}>
                <View style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Pressable onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={Colors.WHITE} />
                    </Pressable>
                    <Text style={{
                        fontFamily: 'outfit-bold',
                        fontSize: 25,
                        color: Colors.WHITE
                    }}>{currentPage + 1} of {quiz?.length}</Text>
                </View>

                <View style={{
                    marginTo: 20
                }}>
                    <Progress.Bar progress={GetProgress(currentPage)} width={Dimensions.get('window').width * 0.85}
                        color={Colors.WHITE} height={10} />
                </View>

                <View style={{
                    padding: 25,
                    backgroundColor: Colors.WHITE,
                    marginTop: 30,
                    height: Dimensions.get('screen').height * 0.65,
                    elevation: 2,
                    borderRadius: 20
                }}>
                    <Text style={{
                        fontSize: 28,
                        fontFamily: 'outfit-bold',
                        textAlign: 'center'
                    }}>{quiz[currentPage]?.question}</Text>

                    {quiz[currentPage]?.options.map((item, index) => (
                        <TouchableOpacity
                            onPress={() => { setSelectedOption(index); OnOptionSelect(item) }}
                            key={index} style={{
                                padding: 20,
                                borderWidth: 1,
                                borderRadius: 15,
                                marginTop: 8,
                                borderColor: selectedOption == index ? Colors.GREEN : null,
                                backgroundColor: selectedOption == index ? Colors.LIGTH_GREEN : null
                            }}>
                            <Text style={{
                                fontFamily: 'outfit',
                                fontSize: 20
                            }}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {(selectedOption?.toString() && quiz?.length - 1 > currentPage) && <Button text={'Next'}
                    onPress={() => { setCurrentPage(currentPage + 1); setSelectedOption(null) }} />}

                {(selectedOption?.toString() && quiz?.length - 1 == currentPage) && <Button text={'Finish'}
                    loading={loading}
                    onPress={() => onQuizFinish()} />}
            </View>
        </ScrollView>
    )
}