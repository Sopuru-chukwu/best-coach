import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { loadCachedCourses, saveCachedCourses } from './offlineCache';
import { sortNewestFirst } from './courseUtils';

/**
 * In-memory store of the courses the learner has opened this session.
 *
 * Screens navigate with just a `courseId` route param. The screen that starts the
 * navigation calls `rememberCourse(course)` first, so the next screen can read the
 * course synchronously; if it isn't cached (app reload, deep link) it is loaded from
 * Firestore.
 */
const courses = new Map();
const listeners = new Set();

function notify(courseId) {
  listeners.forEach((listener) => listener(courseId));
}

export function rememberCourse(course) {
  if (!course?.docId) return course;
  courses.set(String(course.docId), course);
  notify(String(course.docId));
  return course;
}

export function getCachedCourse(courseId) {
  if (!courseId) return null;
  return courses.get(String(courseId)) ?? null;
}

/** Merge fields into a cached course (e.g. after saving a quiz result). */
export function updateCachedCourse(courseId, patchOrUpdater) {
  const current = getCachedCourse(courseId);
  if (!current) return null;
  const patch =
    typeof patchOrUpdater === 'function' ? patchOrUpdater(current) : patchOrUpdater;
  return rememberCourse({ ...current, ...patch, docId: current.docId });
}

export function subscribeToCourses(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fetch a course from Firestore and cache it. Returns null if it doesn't exist. */
export async function fetchCourse(courseId) {
  if (!courseId) return null;
  const snap = await getDoc(doc(db, 'Courses', String(courseId)));
  if (!snap.exists()) return null;
  return rememberCourse({ ...snap.data(), docId: snap.id });
}

export function __resetCourseStoreForTests() {
  courses.clear();
  listeners.clear();
}

/**
 * Route params for opening a screen about `course`: caches the course and
 * returns only its id, instead of serializing the whole course into the URL.
 */
export function courseRouteParams(course) {
  rememberCourse(course);
  return { courseId: course?.docId ? String(course.docId) : '' };
}

/**
 * Load the courses the learner created, newest first, and cache them (in memory and
 * offline). When Firestore can't be reached, falls back to the offline copy and marks
 * the result with `fromCache: true`; throws only if there is no offline copy either.
 */
export async function fetchMyCourses(email) {
  if (!email) return { courses: [], fromCache: false };
  try {
    const snap = await getDocs(query(collection(db, 'Courses'), where('createdBy', '==', email)));
    const courses = sortNewestFirst(snap.docs.map((d) => ({ ...d.data(), docId: d.id })));
    courses.forEach(rememberCourse);
    saveCachedCourses(email, courses);
    return { courses, fromCache: false };
  } catch (err) {
    const cached = await loadCachedCourses(email);
    if (cached.length > 0) {
      cached.forEach((c) => {
        if (!getCachedCourse(c.docId)) rememberCourse(c);
      });
      return { courses: cached, fromCache: true };
    }
    throw err;
  }
}
