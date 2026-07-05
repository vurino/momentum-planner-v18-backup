import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
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

interface SimpleThemeContextType {
  isDark: boolean;
  T: ThemeTokens;
  toggleTheme: () => void;
}

const SimpleThemeContext = createContext<SimpleThemeContextType | undefined>(undefined);
const STORAGE_KEY = "momentumThemeMode";

export function SimpleThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light") setIsDark(false);
        else if (stored === "dark") setIsDark(true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light").catch(() => {});
      return next;
    });
  }, []);

  const T = isDark ? DARK : LIGHT;

  return (
    <SimpleThemeContext.Provider value={{ isDark, T, toggleTheme }}>
      {children}
    </SimpleThemeContext.Provider>
  );
}

export function useSimpleTheme() {
  const ctx = useContext(SimpleThemeContext);
  if (!ctx) throw new Error("useSimpleTheme must be used within SimpleThemeProvider");
  return ctx;
}