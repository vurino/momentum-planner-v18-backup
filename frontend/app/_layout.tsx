import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
 
function TabIcon({ name, color }: {
  name: keyof typeof Ionicons.glyphMap; color: string;
}) {
  return (
    <View style={styles.tabIconWrap}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}
 
function RootLayoutInner() {
  const { isDark, colors } = useTheme();
 
  const tabBarStyle = {
    backgroundColor: isDark ? colors.bgBase : colors.bgSurface,
    borderTopColor: isDark ? colors.tabBorder : colors.dividerStrong,
    borderTopWidth: 1,
    height: 56,
    paddingBottom: 4,
    paddingTop: 4,
  };
 
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: -2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color }) => (
              <TabIcon name="today-outline" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color }) => (
              <TabIcon name="list-outline" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => (
              <TabIcon name="time-outline" color={color} />
            ),
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
 
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
 
const styles = StyleSheet.create({
  root: { flex: 1 },
  tabIconWrap: { alignItems: 'center', justifyContent: 'center' },
});
 