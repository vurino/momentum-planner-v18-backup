import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
 
// ─────────────────────────────────────────────────────────────────────────────
// DARK PALETTE — Deep slate base, terracotta accent
// ─────────────────────────────────────────────────────────────────────────────
const DARK_COLORS = {
  // Backgrounds
  bgBase:            '#1c2029',   // screen background
  bgSurface:         '#212530',   // raised card (hero card only)
  bgTask:            '#1e2430',   // current task raised row
  bgGradient:        ['#1c2029', '#1e2230', '#1a1e28'] as const,
 
  // Accent — terracotta
  accent:            '#d4754a',
  accentLight:       '#e8906a',
  accentDark:        '#b85c32',
  accentGlow:        'rgba(212,117,74,0.18)',
  accentGlowStrong:  'rgba(212,117,74,0.30)',
 
  // Done / success — muted green
  done:              '#52b878',
  doneLight:         '#6ed494',
  doneDark:          '#3a9060',
  doneGlow:          'rgba(82,184,120,0.15)',
 
  // Danger
  danger:            '#ef4444',
  dangerLight:       '#f87171',
  dangerGlow:        'rgba(239,68,68,0.12)',
 
  // Warning
  warning:           '#f59e0b',
 
  // Text
  textPrimary:       '#edf2fc',   // headings, task names
  textBody:          '#d8e4f2',   // body text
  textSecondary:     '#a0b0c4',   // pending task names
  textMuted:         '#7080a0',   // times, subtitles
  textDim:           '#4a5a72',   // day labels, week numbers
  textInvisible:     '#2a3448',   // very faint labels (UP NEXT)
 
  // Shadows (neumorphic)
  shadowDark:        '#111620',
  shadowLight:       '#2a3040',
 
  // Progress
  progressTrack:     '#161c26',
  progressFill:      '#52b878',
 
  // Dividers
  divider:           'rgba(255,255,255,0.05)',
  dividerStrong:     'rgba(255,255,255,0.10)',
 
  // Modal
  modalOverlay:      'rgba(0,0,0,0.78)',
 
  // Tab bar
  tabActive:         '#d4754a',
  tabInactive:       '#3a4a62',
  tabBorder:         '#1a2030',
 
  // Week strip bubbles
  dayBubbleNormal:   '#1c2029',   // flat, neumorphic raised
  dayBubbleDone:     '#1c2029',   // sunken
  dayBubbleToday:    '#d4754a',   // accent fill
  dayLabelColor:     '#4a5a72',
 
  // Icon colors
  iconActive:        '#d4754a',
  iconDone:          '#52b878',
  iconMuted:         '#5a6880',
};
 
// ─────────────────────────────────────────────────────────────────────────────
// LIGHT PALETTE — Warm cream, same accent
// ─────────────────────────────────────────────────────────────────────────────
const LIGHT_COLORS = {
  // Backgrounds
  bgBase:            '#f0ebe2',
  bgSurface:         '#e8e2d8',   // header background
  bgTask:            '#ede6db',   // current task raised row
  bgGradient:        ['#f0ebe2', '#ece6dd', '#e8e2d8'] as const,
 
  // Accent — same terracotta
  accent:            '#d4754a',
  accentLight:       '#e8906a',
  accentDark:        '#b85c32',
  accentGlow:        'rgba(212,117,74,0.12)',
  accentGlowStrong:  'rgba(212,117,74,0.22)',
 
  // Done / success
  done:              '#3a9060',
  doneLight:         '#52b878',
  doneDark:          '#2a7050',
  doneGlow:          'rgba(58,144,96,0.12)',
 
  // Danger
  danger:            '#ef4444',
  dangerLight:       '#f87171',
  dangerGlow:        'rgba(239,68,68,0.08)',
 
  // Warning
  warning:           '#f59e0b',
 
  // Text
  textPrimary:       '#1a1e28',
  textBody:          '#2c3340',
  textSecondary:     '#4a5060',
  textMuted:         '#6a6050',
  textDim:           '#8a8070',
  textInvisible:     '#b0a898',
 
  // Shadows (neumorphic — light)
  shadowDark:        '#ccc6bb',
  shadowLight:       '#ffffff',
 
  // Progress
  progressTrack:     '#d0c9be',
  progressFill:      '#3a9060',
 
  // Dividers
  divider:           'rgba(0,0,0,0.05)',
  dividerStrong:     'rgba(0,0,0,0.10)',
 
  // Modal
  modalOverlay:      'rgba(0,0,0,0.62)',
 
  // Tab bar
  tabActive:         '#d4754a',
  tabInactive:       '#9a9080',
  tabBorder:         '#ddd7cc',
 
  // Week strip bubbles
  dayBubbleNormal:   '#e8e2d8',
  dayBubbleDone:     '#e8e2d8',
  dayBubbleToday:    '#d4754a',
  dayLabelColor:     '#9a9080',
 
  // Icon colors
  iconActive:        '#d4754a',
  iconDone:          '#3a9060',
  iconMuted:         '#7a7060',
};
 
