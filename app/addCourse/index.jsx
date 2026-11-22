import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import React, { useContext, useState } from 'react';
import Button from '../../components/Shared/Button';
import {
  extractJsonText,
  generateCourseSyllabus,
  generateTopics,
  isAiConfigured,
} from '../../config/AiModel';
import { UserDetailContext } from '../../context/UserDetailContext';
import {
  buildTopicIdeaPrompt,
  LEARNER_LEVELS,
  recommendTeachingStyle,
  TEACHING_STYLE_DETAILS,
  TEACHING_STYLES,
} from '../../constant/Prompts';
import { db } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { tapLight, tapSelection } from '../../config/haptics';
import DiagnosticModal from '../../components/AddCourse/DiagnosticModal';
import { getFriendlyErrorMessage } from '../../config/errorMessages';
import { useTutorial } from '../../context/TutorialContext';
import CoachMarkTour from '../../components/Shared/CoachMarkTour';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

async function readUriAsBase64(uri) {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || '');
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const file = new File(uri);
  return file.base64();
}

export default function AddCourse() {
  const [topicLoading, setTopicLoading] = useState(false);
  const [courseLoading, setCourseLoading] = useState(false);
  const { userDetail } = useContext(UserDetailContext);
  const [userInput, setUserInput] = useState('');
  const [sourceNotes, setSourceNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [attachment, setAttachment] = useState(null); // { name, mimeType, data }
  const [level, setLevel] = useState(
    userDetail?.preferredLevel || LEARNER_LEVELS[0]
  );
  const [style, setStyle] = useState(
    userDetail?.preferredStyle || TEACHING_STYLES[0]
  );
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);
  const { colors } = useTheme();
  const { shouldShow, markSeen, skipAllTours } = useTutorial();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const recommendedStyle = recommendTeachingStyle(`${userInput} ${sourceNotes}`);

  const onPickPhoto = async () => {
    tapLight();
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow photo library access to upload study photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.65,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = asset.base64 || (await readUriAsBase64(asset.uri));
      const mimeType = asset.mimeType || 'image/jpeg';

      setAttachment({
        name: asset.fileName || 'Textbook photo',
        mimeType,
        data: base64,
      });
    } catch (err) {
      console.error('Photo picker error:', err);
      Alert.alert(
        'Photo Error',
        getFriendlyErrorMessage(err, 'Could not load the selected photo. Please try another one.')
      );
    }
  };

  const onPickDocument = async () => {
    tapLight();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'text/markdown'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      if (asset.size && asset.size > MAX_ATTACHMENT_BYTES) {
        Alert.alert('File Too Large', 'Please pick a PDF or text file under 5 MB.');
        return;
      }

      const mimeType = asset.mimeType || 'application/pdf';
      const base64 = await readUriAsBase64(asset.uri);

      setAttachment({
        name: asset.name || 'Study document',
        mimeType,
        data: base64,
      });
    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert(
        'Document Error',
        getFriendlyErrorMessage(err, 'Could not read that file. Please try another PDF or text file.')
      );
    }
  };

  const onGenerateTopic = async () => {
    if (!userInput.trim() && !sourceNotes.trim() && !attachment) {
      Alert.alert(
        'Add a Topic or Material',
        'Enter a topic, paste your notes, or attach a PDF/photo first.'
      );
      return;
    }

    if (!isAiConfigured()) {
      console.warn('AI configuration missing (EXPO_PUBLIC_AI_PROXY_URL / EXPO_PUBLIC_GEMINI_API_KEY).');
      Alert.alert(
        'Service Unavailable',
        'Course generation is temporarily unavailable. Please try again later.'
      );
      return;
    }

    setTopicLoading(true);
    try {
      const prompt = buildTopicIdeaPrompt({
        userInput: userInput.trim(),
        level,
        style,
        sourceNotes,
        hasAttachment: Boolean(attachment),
      });
      const responseText = await generateTopics(
        prompt,
        attachment ? [attachment] : []
      );

      let extractedTopics = [];
      try {
        const parsed = JSON.parse(extractJsonText(responseText));
        extractedTopics = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.course_titles)
            ? parsed.course_titles
            : Array.isArray(parsed?.topics)
              ? parsed.topics
              : [];
      } catch {
        extractedTopics = responseText
          .split('\n')
          .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
          .filter(Boolean);
      }

      extractedTopics = extractedTopics
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);

      if (extractedTopics.length === 0) {
        throw new Error('Could not find topic ideas for that input. Try being more specific.');
      }

      setTopics(extractedTopics);
      setSelectedTopics([]);
    } catch (error) {
      console.error('Error generating topics:', error?.message || error);
      Alert.alert(
        'Could Not Generate Topics',
        getFriendlyErrorMessage(error, 'We could not generate topic ideas right now. Please try again.')
      );
      setTopics([]);
    } finally {
      setTopicLoading(false);
    }
  };

  const onTopicSelect = (topic) => {
    tapSelection();
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((item) => item !== topic)
        : [...prev, topic]
    );
  };

  const onGenerateCourse = async () => {
    if (selectedTopics.length === 0) {
      Alert.alert('Error', 'Please select at least one topic.');
      return;
    }

    if (!isAiConfigured()) {
      console.warn('AI configuration missing (EXPO_PUBLIC_AI_PROXY_URL / EXPO_PUBLIC_GEMINI_API_KEY).');
      Alert.alert(
        'Service Unavailable',
        'Course generation is temporarily unavailable. Please try again later.'
      );
      return;
    }

    setCourseLoading(true);
    try {
      const textResponse = await generateCourseSyllabus({
        topics: selectedTopics,
        level,
        style,
        sourceNotes,
        attachments: attachment ? [attachment] : [],
        diagnosticSummary: diagnosticInfo?.summary || '',
      });

      let courses = [];
      try {
        const resp = JSON.parse(extractJsonText(textResponse));
        courses = Array.isArray(resp?.courses)
          ? resp.courses
          : Array.isArray(resp)
            ? resp
            : resp?.courseTitle
              ? [resp]
              : [];
      } catch {
        throw new Error(
          'We had trouble building your course outline. Please try again.'
        );
      }

      if (!courses.length) {
        throw new Error('We could not create a course for those topics. Please try again.');
      }

      const timestamp = Date.now();
      let firstSavedCourse = null;

      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        if (!course || typeof course !== 'object') continue;

        const normalizedChapters = Array.isArray(course.chapters)
          ? course.chapters.map((ch) => ({
              ...ch,
              content: Array.isArray(ch?.content) ? ch.content : [],
              isDetailed: Array.isArray(ch?.content) && ch.content.length > 0,
            }))
          : [];

        const docId = `${timestamp}_${i}`;
        const courseData = {
          ...course,
          level: course.level || level,
          style: course.style || style,
          sourceNotes: sourceNotes.trim().slice(0, 3000),
          chapters: normalizedChapters,
          completedChapter: [],
          createdOn: new Date(),
          createdBy: userDetail?.email ?? '',
          docId,
        };

        try {
          await setDoc(doc(db, 'Courses', docId), courseData);
          if (!firstSavedCourse) {
            firstSavedCourse = courseData;
          }
        } catch (firestoreError) {
          console.error('Error saving course:', firestoreError);
          Alert.alert(
            'Could Not Save Course',
            getFriendlyErrorMessage(firestoreError, 'We could not save your course right now. Please try again.')
          );
        }
      }

      if (firstSavedCourse) {
        router.replace({
          pathname: '/courseView/' + firstSavedCourse.docId,
          params: {
            courseParams: JSON.stringify(firstSavedCourse),
            courseId: firstSavedCourse.docId,
            enroll: 'false',
          },
        });
      }
    } catch (error) {
      console.error('Error generating courses:', error?.message || error);
      Alert.alert(
        'Could Not Build Course',
        getFriendlyErrorMessage(error, 'We could not generate your course right now. Please try again.')
      );
    } finally {
      setCourseLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>

      <Text style={[styles.header, { color: colors.text }]}>Create New Course</Text>
      <Text style={[styles.subHeader, { color: colors.text }]}>What Do You Want To Learn Today?</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>
        Enter any topic—or upload a PDF, textbook photo, or paste your lecture notes so your coach teaches directly from your material.
      </Text>

      <TextInput
        placeholder="(e.g., Learn Python, 12th Chemistry, UI Design)"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.textInput,
          {
            borderColor: colors.border,
            backgroundColor: colors.inputBg,
            color: colors.text,
          },
        ]}
        numberOfLines={3}
        multiline={true}
        onChangeText={setUserInput}
        value={userInput}
      />

      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Optional: Learn From Your Own Material
      </Text>
      <View style={styles.materialRow}>
        <Pressable
          onPress={() => {
            tapSelection();
            setShowNotesInput((prev) => !prev);
          }}
          style={[
            styles.materialBtn,
            {
              backgroundColor: showNotesInput || sourceNotes.trim() ? colors.primarySoft : colors.card,
              borderColor: showNotesInput || sourceNotes.trim() ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={[styles.materialBtnText, { color: colors.text }]}>
            Paste Notes
          </Text>
        </Pressable>

        <Pressable
          onPress={onPickPhoto}
          style={[
            styles.materialBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="image-outline" size={18} color={colors.primary} />
          <Text style={[styles.materialBtnText, { color: colors.text }]}>
            Photo
          </Text>
        </Pressable>

        <Pressable
          onPress={onPickDocument}
          style={[
            styles.materialBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="attach-outline" size={18} color={colors.primary} />
          <Text style={[styles.materialBtnText, { color: colors.text }]}>
            PDF / Text
          </Text>
        </Pressable>
      </View>

      {showNotesInput && (
        <TextInput
          placeholder="Paste lecture notes, syllabus bullets, or study guide text here..."
          placeholderTextColor={colors.textMuted}
          value={sourceNotes}
          onChangeText={setSourceNotes}
          multiline
          style={[
            styles.notesInput,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              color: colors.text,
            },
          ]}
        />
      )}

      {attachment && (
        <View
          style={[
            styles.attachmentChip,
            { backgroundColor: colors.primarySoft, borderColor: colors.primary },
          ]}
        >
          <Ionicons
            name={attachment.mimeType.startsWith('image/') ? 'image' : 'document'}
            size={18}
            color={colors.primary}
          />
          <Text
            style={[styles.attachmentName, { color: colors.text }]}
            numberOfLines={1}
          >
            {attachment.name}
          </Text>
          <Pressable onPress={() => setAttachment(null)}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
        <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>
          Your Level
        </Text>
        <Pressable
          onPress={() => {
            if (!userInput.trim()) {
              Alert.alert('Enter a Topic First', 'Type a subject above to run a 3-question skill check.');
              return;
            }
            tapLight();
            setDiagOpen(true);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: colors.primarySoft,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 99,
          }}
        >
          <Ionicons name="speedometer-outline" size={14} color={colors.primary} />
          <Text style={{ fontFamily: 'outfit-bold', fontSize: 12, color: colors.primary }}>
            {diagnosticInfo
              ? `Placed: ${diagnosticInfo.level} (${diagnosticInfo.score}/${diagnosticInfo.total})`
              : '3-Q Skill Check'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.chipRow}>
        {LEARNER_LEVELS.map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              tapSelection();
              setLevel(item);
            }}
          >
            <Text
              style={[
                styles.chip,
                { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                level === item && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  color: colors.white,
                },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.text }]}>Teaching Style</Text>
      <View style={{ gap: 8 }}>
        {TEACHING_STYLES.map((item) => {
          const active = style === item;
          const info = TEACHING_STYLE_DETAILS[item];
          const isRecommended = Boolean(userInput.trim() || sourceNotes.trim()) && recommendedStyle === item;
          return (
            <Pressable
              key={item}
              onPress={() => {
                tapSelection();
                setStyle(item);
              }}
              style={[
                styles.styleCard,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primarySoft : colors.card,
                },
              ]}
            >
              <View style={styles.styleCardTop}>
                <Ionicons
                  name={info?.icon || 'sparkles-outline'}
                  size={18}
                  color={active ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.styleCardTitle,
                    { color: active ? colors.primary : colors.text, flex: 1 },
                  ]}
                >
                  {item}
                </Text>
                {isRecommended && (
                  <Text
                    style={[
                      styles.recBadge,
                      { backgroundColor: colors.greenSoft, color: colors.green },
                    ]}
                  >
                    Recommended
                  </Text>
                )}
              </View>
              {!!info?.shortGoal && (
                <Text style={[styles.styleCardGoal, { color: colors.text }]}>
                  {info.shortGoal}
                </Text>
              )}
              {!!info?.description && (
                <Text style={[styles.styleCardDesc, { color: colors.textMuted }]}>
                  {info.description}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Button
        text="Generate Topic Ideas"
        type="outline"
        onPress={onGenerateTopic}
        loading={topicLoading}
      />

      {Array.isArray(topics) && topics.length > 0 && (
        <View style={styles.topicContainer}>
          <Text style={[styles.selectTopicText, { color: colors.text }]}>
            Select topics to include in your course:
          </Text>
          <View style={styles.topicList}>
            {topics.map((item, index) => (
              <Pressable key={index} onPress={() => onTopicSelect(item)}>
                <Text
                  style={[
                    styles.topicItem,
                    { borderColor: colors.primary, color: colors.primary },
                    selectedTopics.includes(item) && {
                      backgroundColor: colors.primary,
                      color: colors.white,
                    },
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
        <Button
          text="Build Course Syllabus"
          onPress={onGenerateCourse}
          loading={courseLoading}
        />
      )}

      <DiagnosticModal
        visible={diagOpen}
        onClose={() => setDiagOpen(false)}
        topic={userInput.trim()}
        onComplete={(result) => {
          setDiagnosticInfo(result);
          if (result?.level) setLevel(result.level);
        }}
      />

      <CoachMarkTour
        visible={shouldShow('addCourse')}
        onFinish={() => markSeen('addCourse')}
        onSkipAll={skipAllTours}
        steps={[
          {
            title: 'Enter a Topic or Upload Notes',
            icon: 'document-text-outline',
            position: 'top',
            description:
              'Type anything you want to learn—or tap Paste Notes, Photo, or PDF to generate a course straight from your textbook or class slides.',
            tip: 'Specific prompts like "Python for data analysis" produce even sharper lessons.',
          },
          {
            title: 'Set Your Level (or Test It)',
            icon: 'speedometer-outline',
            position: 'center',
            description:
              'Choose Beginner, Intermediate, or Advanced—or tap "3-Q Skill Check" so your coach gauges what you already know and skips the basics.',
          },
          {
            title: 'Pick Your Teaching Style',
            icon: 'bulb-outline',
            position: 'center',
            description:
              'Each card explains what it fits best: Hands-on for projects, Exam Prep for tests/interviews, or Deep Theory for first principles. A "Recommended" badge updates as you type!',
          },
          {
            title: 'Generate Topics & Build',
            icon: 'rocket-outline',
            position: 'bottom',
            description:
              'Tap "Generate Topic Ideas", select the modules you want to study, then tap "Build Course Syllabus" to launch your course.',
            actionLabel: 'Let’s Create!',
          },
        ]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  header: {
    fontFamily: 'outfit-bold',
    fontSize: 30,
  },
  subHeader: {
    fontFamily: 'outfit',
    fontSize: 21,
    marginTop: 4,
  },
  description: {
    fontFamily: 'outfit',
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  textInput: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    height: 92,
    marginTop: 14,
    fontSize: 17,
    fontFamily: 'outfit',
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
    marginTop: 16,
    marginBottom: 8,
  },
  materialRow: {
    flexDirection: 'row',
    gap: 8,
  },
  materialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  materialBtnText: {
    fontFamily: 'outfit-medium',
    fontSize: 13,
  },
  notesInput: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 110,
    fontFamily: 'outfit',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  attachmentChip: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  attachmentName: {
    flex: 1,
    fontFamily: 'outfit-medium',
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 99,
    fontFamily: 'outfit',
    fontSize: 14,
  },
  styleCard: {
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 13,
  },
  styleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  styleCardTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
  },
  recBadge: {
    fontFamily: 'outfit-bold',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  styleCardGoal: {
    fontFamily: 'outfit-medium',
    fontSize: 13,
    marginTop: 5,
  },
  styleCardDesc: {
    fontFamily: 'outfit',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  topicContainer: {
    marginTop: 18,
    marginBottom: 10,
  },
  selectTopicText: {
    fontFamily: 'outfit-bold',
    fontSize: 18,
  },
  topicList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  topicItem: {
    padding: 8,
    borderWidth: 0.8,
    borderRadius: 99,
    paddingHorizontal: 15,
    fontFamily: 'outfit',
  },
});
