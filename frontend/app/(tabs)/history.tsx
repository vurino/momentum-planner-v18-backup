import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, subDays, parseISO } from 'date-fns';
import { useTheme, getCardShadow, SPACING, RADIUS, FONT } from '../../context/ThemeContext';
 
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
 
// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
 
// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface TaskEntry {
  label: string; icon: string; completed: boolean;
  start_time: string; end_time: string;
}
 
interface DayEntry {
  date: string;        // 'yyyy-MM-dd'
  total: number;
  completed: number;
  percentage: number;
  tasks: TaskEntry[];
}
 
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'sunny': 'sunny-outline', 'briefcase': 'briefcase-outline', 'cafe': 'cafe-outline',
  'book': 'book-outline', 'fitness': 'fitness-outline', 'moon': 'moon-outline',
  'restaurant': 'restaurant-outline', 'time': 'time-outline', 'heart': 'heart-outline',
  'walk': 'walk-outline', 'water': 'water-outline', 'home': 'home-outline',
};
const getIcon = (name: string): keyof typeof Ionicons.glyphMap =>
  iconMap[name] || iconMap[name + '-outline'] || 'time-outline';
 
const dayLabel = (dateStr: string): string => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  try { return format(parseISO(dateStr), 'EEEE'); } catch { return dateStr; }
};
 
const dateLabel = (dateStr: string): string => {
  try { return format(parseISO(dateStr), 'MMMM d, yyyy'); } catch { return dateStr; }
};
 
