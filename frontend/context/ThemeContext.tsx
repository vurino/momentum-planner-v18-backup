import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Dark Mode Colors (NeuroDark) - Cards at 50% shade
const DARK_COLORS = {
  bgGradient: ['#0a0e12', '#0f141a', '#141a22'] as const,
  card: '#141a22', // Darker - 50% shade
  surface: '#1a2230',
  accent: '#ff6a2e',
  accentSecondary: '#ff5a1f',
  accentTertiary: '#ff3c00',
  textPrimary: '#e6edf5',
  textSecondary: '#a6b0bf',
  textInactive: '#6f7b8c',
  iconInactive: '#8c96a5',
  success: '#4ade80',
  successGlow: 'rgba(74, 222, 128, 0.3)',
  danger: '#ef4444',
  // Neumorphic shadows for dark mode
  shadowLight: 'rgba(255,255,255,0.03)',
  shadowDark: 'rgba(0,0,0,0.6)',
  // Logo colors - light gray
  logoText: '#9ca3af',
  titleBg: '#0f141a',
  // Progress colors
  progressEmpty: '#2a3344',
  progressLow: '#60a5fa', // Blue for early progress
  progressMid: '#f59e0b', // Orange/amber for mid progress
  progressHigh: '#22c55e', // Green for high progress
};

// Light Mode Colors - Using very light beige instead of white
const LIGHT_COLORS = {
  bgGradient: ['#f5f2eb', '#efe9e0', '#e8e2d8'] as const, // Light beige gradient
  card: '#f8f5ee', // Light beige card
  surface: '#efe9e0',
  accent: '#ff6a2e',
  accentSecondary: '#ff5a1f',
  accentTertiary: '#ff3c00',
  textPrimary: '#1c2430',
  textSecondary: '#5a6472',
  textInactive: '#8c96a8',
  iconInactive: '#7a8494',
  success: '#22c55e',
  successGlow: 'rgba(34, 197, 94, 0.2)',
  danger: '#ef4444',
  // Neumorphic shadows for light mode
  shadowLight: 'rgba(255,255,255,0.9)',
  shadowDark: 'rgba(0,0,0,0.1)',
  // Logo colors
  logoText: '#6b7280',
  titleBg: '#e8e2d8',
  // Progress colors
  progressEmpty: '#d5d0c5',
  progressLow: '#3b82f6',
  progressMid: '#f59e0b',
  progressHigh: '#22c55e',
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

// Helper to get storage - with web fallback
const getStorageValue = async (key: string): Promise<string | null> => {
  try {
    // First try AsyncStorage
    const value = await AsyncStorage.getItem(key);
    if (value !== null) return value;
    
    // Fallback to direct localStorage for web
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  } catch (e) {
    // Direct localStorage fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
};

// Helper to set storage - with web fallback  
const setStorageValue = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
    // Also set in localStorage directly for web reliability
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    // Direct localStorage fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true); // Default to dark mode
  const [isLoading, setIsLoading] = useState(true); // Track loading state

  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await getStorageValue(THEME_STORAGE_KEY);
      console.log('[Theme] Loaded from storage:', savedTheme);
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
    // Load saved theme preference on mount
    loadTheme();
  }, [loadTheme]);

  const toggleTheme = useCallback(async () => {
    try {
      const newIsDark = !isDark;
      console.log('[Theme] Toggling to:', newIsDark ? 'dark' : 'light');
      setIsDark(newIsDark);
      await setStorageValue(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
      console.log('[Theme] Saved to storage:', newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [isDark]);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Show loading screen while theme is being loaded
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

// Helper to get progress color based on percentage
export function getProgressColor(percentage: number, colors: ThemeColors): string {
  if (percentage === 0) return colors.progressEmpty;
  if (percentage < 25) return colors.progressLow;
  if (percentage < 75) return colors.progressMid;
  return colors.progressHigh;
}
