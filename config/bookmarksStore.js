import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const BOOKMARKS_KEY = 'best_coach_bookmarks_v1';
const NOTES_KEY = 'best_coach_notes_v1';
const FONT_SIZE_KEY = 'best_coach_lesson_font_size_v1';

export async function loadFontSize(defaultSize = 17) {
  try {
    const raw = await AsyncStorage.getItem(FONT_SIZE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed >= 14 && parsed <= 24 ? parsed : defaultSize;
  } catch {
    return defaultSize;
  }
}

export async function saveFontSize(size) {
  try {
    await AsyncStorage.setItem(FONT_SIZE_KEY, String(size));
  } catch {
    // ignore
  }
}

export async function loadBookmarks() {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function toggleBookmark(bookmarkItem, userEmail = '') {
  const existing = await loadBookmarks();
  const exists = existing.some((b) => b.id === bookmarkItem.id);
  const next = exists
    ? existing.filter((b) => b.id !== bookmarkItem.id)
    : [{ ...bookmarkItem, savedAt: Date.now() }, ...existing];

  try {
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }

  if (userEmail) {
    setDoc(
      doc(db, 'users', userEmail.toLowerCase()),
      { bookmarks: next.slice(0, 100) },
      { merge: true }
    ).catch(() => {});
  }

  return { bookmarks: next, isBookmarked: !exists };
}

export async function loadLessonNote(noteKey) {
  if (!noteKey) return '';
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return typeof map?.[noteKey] === 'string' ? map[noteKey] : '';
  } catch {
    return '';
  }
}

export async function loadAllNotes() {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

export async function saveLessonNote(noteKey, noteText) {
  if (!noteKey) return;
  try {
    const map = await loadAllNotes();
    if (noteText.trim()) {
      map[noteKey] = noteText;
    } else {
      delete map[noteKey];
    }
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
