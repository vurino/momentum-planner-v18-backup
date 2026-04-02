import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getCardShadow, SPACING } from '../../context/ThemeContext';

// Tab icon with animation feedback - NO dot indicator
const TabIcon = ({ 
  name, 
  focused, 
  color, 
  colors 
}: { 
  name: keyof typeof Ionicons.glyphMap; 
  focused: boolean; 
  color: string;
  colors: any;
}) => {
  return (
    <View style={[
      styles.iconContainer,
      focused && [
        styles.iconContainerActive,
        { backgroundColor: colors.accentGlow },
      ],
    ]}>
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
};

export default function TabLayout() {
  const { isDark, colors } = useTheme();

  const tabBarStyle = {
    backgroundColor: colors.card,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 95 : 75,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
    paddingTop: 12,
    ...getCardShadow(isDark),
    shadowOffset: { width: 0, height: -2 },
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabBarStyle,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.iconInactive,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => (
          <View style={[styles.tabBarBackground, { backgroundColor: colors.card }]} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'today' : 'today-outline'} 
              focused={focused} 
              color={color} 
              colors={colors}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'calendar' : 'calendar-outline'} 
              focused={focused} 
              color={color}
              colors={colors}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'settings' : 'settings-outline'} 
              focused={focused} 
              color={color}
              colors={colors}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  tabBarItem: {
    paddingVertical: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 14,
    position: 'relative',
  },
  iconContainerActive: {
    transform: [{ scale: 1.05 }],
  },
});
