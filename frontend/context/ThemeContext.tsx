import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@momentum_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true); // Default to dark mode

  useEffect(() => {
    // Load saved theme preference
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newIsDark = !isDark;
      setIsDark(newIsDark);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

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
