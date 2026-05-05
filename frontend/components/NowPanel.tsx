import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useTheme, getNeuShadow, SPACING, RADIUS, FONT } from '../context/ThemeContext';
 
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
 
interface ScheduleSlot {
  id: string; label: string; icon: string;
  start_time: string; end_time: string;
  order_index: number; days: string[];
}
interface DailyTask {
  id: string; date: string; slot_id: string; completed: boolean;
}
interface TaskWithSlot extends DailyTask {
  slot: ScheduleSlot; isCurrentTask?: boolean;
}
 
const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
 
const isCurrentTask = (start: string, end: string) => {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  let s = toMins(start), e = toMins(end);
  if (e < s) { e += 1440; if (cur < s) return cur + 1440 >= s && cur + 1440 <= e; }
  return cur >= s && cur <= e;
};
 
const minsLeft = (end: string) => {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  let e = toMins(end);
  if (e < cur) e += 1440;
  const diff = e - cur;
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60), m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m left`;
  if (h > 0) return `${h}h left`;
  return `${m}m left`;
};
 
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};
 
export function NowPanel({ insets }: { insets: any }) {
  const { isDark, colors } = useTheme();
  const router = useRouter();
 
  const [tasks, setTasks] = useState<TaskWithSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
 
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const dayName = format(new Date(), 'EEEE');
 
  const fetchData = useCallback(async () => {
    try {
      const [slotsRes, tasksRes] = await Promise.all([
        fetch(`${API_URL}/api/schedule-slots`),
        fetch(`${API_URL}/api/daily-tasks/${dateStr}`),
      ]);
      const slots: ScheduleSlot[] = await slotsRes.json();
      const daily: DailyTask[] = await tasksRes.json();
 
      const merged: TaskWithSlot[] = daily
        .map(t => {
          const slot = slots.find(s => s.id === t.slot_id);
          if (!slot) return null;
          return { ...t, slot, isCurrentTask: isCurrentTask(slot.start_time, slot.end_time) };
        })
        .filter(Boolean)
        .sort((a, b) => a!.slot.order_index - b!.slot.order_index) as TaskWithSlot[];
 
      setTasks(merged);
      setTotal(merged.length);
      setCompleted(merged.filter(t => t.completed).length);
    } catch (e) {
      console.error('NowPanel fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateStr]);
 
  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
 
  const currentTask = tasks.find(t => t.isCurrentTask && !t.completed);
  const nextTask = !currentTask ? tasks.find(t => !t.completed) : null;
  const heroTask = currentTask || nextTask;
 
  const handleFocus = (task: TaskWithSlot) => {
    router.push({
      pathname: '/focus',
      params: {
        label: task.slot.label, icon: task.slot.icon,
        start_time: task.slot.start_time, end_time: task.slot.end_time,
      },
    });
  };
 
  return (
    <View style={[styles.screen, { backgroundColor: colors.bgBase }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
 
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={colors.accent}
            />
          }
        >
          {/* Greeting */}
          <Text style={[styles.greet, { color: colors.textDim }]}>{greeting()}</Text>
          <View style={styles.dateRow}>
            <Text style={[styles.dayName, { color: colors.textPrimary }]}>{dayName}</Text>
            <Text style={[styles.dateSub, { color: colors.textDim }]}>
              {format(new Date(), 'MMM d')}
            </Text>
          </View>
 
          {/* Hero card */}
          {heroTask ? (
            <View style={[styles.heroCard, { backgroundColor: colors.bgSurface }, getNeuShadow(isDark)]}>
              <View style={styles.nowRow}>
                <View style={[styles.nowDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.nowLabel, { color: colors.accent }]}>
                  {currentTask ? 'NOW ACTIVE' : 'UP NEXT'}
                </Text>
              </View>
              <Text style={[styles.heroName, { color: colors.textPrimary }]}>
                {heroTask.slot.label}
              </Text>
              <Text style={[styles.heroTime, { color: colors.textMuted }]}>
                {heroTask.slot.start_time} – {heroTask.slot.end_time}
                {currentTask && minsLeft(heroTask.slot.end_time)
                  ? `  ·  ${minsLeft(heroTask.slot.end_time)}`
                  : ''}
              </Text>
              <TouchableOpacity
                style={[styles.focusBtn, { backgroundColor: colors.accent }]}
                onPress={() => handleFocus(heroTask)}
              >
                <Text style={styles.focusBtnText}>Enter focus mode →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.heroCard, styles.heroEmpty, { borderColor: colors.dividerStrong }]}>
              <Text style={[styles.heroEmptyText, { color: colors.textDim }]}>
                {total === 0 ? 'No tasks scheduled today' : '🎉 All tasks complete!'}
              </Text>
            </View>
          )}
 
          {/* Done count — bold, simple */}
          <View style={styles.doneRow}>
            <Text style={[styles.doneCount, { color: colors.textPrimary }]}>
              {completed}
              <Text style={[styles.doneOf, { color: colors.textMuted }]}> of {total} done</Text>
            </Text>
          </View>
 
          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.progressTrack }]}>
            <View style={[styles.progressFill, {
              width: total > 0 ? `${Math.round((completed / total) * 100)}%` as any : '0%',
              backgroundColor: colors.done,
            }]} />
          </View>
 
        </Animated.ScrollView>
      )}
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
 
  greet:   { fontSize: FONT.xs, marginBottom: 3 },
  dateRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: SPACING.lg },
  dayName: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  dateSub: { fontSize: FONT.xs },
 
  heroCard: { borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.lg },
  heroEmpty: {
    borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1,
    marginBottom: SPACING.lg, alignItems: 'center', justifyContent: 'center', minHeight: 100,
  },
  heroEmptyText: { fontSize: FONT.md, fontStyle: 'italic' },
 
  nowRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  nowDot:  { width: 7, height: 7, borderRadius: 3.5 },
  nowLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.14 },
  heroName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 32, marginBottom: 6 },
  heroTime: { fontSize: FONT.sm, marginBottom: SPACING.md },
  focusBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  focusBtnText: { color: '#fff', fontSize: FONT.sm, fontWeight: '600' },
 
  doneRow:   { flexDirection: 'row', alignItems: 'baseline', marginBottom: SPACING.sm, marginTop: SPACING.sm },
  doneCount: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  doneOf:    { fontSize: FONT.md },
 
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.sm },
  progressFill:  { height: '100%', borderRadius: 3 },
});
 