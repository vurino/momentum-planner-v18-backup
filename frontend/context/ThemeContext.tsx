import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
 
const DARK_COLORS = {
  bgGradient: ['#0a0e12', '#0f141a', '#141a22'] as const,
  card: '#151b24',
  surface: '#1a2230',
  accent: '#ff6a2e',
  accentSecondary: '#ff5a1f',
  accentTertiary: '#ff3c00',
  accentGlow: 'rgba(255, 106, 46, 0.15)',
  accentGlowStrong: 'rgba(255, 106, 46, 0.25)',
  success: '#4ade80',
  successLight: '#86efac',
  successGlow: 'rgba(74, 222, 128, 0.12)',
  successGlowStrong: 'rgba(74, 222, 128, 0.2)',
  progressGreen: '#86efac',
  progressGreenDark: '#4ade80',
  danger: '#ef4444',
  dangerLight: '#f87171',
  dangerGlow: 'rgba(239, 68, 68, 0.12)',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  textPrimary: '#e6edf5',
  textSecondary: '#8c96a8',
  textInactive: '#6f7b8c',
  textMuted: '#5a6478',
  iconActive: '#ff6a2e',
  iconInactive: '#6f7b8c',
  iconSuccess: '#4ade80',
  shadowLight: 'rgba(255,255,255,0.02)',
  shadowDark: 'rgba(0,0,0,0.4)',
  shadowGlow: 'rgba(255, 106, 46, 0.08)',
  logoText: '#9ca3af',
  titleBg: '#0f141a',
  progressEmpty: '#2a3344',
  progressFill: '#86efac',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  divider: 'rgba(255, 255, 255, 0.06)',
};
 
const LIGHT_COLORS = {
  bgGradient: ['#f5f2eb', '#efe9e0', '#e8e2d8'] as const,
  card: '#f8f5ee',
  surface: '#efe9e0',
  accent: '#ff6a2e',
  accentSecondary: '#ff5a1f',
  accentTertiary: '#ff3c00',
  accentGlow: 'rgba(255, 106, 46, 0.08)',
  accentGlowStrong: 'rgba(255, 106, 46, 0.15)',
  success: '#22c55e',
  successLight: '#4ade80',
  successGlow: 'rgba(34, 197, 94, 0.08)',
  successGlowStrong: 'rgba(34, 197, 94, 0.15)',
  progressGreen: '#4ade80',
  progressGreenDark: '#22c55e',
  danger: '#ef4444',
  dangerLight: '#f87171',
  dangerGlow: 'rgba(239, 68, 68, 0.08)',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  textPrimary: '#1c2430',
  textSecondary: '#6b7280',
  textInactive: '#9ca3af',
  textMuted: '#a3a8b0',
  iconActive: '#ff6a2e',
  iconInactive: '#9ca3af',
  iconSuccess: '#22c55e',
  shadowLight: 'rgba(255,255,255,0.8)',
  shadowDark: 'rgba(0,0,0,0.08)',
  shadowGlow: 'rgba(255, 106, 46, 0.05)',
  logoText: '#6b7280',
  titleBg: '#e8e2d8',
  progressEmpty: '#d5d0c5',
  progressFill: '#4ade80',
  modalOverlay: 'rgba(0, 0, 0, 0.6)',
  divider: 'rgba(0, 0, 0, 0.06)',
};
 
export type ThemeColors = typeof DARK_COLORS;
 
interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  isLoading: boolean;
  weekStartsOnMonday: boolean;
  setWeekStartsOnMonday: (value: boolean) => void;
  ignoreOverlaps: boolean;
  setIgnoreOverlaps: (value: boolean) => Promise<void>;
  cascadeMode: 'shift-up' | 'shift-down';
  setCascadeMode: (value: 'shift-up' | 'shift-down') => Promise<void>;
}
 
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
 
const THEME_STORAGE_KEY = '@momentum_theme_mode';
const WEEK_START_STORAGE_KEY = '@momentum_week_start';
const IGNORE_OVERLAPS_KEY = '@momentum_ignore_overlaps';
const CASCADE_MODE_KEY = '@momentum_cascade_mode';
 
const getStorageValue = async (key: string): Promise<string | null> => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) return value;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  } catch (e) {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
};
 
const setStorageValue = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }
};
 
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStartsOnMonday, setWeekStartsOnMondayState] = useState(true);
  const [ignoreOverlaps, setIgnoreOverlapsState] = useState(false);
  const [cascadeMode, setCascadeModeState] = useState<'shift-up' | 'shift-down'>('shift-up');
 
  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await getStorageValue(THEME_STORAGE_KEY);
      if (savedTheme !== null) setIsDark(savedTheme === 'dark');
 
      const savedWeekStart = await getStorageValue(WEEK_START_STORAGE_KEY);
      if (savedWeekStart !== null) setWeekStartsOnMondayState(savedWeekStart === 'monday');
 
      const savedIgnoreOverlaps = await getStorageValue(IGNORE_OVERLAPS_KEY);
      if (savedIgnoreOverlaps !== null) setIgnoreOverlapsState(savedIgnoreOverlaps === 'true');
 
      const savedCascade = await getStorageValue(CASCADE_MODE_KEY);
      if (savedCascade !== null) setCascadeModeState(savedCascade as 'shift-up' | 'shift-down');
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
 
  useEffect(() => { loadTheme(); }, [loadTheme]);
 
  const toggleTheme = useCallback(async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    await setStorageValue(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
  }, [isDark]);
 
  const setWeekStartsOnMonday = useCallback(async (value: boolean) => {
    setWeekStartsOnMondayState(value);
    await setStorageValue(WEEK_START_STORAGE_KEY, value ? 'monday' : 'sunday');
  }, []);
 
  const setIgnoreOverlaps = useCallback(async (value: boolean) => {
    setIgnoreOverlapsState(value);
    await setStorageValue(IGNORE_OVERLAPS_KEY, value ? 'true' : 'false');
  }, []);
 
  const setCascadeMode = useCallback(async (value: 'shift-up' | 'shift-down') => {
    setCascadeModeState(value);
    await setStorageValue(CASCADE_MODE_KEY, value);
  }, []);
 
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
 
  if (isLoading) {
    return (
      <View style={[loadingStyles.container, { backgroundColor: DARK_COLORS.bgGradient[0] }]}>
        <ActivityIndicator size="large" color={DARK_COLORS.accent} />
      </View>
    );
  }
 
  return (
    <ThemeContext.Provider value={{
      isDark, colors, toggleTheme, isLoading,
      weekStartsOnMonday, setWeekStartsOnMonday,
      ignoreOverlaps, setIgnoreOverlaps,
      cascadeMode, setCascadeMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
 
const loadingStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
 
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
 
export function getCardShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000' : '#888',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.06,
    shadowRadius: 6,
    elevation: 3,
  };
}
 
export function getActiveGlow(colors: ThemeColors) {
  return {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  };
}
 
export function getSuccessGlow(colors: ThemeColors) {
  return {
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  };
}
 
export const SPACING = {
  xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 36, section: 18,
};
 
export const CARD_PADDING = {
  horizontal: 12,
  vertical: 10,
};
 