import { useCallback, useContext, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { UserDetailContext } from '../context/UserDetailContext';
import { fetchMyCourses } from '../config/courseStore';

/**
 * The signed-in learner's own courses, newest first. Reloads whenever the screen
 * comes into focus, and falls back to the offline cache when there's no connection.
 *
 * @param {{ onLoaded?: (courses: any[], info: { fromCache: boolean }) => void,
 *           onError?: (error: Error) => void }} options
 */
export function useMyCourses({ onLoaded, onError } = {}) {
  const { userDetail } = useContext(UserDetailContext);
  const email = userDetail?.email;
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { courses: next, fromCache } = await fetchMyCourses(email);
      setCourses(next);
      onLoaded?.(next, { fromCache });
    } catch (err) {
      console.error('Error loading courses:', err);
      onError?.(err);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
    // onLoaded/onError are intentionally not dependencies: callers pass inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { courses, setCourses, loading, hasLoaded, reload };
}
