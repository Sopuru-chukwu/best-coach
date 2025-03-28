import { View, Text, Dimensions, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Progress from 'react-native-progress';
import Colors from '../../constant/Colors';
import Button from '../../components/Shared/Button';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function ChapterView() {
    const { chapterParams, docId, chapterIndex } = useLocalSearchParams();
    const chapters = JSON.parse(chapterParams);
    const [currentPage, setCurrentPage] = useState(0);
    const [loader, setLoader] = useState(false);
    const router = useRouter();

    const GetProgress = (currentPage) => {
        return currentPage / chapters?.content?.length;
    };

    const onChapterComplete = async () => {
        setLoader(true);

        try {
            await updateDoc(doc(db, 'Courses', docId), {
                completedChapter: arrayUnion(parseInt(chapterIndex)) // Ensure index is stored as number
            });
            console.log(`✅ Chapter ${chapterIndex} marked as completed`);
        } catch (error) {
            console.error("❌ Error updating Firestore:", error);
        }

        setLoader(false);

        // 🔹 Redirect with a refresh parameter to force re-fetch
        router.replace({
            pathname: '/courseView/' + docId,
            params: { refresh: Math.random() } // Random param to trigger refresh
        });
    };

    return (
        <View style={{
            padding: 25,
            backgroundColor: Colors.WHITE,
            flex: 1
        }}>
            <Progress.Bar progress={GetProgress(currentPage)} width={Dimensions.get('screen').width * 0.85} />
            <View style={{ marginTop: 20 }}>
                <Text style={{ fontFamily: 'outfit-bold', fontSize: 25 }}>
                    {chapters?.content[currentPage]?.topic}
                </Text>
                <Text style={{ fontFamily: 'outfit', fontSize: 20, marginTop: 7 }}>
                    {chapters?.content[currentPage]?.explain}
                </Text>

                {chapters?.content[currentPage]?.code && (
                    <Text style={[styles.codeExampleText, { backgroundColor: Colors.BLACK, color: Colors.WHITE }]}>
                        {chapters?.content[currentPage]?.code}
                    </Text>
                )}
                {chapters?.content[currentPage]?.example && (
                    <Text style={styles.codeExampleText}>{chapters?.content[currentPage]?.example}</Text>
                )}
            </View>
            <View style={{
                position: 'absolute',
                bottom: 10,
                width: '100%',
                left: 25
            }}>
                {currentPage < chapters?.content?.length - 1 ? (
                    <Button text={'Next'} onPress={() => setCurrentPage(currentPage + 1)} />
                ) : (
                    <Button text={'Finish'} onPress={() => onChapterComplete()} loading={loader} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    codeExampleText: {
        padding: 15,
        backgroundColor: Colors.BG_GRAY,
        borderRadius: 15,
        fontFamily: 'outfit',
        fontSize: 18,
        marginTop: 15
    }
});