export type ThemeColors = typeof DARK_COLORS;
 
// ─────────────────────────────────────────────────────────────────────────────
// SPACING & LAYOUT TOKENS
// ─────────────────────────────────────────────────────────────────────────────
export const SPACING = {
  xs:      4,
  sm:      8,
  md:      12,
  lg:      16,
  xl:      24,
  xxl:     32,
  section: 14,
};
 
export const RADIUS = {
  sm:   8,
  md:   10,
  lg:   12,
  xl:   16,
  xxl:  20,
};
 
export const FONT = {
  xs:   12,
  sm:   14,
  md:   16,
  lg:   20,
  xl:   24,
  xxl:  32,
};
 
// ─────────────────────────────────────────────────────────────────────────────
// SHADOW HELPERS
// ─────────────────────────────────────────────────────────────────────────────
 
/** Soft neumorphic lift — used only on the hero card */
export function getNeuShadow(isDark: boolean) {
  return isDark
    ? { shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6,
        // Second shadow (light side) not directly supported in RN — use border trick
      }
    : { shadowColor: '#ccc6bb', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 };
}
 
/** Ambient orange glow — current task row */
export function getTaskGlow() {
  return {
    shadowColor: '#d4754a',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  };
}
 
/** Subtle card shadow — general raised elements */
export function getCardShadow(isDark: boolean) {
  return isDark
    ? { shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 }
    : { shadowColor: '#ccc6bb', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2 };
}
 
/** Success glow — done states */
export function getSuccessGlow() {
  return {
    shadowColor: '#52b878',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 2,
  };
}
 
// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
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
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
}
 
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
 
// Storage keys
const KEYS = {
  theme:               '@momentum_theme_v2',
  weekStart:           '@momentum_week_start',
  ignoreOverlaps:      '@momentum_ignore_overlaps',
  cascadeMode:         '@momentum_cascade_mode',
  notifications:       '@momentum_notifications_enabled',
};
 
const getStorage = async (key: string): Promise<string | null> => {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v !== null) return v;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(key);
    return null;
  } catch {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(key);
    return null;
  }
};
 
const setStorage = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value);
  } catch {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value);
  }
};
 
// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStartsOnMonday, setWeekStartsOnMondayState] = useState(true);
  const [ignoreOverlaps, setIgnoreOverlapsState] = useState(false);
  const [cascadeMode, setCascadeModeState] = useState<'shift-up' | 'shift-down'>('shift-up');
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
 
  const loadPrefs = useCallback(async () => {
    try {
      const [theme, week, overlaps, cascade, notifs] = await Promise.all([
        getStorage(KEYS.theme),
        getStorage(KEYS.weekStart),
        getStorage(KEYS.ignoreOverlaps),
        getStorage(KEYS.cascadeMode),
        getStorage(KEYS.notifications),
      ]);
      if (theme)    setIsDark(theme === 'dark');
      if (week)     setWeekStartsOnMondayState(week === 'monday');
      if (overlaps) setIgnoreOverlapsState(overlaps === 'true');
      if (cascade)  setCascadeModeState(cascade as 'shift-up' | 'shift-down');
      if (notifs)   setNotificationsEnabledState(notifs === 'true');
    } catch (e) {
      console.error('ThemeContext: error loading prefs', e);
    } finally {
      setIsLoading(false);
    }
  }, []);
 
  useEffect(() => { loadPrefs(); }, [loadPrefs]);
 
  const toggleTheme = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    await setStorage(KEYS.theme, next ? 'dark' : 'light');
  }, [isDark]);
 
  const setWeekStartsOnMonday = useCallback(async (v: boolean) => {
    setWeekStartsOnMondayState(v);
    await setStorage(KEYS.weekStart, v ? 'monday' : 'sunday');
  }, []);
 
  const setIgnoreOverlaps = useCallback(async (v: boolean) => {
    setIgnoreOverlapsState(v);
    await setStorage(KEYS.ignoreOverlaps, v ? 'true' : 'false');
  }, []);
 
  const setCascadeMode = useCallback(async (v: 'shift-up' | 'shift-down') => {
    setCascadeModeState(v);
    await setStorage(KEYS.cascadeMode, v);
  }, []);
 
  const setNotificationsEnabled = useCallback(async (v: boolean) => {
    setNotificationsEnabledState(v);
    await setStorage(KEYS.notifications, v ? 'true' : 'false');
  }, []);
 
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
 
  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: DARK_COLORS.bgBase }]}>
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
      notificationsEnabled, setNotificationsEnabled,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
 
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
 
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
 