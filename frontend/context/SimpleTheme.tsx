import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const DARK = {
  bg:            "#090909",
  surface:       "#111116",
  border:        "#1e1e28",
  t1:            "#ede9e1",
  t2:            "#5a576a",
  t3:            "#2e2c3a",
  t4:            "#1a1825",
  orange:        "#d4562a",
  orangeHi:      "#ff6b35",
  green:         "#2dd4a0",
  danger:        "#c04040",
  checkedOverlay: "rgba(255,255,255,0.06)",
  statusBar:     "light" as const,
};

export const LIGHT = {
  bg:            "#f4f1ea",
  surface:       "#ffffff",
  border:        "#e2ddd0",
  t1:            "#1a1712",
  t2:            "#8b8578",
  t3:            "#c4bfae",
  t4:            "#e8e3d6",
  orange:        "#d4562a",
  orangeHi:      "#ff6b35",
  green:         "#1f9c72",
  danger:        "#c04040",
  checkedOverlay: "rgba(0,0,0,0.05)",
  statusBar:     "dark" as const,
};

export type ThemeTokens = typeof DARK;
export type ThemeMode = "light" | "dark" | "system";

interface SimpleThemeContextType {
  isDark: boolean;
  T: ThemeTokens;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const SimpleThemeContext = createContext<SimpleThemeContextType | undefined>(undefined);
const STORAGE_KEY = "momentumThemeMode";

export function SimpleThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, []);

  const isDark = themeMode === "system" ? systemScheme !== "light" : themeMode === "dark";
  const T = isDark ? DARK : LIGHT;

  return (
    <SimpleThemeContext.Provider value={{ isDark, T, themeMode, setThemeMode }}>
      {children}
    </SimpleThemeContext.Provider>
  );
}

export function useSimpleTheme() {
  const ctx = useContext(SimpleThemeContext);
  if (!ctx) throw new Error("useSimpleTheme must be used within SimpleThemeProvider");
  return ctx;
}