// ─────────────────────────────────────────────────────────────────────────────
// DAY CARD
// ─────────────────────────────────────────────────────────────────────────────
const DayCard = ({ entry, colors, isDark }: {
  entry: DayEntry; colors: any; isDark: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const pct = entry.percentage;
 
  // Color of progress bar based on completion
  const barColor = pct >= 80 ? colors.done : pct >= 50 ? colors.accent : '#ef4444';
 
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };
 
  return (
    <View style={[styles.dayCard, { backgroundColor: isDark ? '#1e2430' : colors.bgSurface }, getCardShadow(isDark)]}>
 
      {/* Header row */}
      <TouchableOpacity style={styles.dayHeader} onPress={toggle} activeOpacity={0.7}>
        {/* Left: day name + date */}
        <View style={styles.dayLeft}>
          <Text style={[styles.dayName, { color: colors.textPrimary }]}>
            {dayLabel(entry.date)}
          </Text>
          <Text style={[styles.dayDate, { color: colors.textDim }]}>
            {dateLabel(entry.date)}
          </Text>
        </View>
 
        {/* Right: percentage + chevron */}
        <View style={styles.dayRight}>
          <Text style={[styles.dayPct, { color: barColor }]}>{pct}%</Text>
          <Text style={[styles.dayCount, { color: colors.textDim }]}>
            {entry.completed}/{entry.total}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14} color={colors.textDim}
          />
        </View>
      </TouchableOpacity>
 
      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.progressTrack }]}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
 
      {/* Expanded task list */}
      {expanded && entry.tasks.length > 0 && (
        <View style={styles.taskList}>
          {entry.tasks.map((task, i) => (
            <View key={i} style={[styles.taskRow,
              i < entry.tasks.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.divider }]}>
              {/* Completion dot */}
              <View style={[styles.taskDot, {
                backgroundColor: task.completed ? colors.done : colors.progressTrack,
                borderColor: task.completed ? colors.done : colors.textDim,
              }]}>
                {task.completed && <Ionicons name="checkmark" size={8} color={isDark ? '#0e1820' : '#fff'} />}
              </View>
 
              {/* Icon */}
              <Ionicons
                name={getIcon(task.icon)} size={12}
                color={task.completed ? colors.done : colors.iconMuted}
                style={{ marginHorizontal: 6 }}
              />
 
              {/* Label */}
              <Text style={[styles.taskLabel, {
                color: task.completed ? colors.textSecondary : colors.textDim,
                textDecorationLine: task.completed ? 'none' : 'none',
                opacity: task.completed ? 1 : 0.55,
              }]} numberOfLines={1}>
                {task.label}
              </Text>
 
              {/* Time */}
              <Text style={[styles.taskTime, { color: colors.textDim }]}>
                {task.start_time}
              </Text>
            </View>
          ))}
        </View>
      )}
 
      {expanded && entry.tasks.length === 0 && (
        <View style={styles.emptyTasks}>
          <Text style={[styles.emptyText, { color: colors.textDim }]}>No tasks recorded</Text>
        </View>
      )}
    </View>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
 
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
 
  // ── Fetch history ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      // Try the new history endpoint first; fall back to assembling from daily-tasks
      const res = await fetch(`${API_URL}/api/history?days=30`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        // Fallback: fetch last 14 days individually
        const today = new Date();
        const days = Array.from({ length: 14 }, (_, i) => {
          const d = subDays(today, i + 1);
          return format(d, 'yyyy-MM-dd');
        });
 
        const [slotsRes, ...taskResults] = await Promise.all([
          fetch(`${API_URL}/api/schedule-slots`),
          ...days.map(d => fetch(`${API_URL}/api/daily-tasks/${d}`)),
        ]);
 
        const slots = await slotsRes.json();
        const taskArrays = await Promise.all(taskResults.map(r => r.json()));
 
        const entries: DayEntry[] = days.map((date, i) => {
          const dayTasks = taskArrays[i] || [];
          const enriched: TaskEntry[] = dayTasks
            .map((t: any) => {
              const slot = slots.find((s: any) => s.id === t.slot_id);
              if (!slot) return null;
              return { label: slot.label, icon: slot.icon, completed: t.completed,
                start_time: slot.start_time, end_time: slot.end_time };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
 
          const total = enriched.length;
          const completed = enriched.filter(t => t.completed).length;
          return {
            date, total, completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            tasks: enriched,
          };
        }).filter(e => e.total > 0); // Only show days that had tasks
 
        setHistory(entries);
      }
    } catch (e) {
      console.error('History fetch error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => { fetchHistory(); }, [fetchHistory]);
 
  // ── Stats summary ─────────────────────────────────────────────────────────
  const avgPct = history.length > 0
    ? Math.round(history.reduce((sum, d) => sum + d.percentage, 0) / history.length)
    : 0;
  const perfectDays = history.filter(d => d.percentage === 100).length;
  const totalCompleted = history.reduce((sum, d) => sum + d.completed, 0);
 
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: colors.bgBase }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
 
      <View style={[styles.safe, { paddingTop: insets.top }]}>
 
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>History</Text>
        </View>
 
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.errorWrap}>
            <Ionicons name="warning-outline" size={40} color={colors.textDim} />
            <Text style={[styles.errorText, { color: colors.textDim }]}>
              Couldn't load history
            </Text>
            <TouchableOpacity onPress={fetchHistory} style={[styles.retryBtn, { borderColor: colors.accent }]}>
              <Text style={[styles.retryText, { color: colors.accent }]}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={48} color={colors.textDim} />
            <Text style={[styles.emptyTitle, { color: colors.textBody }]}>No history yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textDim }]}>
              Complete tasks today and come back tomorrow
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={item => item.date}
            renderItem={({ item }) => (
              <DayCard entry={item} colors={colors} isDark={isDark} />
            )}
            ListHeaderComponent={() => (
              /* Stats summary row */
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: isDark ? '#1e2430' : colors.bgSurface }, getCardShadow(isDark)]}>
                  <Text style={[styles.statNum, { color: colors.done }]}>{avgPct}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textDim }]}>Avg completion</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: isDark ? '#1e2430' : colors.bgSurface }, getCardShadow(isDark)]}>
                  <Text style={[styles.statNum, { color: colors.accent }]}>{perfectDays}</Text>
                  <Text style={[styles.statLabel, { color: colors.textDim }]}>Perfect days</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: isDark ? '#1e2430' : colors.bgSurface }, getCardShadow(isDark)]}>
                  <Text style={[styles.statNum, { color: colors.textBody }]}>{totalCompleted}</Text>
                  <Text style={[styles.statLabel, { color: colors.textDim }]}>Tasks done</Text>
                </View>
              </View>
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.xl }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe:   { flex: 1 },
 
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  title:  { fontSize: FONT.xl, fontWeight: '700', letterSpacing: -0.5 },
 
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  errorText:   { fontSize: FONT.md },
  retryBtn:    { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1 },
  retryText:   { fontSize: FONT.sm, fontWeight: '600' },
  emptyWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: SPACING.md },
  emptyTitle:      { fontSize: FONT.lg, fontWeight: '600', textAlign: 'center' },
  emptySubtitle:   { fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 },
 
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
 
  // Stats
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
  statNum:  { fontSize: FONT.lg, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: FONT.xs, textAlign: 'center' },
 
  // Day card
  dayCard: { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
  dayLeft:  { flex: 1 },
  dayName:  { fontSize: FONT.md, fontWeight: '700', marginBottom: 1 },
  dayDate:  { fontSize: FONT.xs },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dayPct:   { fontSize: FONT.md, fontWeight: '700' },
  dayCount: { fontSize: FONT.xs },
 
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 0 },
  progressFill:  { height: '100%', borderRadius: 2 },
 
  taskList: { marginTop: SPACING.md },
  taskRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  taskDot:  { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  taskLabel: { flex: 1, fontSize: FONT.xs, fontWeight: '500' },
  taskTime:  { fontSize: FONT.xs },
 
  emptyTasks: { marginTop: SPACING.md, alignItems: 'center' },
  emptyText:  { fontSize: FONT.xs, fontStyle: 'italic' },
});
 