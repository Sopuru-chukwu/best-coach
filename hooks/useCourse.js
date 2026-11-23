import { useCallback, useEffect, useState } from 'react';
import {
  fetchCourse,
  getCachedCourse,
  rememberCourse,
  subscribeToCourses,
} from '../config/courseStore';

/**
 * Resolve a course by id: instantly from the in-memory store when possible,
 * otherwise from Firestore.
 *
 * @param {string} courseId
 * @param {{ revalidate?: boolean, refreshKey?: any }} options
 *   revalidate – also re-fetch from Firestore when a cached copy exists, so the
 *                screen picks up changes saved elsewhere (e.g. completed chapters).
 */
export function useCourse(courseId, { revalidate = false, refreshKey } = {}) {
  const [course, setCourseState] = useState(() => getCachedCourse(courseId));
  const [loading, setLoading] = useState(() => !getCachedCourse(courseId) && Boolean(courseId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId) {
      setCourseState(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const cached = getCachedCourse(courseId);
    setCourseState(cached);

    if (cached && !revalidate) {
      setLoading(false);
    } else {
      setLoading(!cached);
      fetchCourse(courseId)
        .then((fresh) => {
          if (cancelled) return;
          // Keep the cached copy if offline / not found but we already have one.
          if (fresh || !cached) setCourseState(fresh);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('Could not load course:', err);
          if (!cached) setError(err);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    const unsubscribe = subscribeToCourses((changedId) => {
      if (changedId === String(courseId)) {
        setCourseState(getCachedCourse(courseId));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [courseId, revalidate, refreshKey]);

  const setCourse = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(getCachedCourse(courseId)) : next;
      if (resolved?.docId) {
        rememberCourse(resolved);
      } else {
        setCourseState(resolved);
      }
    },
    [courseId]
  );

  return { course, setCourse, loading, error };
}
