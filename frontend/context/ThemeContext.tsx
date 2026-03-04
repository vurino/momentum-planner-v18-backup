import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dark Mode Colors (NeuroDark)
const DARK_COLORS = {
  bgGradient: ['#0f141a', '#151c24', '#1b2430'] as const,
  card: '#1c2432',
  surface: '#232c3d',
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
  shadowLight: 'rgba(255,255,255,0.05)',
  shadowDark: 'rgba(0,0,0,0.55)',
  // Chrome title colors
  chromeGradient: ['#f5f7fa', '#d1d7df', '#aab2bd', '#e6ecf2'] as const,
  titleBg: '#161b22',
};

// Light Mode Colors
const LIGHT_COLORS = {
  bgGradient: ['#eef1f6', '#e6ebf2', '#dfe5ed'] as const,
  card: '#f4f6fa',
  surface: '#e9edf3',
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
  shadowDark: 'rgba(0,0,0,0.12)',
  // Chrome title colors
  chromeGradient: ['#8c96a5', '#6f7b8c', '#5a6472', '#7a8494'] as const,
  titleBg: '#dfe5ed',
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

// Helper to get neumorphic shadow styles based on theme
export function getNeumorphicShadow(isDark: boolean, colors: ThemeColors) {
  return {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: isDark ? 0.55 : 0.12,
    shadowRadius: 12,
    elevation: 8,
  };
}

export function getNeumorphicInset(isDark: boolean, colors: ThemeColors) {
  return {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: isDark ? 0.6 : 0.15,
    shadowRadius: 10,
  };
}
