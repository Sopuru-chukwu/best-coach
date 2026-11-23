import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Progress from 'react-native-progress';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import Button from '../../components/Shared/Button';
import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { generateChapterLesson } from '../../config/AiModel';
import AskCoachModal from '../../components/ChapterView/AskCoachModal';
import { UserDetailContext } from '../../context/UserDetailContext';
import { recordStudyActivity } from '../../config/learningStats';
import { loadCachedChapter, saveCachedChapter } from '../../config/offlineCache';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { LessonSkeleton } from '../../components/Shared/SkeletonLoader';
import { notifySuccess, tapLight, tapSelection } from '../../config/haptics';
import FormattedText from '../../components/Shared/FormattedText';
import { copyOrShareText } from '../../config/clipboard';
import {
  loadBookmarks,
  loadFontSize,
  loadLessonNote,
  saveFontSize,
  saveLessonNote,
  toggleBookmark,
} from '../../config/bookmarksStore';
import {
  buildLessonSpeechScript,
  SPEECH_RATES,
  speakText,
  stopSpeaking,
} from '../../config/voiceCoach';
import {
  ComparisonTableCard,
  ConceptFlowCard,
} from '../../components/ChapterView/VisualDiagramCard';
import { getFriendlyErrorMessage } from '../../config/errorMessages';
import { useTutorial } from '../../context/TutorialContext';
import CoachMarkTour from '../../components/Shared/CoachMarkTour';
import { getCachedCourse, updateCachedCourse } from '../../config/courseStore';

const firstParam = (val) => (Array.isArray(val) ? val[0] : val);

