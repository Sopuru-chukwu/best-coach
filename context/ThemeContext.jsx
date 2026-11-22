import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'best_coach_theme_mode_v1';

export const LIGHT_COLORS = {
  background: '#ffffff',
  surface: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  primary: '#0075ff',
  primarySoft: '#eff6ff',
  white: '#ffffff',
  black: '#0f172a',
  green: '#16a34a',
  greenSoft: '#ecfdf5',
  amber: '#b45309',
  amberSoft: '#fffbeb',
  red: '#dc2626',
  redSoft: '#fef2f2',
  inputBg: '#f1f5f9',
  codeBg: '#111827',
  codeText: '#f9fafb',
  tabBarBorder: 'rgba(15, 23, 42, 0.08)',
  tabBarFallback: 'rgba(255, 255, 255, 0.92)',
};

export const DARK_COLORS = {
  background: '#0b1220',
  surface: '#111827',
  card: '#162033',
  cardAlt: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#25324a',
  primary: '#3b82f6',
  primarySoft: '#172554',
  white: '#ffffff',
  black: '#0f172a',
  green: '#22c55e',
  greenSoft: '#052e16',
  amber: '#fbbf24',
  amberSoft: '#2b1d07',
  red: '#f87171',
  redSoft: '#3b0c12',
  inputBg: '#1e293b',
  codeBg: '#020617',
  codeText: '#e2e8f0',
  tabBarBorder: 'rgba(248, 250, 252, 0.1)',
  tabBarFallback: 'rgba(11, 18, 32, 0.92)',
};

/** @type {import("react").Context<{ mode: string; setMode: (m: string) => void; isDark: boolean; colors: typeof LIGHT_COLORS }>} */
export const ThemeContext = createContext({
  mode: 'system',
  setMode: (_m) => {},
  isDark: false,
  colors: LIGHT_COLORS,
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = (nextMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => {});
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const value = useMemo(
    () => ({ mode, setMode, isDark, colors }),
    [mode, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
