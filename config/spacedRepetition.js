import AsyncStorage from '@react-native-async-storage/async-storage';

const SRS_STORAGE_KEY = 'best_coach_srs_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export function makeCardKey(courseId, cardIndex, front = '') {
  return `${courseId || 'course'}_${cardIndex}_${String(front).slice(0, 24)}`;
}

export async function loadSrsMap() {
  try {
    const raw = await AsyncStorage.getItem(SRS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Lightweight SM-2 / Leitner spaced-repetition update.
 * quality: 'again' | 'good' | 'easy'
 */
export async function recordCardReview(cardKey, quality = 'good') {
  if (!cardKey) return null;
  const map = await loadSrsMap();
  const prev = map[cardKey] || { intervalDays: 0, reps: 0, ease: 2.5 };

  let intervalDays = 1;
  let reps = prev.reps || 0;
  let ease = prev.ease || 2.5;

  if (quality === 'again') {
    reps = 0;
    intervalDays = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else if (quality === 'easy') {
    reps += 1;
    intervalDays = reps === 1 ? 4 : Math.max(4, Math.round((prev.intervalDays || 1) * ease * 1.3));
    ease = Math.min(3.0, ease + 0.15);
  } else {
    // 'good'
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 3;
    else intervalDays = Math.round((prev.intervalDays || 3) * ease);
  }

  intervalDays = Math.min(60, Math.max(1, intervalDays));
  const entry = {
    intervalDays,
    reps,
    ease: Number(ease.toFixed(2)),
    lastReviewedAt: Date.now(),
    nextReviewAt: Date.now() + intervalDays * DAY_MS,
  };

  map[cardKey] = entry;
  try {
    await AsyncStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // non-critical
  }

  return entry;
}

export async function getDueCards(courseList = [], maxCards = 15) {
  const map = await loadSrsMap();
  const now = Date.now();
  const due = [];

  for (const course of courseList) {
    const cards = Array.isArray(course?.flashcards) ? course.flashcards : [];
    const courseId = course?.docId || course?.courseTitle || 'course';
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card?.front || !card?.back) continue;
      const key = makeCardKey(courseId, i, card.front);
      const state = map[key];
      const isDue = !state || !state.nextReviewAt || state.nextReviewAt <= now;
      if (isDue) {
        due.push({
          key,
          courseId: course.docId,
          courseTitle: course.courseTitle || 'Course',
          cardIndex: i,
          front: card.front,
          back: card.back,
          intervalDays: state?.intervalDays || 0,
          nextReviewAt: state?.nextReviewAt || 0,
        });
      }
    }
  }

  // Prioritize previously seen overdue cards before brand-new unseen cards
  due.sort((a, b) => {
    const aSeen = a.nextReviewAt > 0 ? 0 : 1;
    const bSeen = b.nextReviewAt > 0 ? 0 : 1;
    if (aSeen !== bSeen) return aSeen - bSeen;
    return a.nextReviewAt - b.nextReviewAt;
  });

  return due.slice(0, maxCards);
}
