import AsyncStorage from '@react-native-async-storage/async-storage';

const COURSES_PREFIX = 'best_coach_courses_v1_';
const CHAPTER_PREFIX = 'best_coach_chapter_v1_';

export async function saveCachedCourses(email, courses) {
  if (!email || !Array.isArray(courses)) return;
  try {
    await AsyncStorage.setItem(
      COURSES_PREFIX + email.toLowerCase(),
      JSON.stringify(courses)
    );
  } catch {
    // Non-critical cache failure
  }
}

export async function loadCachedCourses(email) {
  if (!email) return [];
  try {
    const raw = await AsyncStorage.getItem(COURSES_PREFIX + email.toLowerCase());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCachedChapter(docId, chapterIndex, content) {
  if (!docId || Number.isNaN(Number(chapterIndex)) || !Array.isArray(content) || !content.length) {
    return;
  }
  try {
    await AsyncStorage.setItem(
      `${CHAPTER_PREFIX}${docId}_${chapterIndex}`,
      JSON.stringify(content)
    );
  } catch {
    // Non-critical cache failure
  }
}

export async function loadCachedChapter(docId, chapterIndex) {
  if (!docId || Number.isNaN(Number(chapterIndex))) return null;
  try {
    const raw = await AsyncStorage.getItem(`${CHAPTER_PREFIX}${docId}_${chapterIndex}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
