import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme, SPACING, RADIUS, FONT } from '../context/ThemeContext';
 
const { width: SW } = Dimensions.get('window');
 
const iconMap: Record<string, string> = {
  'restaurant': 'restaurant-outline', 'sunny': 'sunny-outline', 'briefcase': 'briefcase-outline',
  'cafe': 'cafe-outline', 'trending-up': 'trending-up-outline', 'book': 'book-outline',
  'fitness': 'fitness-outline', 'fast-food': 'fast-food-outline', 'analytics': 'analytics-outline',
  'code': 'code-slash-outline', 'moon': 'moon-outline', 'bed': 'bed-outline', 'time': 'time-outline',
  'heart': 'heart-outline', 'musical-notes': 'musical-notes-outline',
  'game-controller': 'game-controller-outline', 'car': 'car-outline', 'home': 'home-outline',
  'pencil': 'pencil-outline', 'school': 'school-outline', 'walk': 'walk-outline',
  'water': 'water-outline', 'leaf': 'leaf-outline', 'medkit': 'medkit-outline',
  'settings': 'settings-outline',
};
const getIcon = (name: string): keyof typeof Ionicons.glyphMap => {
  if (!name) return 'time-outline';
  if (iconMap[name]) return iconMap[name] as keyof typeof Ionicons.glyphMap;
  if (name.endsWith('-outline')) return name as keyof typeof Ionicons.glyphMap;
  return (name + '-outline') as keyof typeof Ionicons.glyphMap;
};
 
const parseTimeToDate = (t: string): Date => {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
 
const formatRemaining = (ms: number) => {
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  const total = Math.floor(ms / 1000);
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};
 
const pad = (n: number) => n.toString().padStart(2, '0');
 
export default function FocusScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
 
  const label     = (params.label as string)      || 'Focus Time';
  const icon      = (params.icon as string)       || 'time';
  const startTime = (params.start_time as string) || '09:00';
  const endTime   = (params.end_time as string)   || '10:00';
 
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(true);
 
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0.3)).current;
 
  useEffect(() => {
    const endDate = parseTimeToDate(endTime);
    const diff = endDate.getTime() - Date.now();
    setTimeRemaining(Math.max(0, diff));
    setIsActive(diff > 0);
  }, [endTime]);
 
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1000;
        if (next <= 0) { setIsActive(false); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);
 
  useEffect(() => {
    if (!isActive) return;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
    ]));
    const glow = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.55, duration: 2200, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.25, duration: 2200, useNativeDriver: false }),
    ]));
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, [isActive]);
 
  const { hours, minutes, seconds } = formatRemaining(timeRemaining);
  const totalDuration = parseTimeToDate(endTime).getTime() - parseTimeToDate(startTime).getTime();
  const progressPct = isActive && totalDuration > 0
    ? Math.max(0, Math.min(1, timeRemaining / totalDuration))
    : 0;
 
  const handleClose = useCallback(() => router.back(), [router]);
 
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f1218', '#141a22', '#1c2029']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.content, {
        paddingTop: insets.top + SPACING.lg,
        paddingBottom: insets.bottom + SPACING.lg,
      }]}>
 
        <View style={styles.iconSection}>
          <Animated.View style={[styles.iconRing, {
            transform: [{ scale: pulseAnim }],
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowAnim as any,
            shadowRadius: 28,
            elevation: 8,
          }]}>
            <View style={[styles.iconInner, { backgroundColor: `${colors.accent}22` }]}>
              <Ionicons name={getIcon(icon)} size={54} color={colors.accent} />
            </View>
          </Animated.View>
        </View>
 
        <Text style={styles.taskLabel}>{label}</Text>
        <Text style={[styles.timeRange, { color: '#7080a0' }]}>
          {startTime} — {endTime}
        </Text>
 
        <View style={styles.timerSection}>
          {isActive ? (
            <>
              <Text style={[styles.timerLabel, { color: '#4a5a72' }]}>TIME REMAINING</Text>
              <View style={styles.timerDisplay}>
                {hours > 0 && (
                  <>
                    <View style={styles.timerBlock}>
                      <Text style={[styles.timerNum, { color: colors.accent }]}>{pad(hours)}</Text>
                      <Text style={[styles.timerUnit, { color: '#4a5a72' }]}>HR</Text>
                    </View>
                    <Text style={[styles.timerSep, { color: '#3a4a62' }]}>:</Text>
                  </>
                )}
                <View style={styles.timerBlock}>
                  <Text style={[styles.timerNum, { color: colors.accent }]}>{pad(minutes)}</Text>
                  <Text style={[styles.timerUnit, { color: '#4a5a72' }]}>MIN</Text>
                </View>
                <Text style={[styles.timerSep, { color: '#3a4a62' }]}>:</Text>
                <View style={styles.timerBlock}>
                  <Text style={[styles.timerNum, { color: colors.accent }]}>{pad(seconds)}</Text>
                  <Text style={[styles.timerUnit, { color: '#4a5a72' }]}>SEC</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.completedWrap}>
              <Ionicons name="checkmark-circle" size={64} color={colors.done} />
              <Text style={[styles.completedText, { color: colors.done }]}>Task Complete!</Text>
            </View>
          )}
        </View>
 
        {isActive && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: '#1a2030' }]}>
              <View style={[styles.progressFill, {
                backgroundColor: colors.accent,
                width: `${(1 - progressPct) * 100}%` as any,
              }]} />
            </View>
          </View>
        )}
 
        <View style={{ flex: 1 }} />
 
        <TouchableOpacity
          style={[styles.exitBtn, { backgroundColor: '#1a2030' }]}
          onPress={handleClose}
        >
          <Text style={[styles.exitText, { color: '#5a6880' }]}>Exit Focus Mode</Text>
        </TouchableOpacity>
 
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen:  { flex: 1 },
  content: { flex: 1, paddingHorizontal: SPACING.xl, alignItems: 'center' },
  iconSection: { flex: 0.5, justifyContent: 'flex-end', paddingBottom: SPACING.xl },
  iconRing: {},
  iconInner: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
  taskLabel:  { fontSize: FONT.xxl, fontWeight: '700', color: '#edf2fc', textAlign: 'center', letterSpacing: -0.5, marginBottom: SPACING.sm },
  timeRange:  { fontSize: FONT.md, fontWeight: '500', marginBottom: SPACING.xxl },
  timerSection: { alignItems: 'center', marginBottom: SPACING.xl },
  timerLabel:   { fontSize: 11, fontWeight: '600', letterSpacing: 2, marginBottom: SPACING.md },
  timerDisplay: { flexDirection: 'row', alignItems: 'flex-end' },
  timerBlock:   { alignItems: 'center', minWidth: 72 },
  timerNum:     { fontSize: 52, fontWeight: '200', letterSpacing: -2 },
  timerUnit:    { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: -4 },
  timerSep:     { fontSize: 40, fontWeight: '200', marginHorizontal: 4, marginBottom: 14 },
  completedWrap: { alignItems: 'center', gap: SPACING.md },
  completedText: { fontSize: FONT.xl, fontWeight: '600' },
  progressWrap:  { width: '80%', marginBottom: SPACING.xxl },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },
  exitBtn:  { width: '100%', alignItems: 'center', paddingVertical: SPACING.md, borderRadius: RADIUS.lg },
  exitText: { fontSize: FONT.sm, fontWeight: '500' },
});
 