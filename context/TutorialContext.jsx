import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = 'best_coach_tutorial_state_v1';

const DEFAULT_STATE = {
  home: false,
  addCourse: false,
  chapter: false,
};

/** @type {import("react").Context<{ ready: boolean; shouldShow: (key: string) => boolean; markSeen: (key: string) => void; skipAllTours: () => void; resetAllTours: () => Promise<void> }>} */
export const TutorialContext = createContext({
  ready: false,
  shouldShow: (_k) => false,
  markSeen: (_k) => {},
  skipAllTours: () => {},
  resetAllTours: async () => {},
});

export function TutorialProvider({ children }) {
  const [seenMap, setSeenMap] = useState(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setSeenMap({ ...DEFAULT_STATE, ...parsed });
          }
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next) => {
    AsyncStorage.setItem(TUTORIAL_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const shouldShow = useCallback(
    (key) => ready && !seenMap[key],
    [ready, seenMap]
  );

  const markSeen = useCallback(
    (key) => {
      setSeenMap((prev) => {
        if (prev[key]) return prev;
        const next = { ...prev, [key]: true };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const skipAllTours = useCallback(() => {
    const allSeen = { home: true, addCourse: true, chapter: true };
    setSeenMap(allSeen);
    persist(allSeen);
  }, [persist]);

  const resetAllTours = useCallback(async () => {
    setSeenMap(DEFAULT_STATE);
    await AsyncStorage.setItem(TUTORIAL_KEY, JSON.stringify(DEFAULT_STATE)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ ready, shouldShow, markSeen, skipAllTours, resetAllTours }),
    [ready, shouldShow, markSeen, skipAllTours, resetAllTours]
  );

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}
