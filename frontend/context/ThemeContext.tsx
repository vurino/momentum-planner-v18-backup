import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// =============================================================================
// REFINED COLOR SYSTEM
// - Green = completed / success
// - Orange = actions / selected / active
// - Grey = inactive / neutral
// - Reduced glow intensity (~30-40%)
// =============================================================================

// Dark Mode Colors (NeuroDark)
const DARK_COLORS = {
  // Backgrounds
  bgGradient: ['#0a0e12', '#0f141a', '#141a22'] as const,
  card: '#151b24',
  surface: '#1a2230',
  
  // Accent colors
  accent: '#ff6a2e', // Orange - actions/selected/active
  accentSecondary: '#ff5a1f',
  accentTertiary: '#ff3c00',
  accentGlow: 'rgba(255, 106, 46, 0.15)', // Reduced glow ~40%
  accentGlowStrong: 'rgba(255, 106, 46, 0.25)', // Strong glow for active elements
  
  // Success colors (Green - completed)
  success: '#4ade80',
  successLight: '#86efac',
  successGlow: 'rgba(74, 222, 128, 0.12)', // Reduced glow
  successGlowStrong: 'rgba(74, 222, 128, 0.2)', // For completed elements
  
  // Pastel green for progress
  progressGreen: '#86efac',
  progressGreenDark: '#4ade80',
  
  // Danger
  danger: '#ef4444',
  dangerLight: '#f87171',
  dangerGlow: 'rgba(239, 68, 68, 0.12)',
  
  // Warning (Orange variants)
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  
  // Text colors
  textPrimary: '#e6edf5',
  textSecondary: '#8c96a8', // Grey - neutral
  textInactive: '#6f7b8c', // Grey - inactive
  textMuted: '#5a6478',
  
  // Icon colors
  iconActive: '#ff6a2e', // Orange for active
  iconInactive: '#6f7b8c', // Grey for inactive
  iconSuccess: '#4ade80', // Green for completed
  
  // Neumorphic shadows - reduced intensity
  shadowLight: 'rgba(255,255,255,0.02)',
  shadowDark: 'rgba(0,0,0,0.4)',
  shadowGlow: 'rgba(255, 106, 46, 0.08)', // Very subtle default
  
  // Logo colors
  logoText: '#9ca3af',
  titleBg: '#0f141a',
  
  // Progress colors
  progressEmpty: '#2a3344',
  progressFill: '#86efac', // Pastel green
  
  // Modal overlay
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  
  // Dividers
  divider: 'rgba(255, 255, 255, 0.06)',
};

// Light Mode Colors - Beige theme
const LIGHT_COLORS = {
  // Backgrounds
  bgGradient: ['#f5f2eb', '#efe9e0', '#e8e2d8'] as const,
  card: '#f8f5ee',
  surface: '#efe9e0',
  
  // Accent colors
  accent: '#ff6a2e',
  accentSecondary: '#ff5a1f',
  accentTertiary: '#ff3c00',
  accentGlow: 'rgba(255, 106, 46, 0.08)',
  accentGlowStrong: 'rgba(255, 106, 46, 0.15)',
  
  // Success colors
  success: '#22c55e',
  successLight: '#4ade80',
  successGlow: 'rgba(34, 197, 94, 0.08)',
  successGlowStrong: 'rgba(34, 197, 94, 0.15)',
  
  // Pastel green for progress
  progressGreen: '#4ade80',
  progressGreenDark: '#22c55e',
  
  // Danger
  danger: '#ef4444',
  dangerLight: '#f87171',
  dangerGlow: 'rgba(239, 68, 68, 0.08)',
  
  // Warning
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  
  // Text colors
  textPrimary: '#1c2430',
  textSecondary: '#6b7280',
  textInactive: '#9ca3af',
  textMuted: '#a3a8b0',
  
  // Icon colors
  iconActive: '#ff6a2e',
  iconInactive: '#9ca3af',
  iconSuccess: '#22c55e',
  
  // Neumorphic shadows
  shadowLight: 'rgba(255,255,255,0.8)',
  shadowDark: 'rgba(0,0,0,0.08)',
  shadowGlow: 'rgba(255, 106, 46, 0.05)',
  
  // Logo colors
  logoText: '#6b7280',
  titleBg: '#e8e2d8',
  
  // Progress colors
  progressEmpty: '#d5d0c5',
  progressFill: '#4ade80',
  
  // Modal overlay
  modalOverlay: 'rgba(0, 0, 0, 0.6)',
  
  // Dividers
  divider: 'rgba(0, 0, 0, 0.06)',
};

export type ThemeColors = typeof DARK_COLORS;

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@momentum_theme_mode';

// Storage helpers with web fallback
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

  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await getStorageValue(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const toggleTheme = useCallback(async () => {
    try {
      const newIsDark = !isDark;
      setIsDark(newIsDark);
      await setStorageValue(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [isDark]);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  if (isLoading) {
    return (
      <View style={[loadingStyles.container, { backgroundColor: DARK_COLORS.bgGradient[0] }]}>
        <ActivityIndicator size="large" color={DARK_COLORS.accent} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// =============================================================================
// STYLE HELPERS
// =============================================================================

// Card shadow - no glow by default
export function getCardShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000' : '#888',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.06,
    shadowRadius: 6,
    elevation: 3,
  };
}

// Active/Selected glow - orange
export function getActiveGlow(colors: ThemeColors) {
  return {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  };
}

// Completed glow - green (subtle)
export function getSuccessGlow(colors: ThemeColors) {
  return {
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  };
}

// Spacing constants - increased by ~10-15%
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 14, // was 12
  lg: 20, // was 16
  xl: 28, // was 24
  xxl: 36, // was 32
  section: 18, // Section spacing
};

// Card padding - slightly reduced
export const CARD_PADDING = {
  horizontal: 12,
  vertical: 10,
};