export default function ChapterView() {
  const params = useLocalSearchParams();
  const resolvedDocId = firstParam(params.docId) || '';
  const resolvedChapterIndex = parseInt(firstParam(params.chapterIndex) ?? '', 10);
  const courseTitle = firstParam(params.courseTitle) || '';
  const courseDescription = firstParam(params.courseDescription) || '';
  const level = firstParam(params.level) || 'Beginner';
  const style = firstParam(params.style) || 'Hands-on & Examples';
  const sourceNotes = firstParam(params.sourceNotes) || '';

  // The chapter outline comes from the course the previous screen cached; if the
  // app was reloaded, loadOrGenerateChapter fills it in from Firestore.
  const [initialChapter, setInitialChapter] = useState(
    () => getCachedCourse(resolvedDocId)?.chapters?.[resolvedChapterIndex] ?? null
  );

  const [contentList, setContentList] = useState(
    Array.isArray(initialChapter?.content) ? initialChapter.content : []
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showCheckAnswer, setShowCheckAnswer] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [loader, setLoader] = useState(false);
  const [fontSize, setFontSize] = useState(17);
  const [bookmarked, setBookmarked] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechRateIdx, setSpeechRateIdx] = useState(1); // 1.0x
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const { colors } = useTheme();
  const { shouldShow, markSeen, skipAllTours } = useTutorial();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const router = useRouter();

  const loadOrGenerateChapter = async () => {
    let chapterMeta = initialChapter;
    setGenerating(true);
    setGenError('');
    try {
      // 1. Check local offline cache first for instant / offline loading
      if (resolvedDocId && !Number.isNaN(resolvedChapterIndex)) {
        const localCached = await loadCachedChapter(resolvedDocId, resolvedChapterIndex);
        if (localCached) {
          setContentList(localCached);
          setGenerating(false);
          return;
        }
      }

      // 2. Check Firestore in case this chapter was already generated on another device
      if (resolvedDocId && !Number.isNaN(resolvedChapterIndex)) {
        try {
          const snap = await getDoc(doc(db, 'Courses', resolvedDocId));
          if (snap.exists()) {
            const dbChapters = snap.data()?.chapters;
            const dbChapter = dbChapters?.[resolvedChapterIndex];
            if (dbChapter && !chapterMeta) {
              chapterMeta = dbChapter;
              setInitialChapter(dbChapter);
            }
            const cachedContent = dbChapter?.content;
            if (Array.isArray(cachedContent) && cachedContent.length > 0) {
              setContentList(cachedContent);
              saveCachedChapter(resolvedDocId, resolvedChapterIndex, cachedContent);
              setGenerating(false);
              return;
            }
          }
        } catch {
          // Proceed to generate if cache lookup fails
        }
      }

      const generatedContent = await generateChapterLesson({
        courseTitle: courseTitle || chapterMeta?.chapterName || 'Course',
        courseDescription,
        chapterName: chapterMeta?.chapterName || 'Chapter',
        chapterSummary: chapterMeta?.summary || '',
        learningGoal: chapterMeta?.learningGoal || '',
        level,
        style,
        sourceNotes,
      });

      setContentList(generatedContent);
      saveCachedChapter(resolvedDocId, resolvedChapterIndex, generatedContent);
      updateCachedCourse(resolvedDocId, (prev) => ({
        chapters: (prev.chapters || []).map((ch, idx) =>
          idx === resolvedChapterIndex ? { ...ch, content: generatedContent, isDetailed: true } : ch
        ),
      }));

      // Persist generated deep chapter content back to Firestore so reopening is instant
      if (resolvedDocId && !Number.isNaN(resolvedChapterIndex)) {
        try {
          const courseRef = doc(db, 'Courses', resolvedDocId);
          const snap = await getDoc(courseRef);
          if (snap.exists()) {
            const existingChapters = Array.isArray(snap.data()?.chapters)
              ? [...snap.data().chapters]
              : [];
            if (existingChapters[resolvedChapterIndex]) {
              existingChapters[resolvedChapterIndex] = {
                ...existingChapters[resolvedChapterIndex],
                content: generatedContent,
                isDetailed: true,
              };
              await updateDoc(courseRef, { chapters: existingChapters });
            }
          }
        } catch (cacheErr) {
          console.error('Could not cache generated chapter in Firestore:', cacheErr);
        }
      }
    } catch (err) {
      console.error('Chapter generation error:', err);
      setGenError(
        getFriendlyErrorMessage(err, 'Could not load this chapter lesson right now. Please tap Retry.')
      );
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (contentList.length > 0 && resolvedDocId && !Number.isNaN(resolvedChapterIndex)) {
      saveCachedChapter(resolvedDocId, resolvedChapterIndex, contentList);
    } else if (!contentList.length && (initialChapter?.chapterName || resolvedDocId)) {
      loadOrGenerateChapter();
    }
  }, []);

  const goToPage = (nextPage) => {
    stopSpeaking();
    setSpeaking(false);
    setCurrentPage(nextPage);
    setShowCheckAnswer(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const GetProgress = (page) => {
    if (!contentList.length) return 0;
    return Math.min(1, (page + 1) / contentList.length);
  };

  const onChapterComplete = async () => {
    setLoader(true);

    try {
      if (resolvedDocId && !Number.isNaN(resolvedChapterIndex)) {
        await updateDoc(doc(db, 'Courses', resolvedDocId), {
          completedChapter: arrayUnion(resolvedChapterIndex),
        });
        updateCachedCourse(resolvedDocId, (prev) => ({
          completedChapter: [...new Set([...(prev.completedChapter || []), resolvedChapterIndex])],
        }));
      }
      await recordStudyActivity(userDetail, setUserDetail);
      notifySuccess();
    } catch (error) {
      console.error('Error updating Firestore:', error);
    } finally {
      setLoader(false);
    }

    if (resolvedDocId) {
      router.replace({
        pathname: '/courseView/' + resolvedDocId,
        params: { refresh: String(Date.now()) },
      });
    } else {
      router.back();
    }
  };

  const currentItem = contentList[currentPage];
  const lessonBookmarkId = `${resolvedDocId || courseTitle}_${resolvedChapterIndex}_${currentPage}`;

  useEffect(() => {
    loadFontSize(17).then(setFontSize);
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!currentItem) return;
    setCopiedCode(false);
    setNoteSaved(false);
    loadBookmarks().then((list) => {
      setBookmarked(list.some((b) => b.id === lessonBookmarkId));
    });
    loadLessonNote(lessonBookmarkId).then(setNoteText);
  }, [lessonBookmarkId, currentItem]);

  const adjustFontSize = (delta) => {
    tapSelection();
    setFontSize((prev) => {
      const next = Math.max(14, Math.min(22, prev + delta));
      saveFontSize(next);
      return next;
    });
  };

  const handleToggleBookmark = async () => {
    if (!currentItem) return;
    tapLight();
    const { isBookmarked } = await toggleBookmark(
      {
        id: lessonBookmarkId,
        courseId: resolvedDocId,
        courseTitle: courseTitle || 'Course',
        chapterName: initialChapter?.chapterName || 'Chapter',
        chapterIndex: Number.isNaN(resolvedChapterIndex) ? 0 : resolvedChapterIndex,
        topic: currentItem.topic || 'Lesson',
        keyTakeaway: currentItem.keyTakeaway || currentItem.explain?.slice(0, 180) || '',
      },
      userDetail?.email || ''
    );
    setBookmarked(isBookmarked);
  };

  const handleCopyCode = async () => {
    if (!currentItem?.code) return;
    tapLight();
    const status = await copyOrShareText(currentItem.code, currentItem.topic || 'Code');
    if (status === 'copied' || status === 'shared') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSaveNote = async () => {
    tapLight();
    await saveLessonNote(lessonBookmarkId, noteText);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 1800);
  };

  const handleToggleSpeech = () => {
    tapLight();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const script = buildLessonSpeechScript(currentItem);
    if (!script) return;
    setSpeaking(true);
    speakText(script, {
      rate: SPEECH_RATES[speechRateIdx],
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const cycleSpeechRate = () => {
    tapSelection();
    const nextIdx = (speechRateIdx + 1) % SPEECH_RATES.length;
    setSpeechRateIdx(nextIdx);
    if (speaking) {
      const script = buildLessonSpeechScript(currentItem);
      speakText(script, {
        rate: SPEECH_RATES[nextIdx],
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.chapterHeaderTitle, { color: colors.text }]} numberOfLines={1}>
            {initialChapter?.chapterName || 'Chapter Lesson'}
          </Text>
          {contentList.length > 0 && (
            <Text style={[styles.pageCounter, { color: colors.textMuted }]}>
              Lesson {currentPage + 1} of {contentList.length}
            </Text>
          )}
        </View>
        {contentList.length > 0 && (
          <Pressable
            onPress={() => setCoachOpen(true)}
            style={[styles.coachPill, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="sparkles" size={16} color={colors.white} />
            <Text style={styles.coachPillText}>Ask Coach</Text>
          </Pressable>
        )}
      </View>

      <Progress.Bar
        progress={GetProgress(currentPage)}
        width={Dimensions.get('screen').width - 44}
        color={colors.primary}
        unfilledColor={colors.cardAlt}
        borderWidth={0}
        height={8}
      />

      {contentList.length > 0 && !generating && !genError && (
        <View style={styles.readingBar}>
          <View style={styles.readingGroup}>
            <Pressable
              onPress={() => adjustFontSize(-1)}
              style={[styles.toolBtn, { backgroundColor: colors.cardAlt }]}
            >
              <Text style={[styles.toolBtnText, { color: colors.text }]}>A-</Text>
            </Pressable>
            <Pressable
              onPress={() => adjustFontSize(1)}
              style={[styles.toolBtn, { backgroundColor: colors.cardAlt }]}
            >
              <Text style={[styles.toolBtnText, { color: colors.text }]}>A+</Text>
            </Pressable>
          </View>

          <View style={styles.readingGroup}>
            <Pressable
              onPress={handleToggleSpeech}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: speaking ? colors.primary : colors.cardAlt,
                },
              ]}
            >
              <Ionicons
                name={speaking ? 'stop-circle' : 'volume-high-outline'}
                size={16}
                color={speaking ? colors.white : colors.text}
              />
              <Text
                style={[
                  styles.toolBtnText,
                  { color: speaking ? colors.white : colors.text },
                ]}
              >
                {speaking ? 'Stop' : 'Listen'}
              </Text>
            </Pressable>

            {speaking && (
              <Pressable
                onPress={cycleSpeechRate}
                style={[styles.toolBtn, { backgroundColor: colors.primarySoft }]}
              >
                <Text style={[styles.toolBtnText, { color: colors.primary }]}>
                  {SPEECH_RATES[speechRateIdx]}x
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                tapSelection();
                setNoteOpen((prev) => !prev);
              }}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: noteOpen || noteText.trim() ? colors.primarySoft : colors.cardAlt,
                },
              ]}
            >
              <Ionicons
                name={noteText.trim() ? 'document-text' : 'document-text-outline'}
                size={16}
                color={noteOpen || noteText.trim() ? colors.primary : colors.text}
              />
              <Text
                style={[
                  styles.toolBtnText,
                  { color: noteOpen || noteText.trim() ? colors.primary : colors.text },
                ]}
              >
                Note
              </Text>
            </Pressable>

            <Pressable
              onPress={handleToggleBookmark}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: bookmarked ? colors.amberSoft : colors.cardAlt,
                },
              ]}
            >
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={bookmarked ? colors.amber : colors.text}
              />
              <Text
                style={[
                  styles.toolBtnText,
                  { color: bookmarked ? colors.amber : colors.text },
                ]}
              >
                {bookmarked ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {generating ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingTitle, { color: colors.text, marginTop: 0, textAlign: 'left', fontSize: 17 }]}>
              Your coach is preparing this chapter...
            </Text>
          </View>
          <Text style={[styles.loadingSubtitle, { color: colors.textMuted, textAlign: 'left', marginTop: 6 }]}>
            Writing explanations, worked examples, pitfalls & check questions for {level}.
          </Text>
          <LessonSkeleton />
        </ScrollView>
      ) : genError ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.red} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>
            Couldn't load this lesson
          </Text>
          <Text style={[styles.loadingSubtitle, { color: colors.textMuted }]}>{genError}</Text>
          <View style={{ width: '100%', marginTop: 12 }}>
            <Button text="Retry Lesson" onPress={loadOrGenerateChapter} />
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, marginTop: 16 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
            showsVerticalScrollIndicator={false}
          >
            {currentItem ? (
              <>
                {noteOpen && (
                  <View
                    style={[
                      styles.noteCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.cardLabel, { color: colors.primary, marginBottom: 6 }]}>
                      Personal Study Note
                    </Text>
                    <TextInput
                      value={noteText}
                      onChangeText={setNoteText}
                      placeholder="Jot down key thoughts, mnemonics, or questions..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      style={[
                        styles.noteInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={handleSaveNote}
                      style={[styles.saveNoteBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.saveNoteText}>
                        {noteSaved ? 'Saved ✓' : 'Save Note'}
                      </Text>
                    </Pressable>
                  </View>
                )}

                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSize + 7 }]}>
                  {currentItem.topic}
                </Text>

                {!!currentItem.intuition && (
                  <View
                    style={[
                      styles.intuitionCard,
                      { backgroundColor: colors.primarySoft, borderLeftColor: colors.primary },
                    ]}
                  >
                    <View style={styles.cardLabelRow}>
                      <Ionicons name="bulb-outline" size={18} color={colors.primary} />
                      <Text style={[styles.cardLabel, { color: colors.primary }]}>
                        Intuition
                      </Text>
                    </View>
                    <FormattedText text={currentItem.intuition} fontSize={fontSize - 1} />
                  </View>
                )}

                {!!currentItem.explain && (
                  <View style={{ marginBottom: 14 }}>
                    <FormattedText text={currentItem.explain} fontSize={fontSize} />
                  </View>
                )}

                <ConceptFlowCard steps={currentItem.visualFlow} />
                <ComparisonTableCard table={currentItem.comparisonTable} />

                {!!currentItem.code && (
                  <View style={[styles.codeBlock, { backgroundColor: colors.codeBg }]}>
                    <View style={styles.codeHeader}>
                      <Text style={styles.codeLabel}>Code / Formula</Text>
                      <Pressable onPress={handleCopyCode} style={styles.copyCodeBtn}>
                        <Ionicons
                          name={copiedCode ? 'checkmark' : 'copy-outline'}
                          size={14}
                          color="#e2e8f0"
                        />
                        <Text style={styles.copyCodeText}>
                          {copiedCode ? 'Copied' : 'Copy'}
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.codeText, { color: colors.codeText }]}>
                      {currentItem.code}
                    </Text>
                  </View>
                )}

                {!!currentItem.example && (
                  <View style={[styles.exampleCard, { backgroundColor: colors.cardAlt }]}>
                    <View style={styles.cardLabelRow}>
                      <Ionicons name="construct-outline" size={18} color={colors.text} />
                      <Text style={[styles.cardLabel, { color: colors.text }]}>
                        Worked Example
                      </Text>
                    </View>
                    <FormattedText text={currentItem.example} fontSize={fontSize - 1} />
                  </View>
                )}

                {!!currentItem.commonMistake && (
                  <View
                    style={[
                      styles.mistakeCard,
                      { backgroundColor: colors.amberSoft, borderLeftColor: colors.amber },
                    ]}
                  >
                    <View style={styles.cardLabelRow}>
                      <Ionicons name="warning-outline" size={18} color={colors.amber} />
                      <Text style={[styles.cardLabel, { color: colors.amber }]}>
                        Common Mistake to Avoid
                      </Text>
                    </View>
                    <FormattedText text={currentItem.commonMistake} fontSize={fontSize - 1} />
                  </View>
                )}

                {!!currentItem.keyTakeaway && (
                  <View
                    style={[
                      styles.takeawayCard,
                      { backgroundColor: colors.greenSoft, borderLeftColor: colors.green },
                    ]}
                  >
                    <View style={styles.cardLabelRow}>
                      <Ionicons name="checkmark-done-outline" size={18} color={colors.green} />
                      <Text style={[styles.cardLabel, { color: colors.green }]}>
                        Key Takeaway
                      </Text>
                    </View>
                    <FormattedText text={currentItem.keyTakeaway} fontSize={fontSize - 1} />
                  </View>
                )}

                {!!currentItem.checkQuestion && (
                  <Pressable
                    style={[
                      styles.checkCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      tapLight();
                      setShowCheckAnswer((prev) => !prev);
                    }}
                  >
                    <View style={styles.cardLabelRow}>
                      <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                      <Text style={[styles.cardLabel, { color: colors.primary }]}>
                        Quick Check
                      </Text>
                    </View>
                    <Text style={[styles.checkQuestion, { color: colors.text }]}>
                      {currentItem.checkQuestion}
                    </Text>
                    {showCheckAnswer ? (
                      <View style={[styles.checkAnswerBox, { borderTopColor: colors.border }]}>
                        <Text style={[styles.checkAnswerText, { color: colors.green }]}>
                          {currentItem.checkAnswer}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.tapToReveal, { color: colors.primary }]}>
                        Tap to reveal answer
                      </Text>
                    )}
                  </Pressable>
                )}
              </>
            ) : (
              <Text style={{ fontFamily: 'outfit', fontSize: 18, color: colors.textMuted }}>
                No content available for this chapter.
              </Text>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { backgroundColor: colors.background, bottom: Math.max(insets.bottom, 12) },
            ]}
          >
            {currentPage > 0 && (
              <View style={{ flex: 1 }}>
                <Button
                  text="Back"
                  type="outline"
                  onPress={() => goToPage(currentPage - 1)}
                />
              </View>
            )}
            <View style={{ flex: currentPage > 0 ? 1.5 : 1 }}>
              {currentPage < contentList.length - 1 ? (
                <Button text="Next" onPress={() => goToPage(currentPage + 1)} />
              ) : (
                <Button
                  text="Complete Chapter"
                  onPress={onChapterComplete}
                  loading={loader}
                />
              )}
            </View>
          </View>
        </>
      )}

      <AskCoachModal
        visible={coachOpen}
        onClose={() => setCoachOpen(false)}
        courseTitle={courseTitle}
        chapterName={initialChapter?.chapterName}
        currentLesson={currentItem}
        level={level}
        style={style}
      />

      <CoachMarkTour
        visible={!generating && !genError && contentList.length > 0 && shouldShow('chapter')}
        onFinish={() => markSeen('chapter')}
        onSkipAll={skipAllTours}
        steps={[
          {
            title: 'Tap "Ask Coach" Anytime',
            icon: 'sparkles',
            position: 'top-right',
            description:
              'Confused by an explanation or want another example? Tap "Ask Coach" in the top-right to chat with a tutor who already knows this exact lesson.',
          },
          {
            title: 'Listen, Resize, Note & Save',
            icon: 'volume-high-outline',
            position: 'top',
            description:
              'Use the reading bar to adjust text size (A-/A+), listen to audio narration on the go, write personal study notes, or save tricky lessons to your Review Deck.',
          },
          {
            title: 'Test Yourself & Grow Your Streak',
            icon: 'checkmark-done-circle-outline',
            position: 'bottom',
            description:
              'Tap "Quick Check" cards at the bottom of lessons to test recall, then tap Next / Complete Chapter to log your daily study goal!',
            actionLabel: 'Start Reading',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 50,
    backgroundColor: Colors.WHITE,
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconBtn: {
    padding: 4,
  },
  chapterHeaderTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 18,
    color: Colors.BLACK,
  },
  pageCounter: {
    fontFamily: 'outfit',
    fontSize: 13,
    color: Colors.GRAY,
  },
  coachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  coachPillText: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
    color: Colors.WHITE,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontFamily: 'outfit',
    fontSize: 15,
    color: Colors.GRAY,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  sectionTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 24,
    color: Colors.BLACK,
    marginBottom: 12,
  },
  intuitionCard: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  explainText: {
    fontFamily: 'outfit',
    fontSize: 17,
    lineHeight: 26,
    color: '#1f2937',
    marginBottom: 14,
  },
  codeBlock: {
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  copyCodeText: {
    fontFamily: 'outfit-medium',
    fontSize: 12,
    color: '#e2e8f0',
  },
  readingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  readingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
  },
  toolBtnText: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
  },
  noteCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontFamily: 'outfit',
    fontSize: 15,
    minHeight: 74,
    textAlignVertical: 'top',
  },
  saveNoteBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  saveNoteText: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
    color: '#ffffff',
  },
  codeLabel: {
    fontFamily: 'outfit-bold',
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 14,
    lineHeight: 21,
    color: '#f9fafb',
  },
  exampleCard: {
    backgroundColor: Colors.BG_GRAY,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  mistakeCard: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  takeawayCard: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 4,
    borderLeftColor: Colors.GREEN,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  checkCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#f8fbff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 16,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardLabel: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
  },
  cardBody: {
    fontFamily: 'outfit',
    fontSize: 16,
    lineHeight: 23,
    color: '#1f2937',
  },
  checkQuestion: {
    fontFamily: 'outfit-bold',
    fontSize: 16,
    color: Colors.BLACK,
    lineHeight: 22,
  },
  tapToReveal: {
    fontFamily: 'outfit',
    fontSize: 14,
    color: Colors.PRIMARY,
    marginTop: 8,
  },
  checkAnswerBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  checkAnswerText: {
    fontFamily: 'outfit',
    fontSize: 15,
    lineHeight: 22,
    color: '#14532d',
  },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 22,
    right: 22,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.WHITE,
  },
});
