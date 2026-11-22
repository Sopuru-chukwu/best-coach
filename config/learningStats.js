import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateKeyDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateKey(d);
}

function pruneOldActivity(log = {}) {
  const cutoffKey = getDateKeyDaysAgo(30);
  const cleaned = {};
  for (const [k, v] of Object.entries(log || {})) {
    if (k >= cutoffKey && typeof v === 'number' && v > 0) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export async function recordStudyActivity(userDetail, setUserDetail) {
  const email = userDetail?.email?.trim()?.toLowerCase();
  if (!email) return;

  const today = getLocalDateKey();
  const yesterday = getDateKeyDaysAgo(1);
  const twoDaysAgo = getDateKeyDaysAgo(2);
  const prevDate = userDetail?.lastStudyDate || '';
  const prevStreak = Number(userDetail?.streakDays) || 0;
  let streakFreezes =
    typeof userDetail?.streakFreezes === 'number' ? userDetail.streakFreezes : 1;

  let nextStreak = prevStreak;
  if (prevDate === today) {
    nextStreak = Math.max(1, prevStreak);
  } else if (prevDate === yesterday) {
    nextStreak = prevStreak + 1;
    // Earn +1 streak freeze (max 3) every 3-day milestone
    if (nextStreak % 3 === 0) {
      streakFreezes = Math.min(3, streakFreezes + 1);
    }
  } else if (prevDate === twoDaysAgo && prevStreak > 0 && streakFreezes > 0) {
    // Automatically consume 1 streak freeze to protect the streak after a single missed day
    streakFreezes -= 1;
    nextStreak = prevStreak + 1;
  } else {
    nextStreak = 1;
  }

  const prevLog = pruneOldActivity(userDetail?.activityLog || {});
  const nextLog = {
    ...prevLog,
    [today]: (prevLog[today] || 0) + 1,
  };

  const updates = {
    streakDays: nextStreak,
    streakFreezes,
    lastStudyDate: today,
    activityLog: nextLog,
  };

  try {
    await setDoc(doc(db, 'users', email), updates, { merge: true });
    if (typeof setUserDetail === 'function') {
      setUserDetail((prev) => ({ ...(prev || {}), ...updates }));
    }
  } catch (err) {
    console.error('Could not update study activity:', err);
  }
}

export async function saveDailyGoal(userDetail, setUserDetail, goal) {
  const email = userDetail?.email?.trim()?.toLowerCase();
  const safeGoal = Math.max(1, Math.min(10, Number(goal) || 2));
  if (typeof setUserDetail === 'function') {
    setUserDetail((prev) => ({ ...(prev || {}), dailyGoal: safeGoal }));
  }
  if (!email) return;
  try {
    await setDoc(doc(db, 'users', email), { dailyGoal: safeGoal }, { merge: true });
  } catch (err) {
    console.error('Could not save daily goal:', err);
  }
}

export function getLast7DaysActivity(activityLog = {}, dailyGoal = 2) {
  const todayKey = getLocalDateKey();
  const days = [];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const key = getLocalDateKey(d);
    const count = Number(activityLog?.[key]) || 0;
    days.push({
      key,
      label: DAY_LABELS[d.getDay()],
      count,
      metGoal: count >= dailyGoal,
      isToday: key === todayKey,
    });
  }

  return days;
}

export function getCourseQuizPercent(course) {
  const entries = course?.quizResult ? Object.values(course.quizResult) : [];
  if (!entries.length) return null;
  const correct = entries.filter((e) => e?.isCorrect === true).length;
  return Math.round((correct / entries.length) * 100);
}

export function computeLearningStats(courseList = []) {
  let completedChapters = 0;
  let totalChapters = 0;
  let quizSum = 0;
  let quizzesTaken = 0;

  for (const course of courseList) {
    completedChapters += Array.isArray(course?.completedChapter)
      ? course.completedChapter.length
      : 0;
    totalChapters += Array.isArray(course?.chapters) ? course.chapters.length : 0;

    const quizPct = getCourseQuizPercent(course);
    if (quizPct !== null) {
      quizSum += quizPct;
      quizzesTaken += 1;
    }
  }

  return {
    totalCourses: courseList.length,
    completedChapters,
    totalChapters,
    quizzesTaken,
    avgQuizScore: quizzesTaken > 0 ? Math.round(quizSum / quizzesTaken) : null,
  };
}
