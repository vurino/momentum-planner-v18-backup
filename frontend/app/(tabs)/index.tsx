import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  RefreshControl, Pressable, Dimensions, FlatList, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  interpolate, Extrapolation, withTiming, useAnimatedRef,
  scrollTo, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from 'expo-keep-awake';
import { format, addDays, subDays } from 'date-fns';
import { useRouter } from 'expo-router';
import {
  useTheme, getCardShadow, getTaskGlow, getNeuShadow, SPACING, RADIUS, FONT,
} from '../../context/ThemeContext';
 
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SW } = Dimensions.get('window');
 
// ── Scroll threshold at which B→A transition completes ──
const SCROLL_THRESHOLD = 100;
 
// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ScheduleSlot {
  id: string; label: string; icon: string;
  start_time: string; end_time: string;
  group: string; order_index: number; days: string[]; notes?: string;
}
interface DailyTask {
  id: string; date: string; slot_id: string; completed: boolean;
}
interface TaskWithSlot extends DailyTask {
  slot: ScheduleSlot; isCurrentTask?: boolean; overlappingWith?: string;
}
interface ProgressData { total: number; completed: number; percentage: number; }
 
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'restaurant': 'restaurant-outline', 'sunny': 'sunny-outline', 'briefcase': 'briefcase-outline',
  'cafe': 'cafe-outline', 'trending-up': 'trending-up-outline', 'book': 'book-outline',
  'fitness': 'fitness-outline', 'fast-food': 'fast-food-outline', 'analytics': 'analytics-outline',
  'code': 'code-outline', 'moon': 'moon-outline', 'bed': 'bed-outline', 'time': 'time-outline',
  'heart': 'heart-outline', 'musical-notes': 'musical-notes-outline',
  'game-controller': 'game-controller-outline', 'car': 'car-outline', 'home': 'home-outline',
  'pencil': 'pencil-outline', 'school': 'school-outline', 'walk': 'walk-outline',
  'water': 'water-outline', 'leaf': 'leaf-outline', 'medkit': 'medkit-outline',
  'restaurant-outline': 'restaurant-outline', 'sunny-outline': 'sunny-outline',
};
const getIcon = (name: string): keyof typeof Ionicons.glyphMap =>
  iconMap[name] || iconMap[name + '-outline'] || 'time-outline';
 
const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtMins = (m: number) => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
 
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
 
// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
async function scheduleTaskEndNotification(task: TaskWithSlot) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    // Cancel any existing notifications for this slot
    await Notifications.cancelAllScheduledNotificationsAsync();
    const [h, m] = task.slot.end_time.split(':').map(Number);
    const trigger = new Date();
    trigger.setHours(h, m, 0, 0);
    if (trigger <= new Date()) return; // already passed
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${task.slot.label} — time's up`,
        body: 'Your scheduled block has ended.',
        sound: true,
      },
      trigger,
    });
  } catch (e) {
    console.log('Notification scheduling failed:', e);
  }
}
 
// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED CHECKBOX
// ─────────────────────────────────────────────────────────────────────────────
const AnimatedCheckbox = ({ isCompleted, onToggle, colors, isDark }: {
  isCompleted: boolean; onToggle: () => void; colors: any; isDark: boolean;
}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
 
  const handlePress = () => {
    scale.value = withTiming(0.85, { duration: 80 }, () => {
      scale.value = withTiming(1, { duration: 80 });
    });
    onToggle();
  };
 
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[styles.checkbox, animStyle, {
        backgroundColor: isCompleted ? colors.done : 'transparent',
        borderColor: isCompleted ? colors.done : '#3a4a62',
        ...(isCompleted ? {
          shadowColor: colors.done, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3, shadowRadius: 4,
        } : {
          shadowColor: '#000', shadowOffset: { width: 1, height: 1 },
          shadowOpacity: 0.4, shadowRadius: 3, elevation: 2,
        }),
      }]}>
        {isCompleted && (
          <Ionicons name="checkmark" size={10} color={isDark ? '#0e1820' : '#fff'} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// WEEK STRIP
// ─────────────────────────────────────────────────────────────────────────────
const WeekStrip = ({ currentDate, onDayPress, completedDates, colors, isDark }: {
  currentDate: Date; onDayPress: (d: Date) => void;
  completedDates: string[]; colors: any; isDark: boolean;
}) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = format(new Date(), 'yyyy-MM-dd');
 
  // Get Mon-Sun for the week containing currentDate
  const getWeekDays = (date: Date): Date[] => {
    const d = new Date(date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(monday);
      dd.setDate(monday.getDate() + i);
      return dd;
    });
  };
 
  const weekDays = getWeekDays(currentDate);
 
  return (
    <View style={styles.weekStrip}>
      {weekDays.map((day, i) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isToday = dateStr === today;
        const isSelected = dateStr === format(currentDate, 'yyyy-MM-dd');
        const isDone = completedDates.includes(dateStr);
        const dayNum = format(day, 'd');
 
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onDayPress(day)}
            style={styles.dayCol}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayLabel, { color: colors.dayLabelColor }]}>
              {days[i]}
            </Text>
            <View style={[
              styles.dayBubble,
              isToday && { backgroundColor: colors.accent },
              !isToday && isDone && {
                backgroundColor: colors.dayBubbleDone,
                ...(isDark
                  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0,
                      borderWidth: 1, borderColor: colors.done + '40' }
                  : {}),
              },
              !isToday && !isDone && {
                backgroundColor: colors.dayBubbleNormal,
                shadowColor: isDark ? '#111620' : colors.shadowDark,
                shadowOffset: { width: 1.5, height: 1.5 },
                shadowOpacity: isDark ? 0.8 : 0.6,
                shadowRadius: 3,
                elevation: 2,
              },
            ]}>
              <Text style={[
                styles.dayNum,
                isToday && { color: '#fff' },
                !isToday && isDone && { color: colors.done },
                !isToday && !isDone && { color: colors.textDim },
              ]}>
                {dayNum}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS RING
// ─────────────────────────────────────────────────────────────────────────────
const ProgressRing = ({ completed, total, colors }: {
  completed: number; total: number; colors: any;
}) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const size = 38;
  const r = 14;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
 
  return (
    <View style={styles.ringWrap}>
      <View style={styles.ringSvgWrap}>
        {/* We approximate the ring with border-based circle since SVG isn't native */}
        <View style={[styles.ringOuter, { width: size, height: size, borderRadius: size / 2,
          borderColor: colors.progressTrack, borderWidth: 3 }]}>
          {/* Fill arc approximation using border color change */}
          <View style={[styles.ringFill, { borderColor: colors.done, borderWidth: pct > 0 ? 3 : 0 }]} />
        </View>
        <Text style={[styles.ringPct, { color: colors.done }]}>{pct}%</Text>
      </View>
      <View>
        <Text style={[styles.ringMain, { color: colors.textBody }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{completed} of {total}</Text>
          {' done'}
        </Text>
        <Text style={[styles.ringSub, { color: colors.textDim }]}>
          {total - completed} remaining today
        </Text>
      </View>
    </View>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// TASK ITEM (A view)
// ─────────────────────────────────────────────────────────────────────────────
const TaskItem = ({ task, onToggle, onFocus, onNotes, colors, isDark }: {
  task: TaskWithSlot; onToggle: (id: string, c: boolean) => void;
  onFocus: (t: TaskWithSlot) => void; onNotes: (t: TaskWithSlot) => void;
  colors: any; isDark: boolean;
}) => {
  const isCur = task.isCurrentTask;
  const isDone = task.completed;
 
  return (
    <View style={[
      styles.taskRow,
      isCur && !isDone && [
        styles.taskRowCurrent,
        { backgroundColor: colors.bgTask },
        getTaskGlow(),
      ],
      isDone && styles.taskRowDone,
    ]}>
      <AnimatedCheckbox
        isCompleted={isDone}
        onToggle={() => onToggle(task.id, !task.completed)}
        colors={colors}
        isDark={isDark}
      />
 
      {/* Icon — flat, no well */}
      <View style={styles.taskIcon}>
        <Ionicons
          name={getIcon(task.slot.icon)}
          size={13}
          color={isCur && !isDone ? colors.iconActive : isDone ? colors.iconDone : colors.iconMuted}
        />
      </View>
 
      {/* Content */}
      <View style={styles.taskInfo}>
        <Text
          numberOfLines={1}
          style={[
            styles.taskName,
            { color: isCur && !isDone ? colors.textPrimary : isDone ? colors.textDim : colors.textSecondary },
            isDone && styles.taskNameDone,
            isCur && !isDone && { fontWeight: '700' },
          ]}
        >
          {task.slot.label}
        </Text>
        <Text style={[styles.taskTime, { color: isCur ? colors.textMuted : colors.textDim }]}>
          {task.slot.start_time} – {task.slot.end_time}
        </Text>
      </View>
 
      {/* Actions */}
      <View style={styles.taskActions}>
        {isCur && !isDone && (
          <TouchableOpacity
            onPress={() => onFocus(task)}
            style={[styles.focusBadge, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.focusBadgeText}>FOCUS</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onNotes(task)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={task.slot.notes ? 'document-text' : 'document-text-outline'}
            size={14}
            color={task.slot.notes ? colors.accent : colors.textDim}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// NOTES MODAL
// ─────────────────────────────────────────────────────────────────────────────
const NotesModal = ({ visible, task, onClose, onSave, colors }: {
  visible: boolean; task: TaskWithSlot | null; onClose: () => void;
  onSave: (slotId: string, notes: string) => void; colors: any;
}) => {
  const [notes, setNotes] = useState('');
  useEffect(() => { if (task) setNotes(task.slot.notes || ''); }, [task]);
  if (!task) return null;
 
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable onPress={e => e.stopPropagation()}
            style={[styles.notesCard, { backgroundColor: colors.bgSurface || colors.bgBase }]}>
            <View style={styles.notesHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={getIcon(task.slot.icon)} size={18} color={colors.accent} />
                <Text style={[styles.notesTitle, { color: colors.textPrimary }]}>{task.slot.label}</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.notesInput, { color: colors.textPrimary, borderColor: colors.accent,
                backgroundColor: colors.bgBase }]}
              value={notes} onChangeText={setNotes}
              placeholder="Add notes…" placeholderTextColor={colors.textDim}
              multiline numberOfLines={5} textAlignVertical="top" autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.notesBtn, { backgroundColor: colors.bgBase }]} onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.notesBtn, { backgroundColor: colors.accent }]}
                onPress={() => { onSave(task.slot.id, notes); onClose(); }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskWithSlot[]>([]);
  const [progress, setProgress] = useState<ProgressData>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [notesTask, setNotesTask] = useState<TaskWithSlot | null>(null);
  const [completedDates] = useState<string[]>([]); // populated from history API later
 
  const scrollY = useSharedValue(0);
  const listRef = useAnimatedRef<Animated.FlatList<any>>();
 
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
  const dayName = format(currentDate, 'EEEE');
  const dateDisplay = format(currentDate, 'MMMM d, yyyy');
 
  // ── Fetch ──────────────────────────────────────────────────────────────────
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
          return { ...t, slot, isCurrentTask: isToday && isCurrentTask(slot.start_time, slot.end_time) };
        })
        .filter(Boolean)
        .sort((a, b) => a!.slot.order_index - b!.slot.order_index) as TaskWithSlot[];
 
      setTasks(merged);
      const total = merged.length;
      const completed = merged.filter(t => t.completed).length;
      setProgress({ total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 });
 
      // Schedule notification for current task
      const cur = merged.find(t => t.isCurrentTask && !t.completed);
      if (cur) scheduleTaskEndNotification(cur);
    } catch (e) {
      console.error('TodayScreen fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateStr, isToday]);
 
  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
 
  // ── Toggle task ───────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (taskId: string, completed: boolean) => {
    // Haptics
    if (completed) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
 
    try {
      await fetch(`${API_URL}/api/daily-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } : t));
      setProgress(prev => {
        const nc = completed ? prev.completed + 1 : prev.completed - 1;
        return { ...prev, completed: nc, percentage: prev.total > 0 ? Math.round((nc / prev.total) * 100) : 0 };
      });
    } catch (e) {
      console.error('Toggle error:', e);
    }
  }, []);
 
  // ── Focus mode ────────────────────────────────────────────────────────────
  const handleFocus = useCallback((task: TaskWithSlot) => {
    router.push({
      pathname: '/focus',
      params: { label: task.slot.label, icon: task.slot.icon,
        start_time: task.slot.start_time, end_time: task.slot.end_time },
    });
  }, [router]);
 
  // ── Notes ─────────────────────────────────────────────────────────────────
  const handleSaveNotes = useCallback(async (slotId: string, notes: string) => {
    try {
      await fetch(`${API_URL}/api/schedule-slots/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      setTasks(prev => prev.map(t => t.slot.id === slotId ? { ...t, slot: { ...t.slot, notes } } : t));
    } catch (e) {
      console.error('Notes save error:', e);
    }
  }, []);
 
  // ── Scroll handler (B→A transition) ───────────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
 
  // Hero card: visible at scroll 0, fades/shrinks as user scrolls
  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD * 0.6], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -20], Extrapolation.CLAMP) }],
  }));
 
  // Date header in B view: visible at scroll 0
  const bHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD * 0.5], [1, 0], Extrapolation.CLAMP),
  }));
 
  // A header (date + week strip): fades in as user scrolls
  const aHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [SCROLL_THRESHOLD * 0.4, SCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [SCROLL_THRESHOLD * 0.4, SCROLL_THRESHOLD], [10, 0], Extrapolation.CLAMP) }],
  }));
 
  // ── Current task (for B view) ─────────────────────────────────────────────
  const currentTask = tasks.find(t => t.isCurrentTask && !t.completed);
  const nextTask = !currentTask ? tasks.find(t => !t.completed) : null;
  const heroTask = currentTask || nextTask;
  const upNext = tasks.filter(t => !t.isCurrentTask && !t.completed).slice(0, 6);
 
  // ── Render task (A view) ──────────────────────────────────────────────────
  const renderTask = useCallback(({ item }: { item: TaskWithSlot }) => (
    <TaskItem
      task={item} colors={colors} isDark={isDark}
      onToggle={handleToggle} onFocus={handleFocus}
      onNotes={(t) => { setNotesTask(t); setNotesVisible(true); }}
    />
  ), [colors, isDark, handleToggle, handleFocus]);
 
  // ── List header — B view + spacer ─────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* B VIEW — Focus hero, shown at scroll 0 */}
      <Animated.View style={[styles.bSection, bHeaderStyle]}>
        {/* Greeting + date */}
        <View style={styles.bGreeting}>
          <Text style={[styles.bGreetText, { color: colors.textDim }]}>{greeting()}</Text>
          <View style={styles.bDateRow}>
            <Text style={[styles.bDayName, { color: colors.textPrimary }]}>
              {isToday ? 'Thursday' : dayName}
            </Text>
            <Text style={[styles.bDateSub, { color: colors.textDim }]}>
              {format(currentDate, 'MMM d')}
            </Text>
          </View>
        </View>
 
        {/* Hero card — ONLY neumorphic element */}
        {heroTask ? (
          <Animated.View style={heroStyle}>
            <View style={[styles.heroCard, { backgroundColor: colors.bgSurface }, getNeuShadow(isDark)]}>
              {/* NOW / NEXT label */}
              <View style={styles.heroNowRow}>
                <View style={[styles.heroNowDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.heroNowLabel, { color: colors.accent }]}>
                  {currentTask ? 'NOW ACTIVE' : 'UP NEXT'}
                </Text>
              </View>
 
              {/* Task name */}
              <Text style={[styles.heroTaskName, { color: colors.textPrimary }]}>
                {heroTask.slot.label}
              </Text>
 
              {/* Time + time left */}
              <Text style={[styles.heroTaskSub, { color: colors.textMuted }]}>
                {heroTask.slot.start_time} – {heroTask.slot.end_time}
                {currentTask ? `  ·  ${minsLeft(heroTask.slot.end_time)}` : ''}
              </Text>
 
              {/* Focus button */}
              <TouchableOpacity
                style={[styles.heroFocusBtn, { backgroundColor: colors.accent }]}
                onPress={() => handleFocus(heroTask)}
              >
                <Text style={styles.heroFocusBtnText}>Enter focus mode →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.heroCard, styles.heroEmpty, { borderColor: colors.dividerStrong }, heroStyle]}>
            <Text style={[styles.heroEmptyText, { color: colors.textDim }]}>
              {progress.total === 0 ? 'No tasks scheduled today' : 'All tasks complete 🎉'}
            </Text>
          </Animated.View>
        )}
 
        {/* Progress ring row — flat */}
        <View style={styles.progressRow}>
          <ProgressRing completed={progress.completed} total={progress.total} colors={colors} />
        </View>
 
        {/* UP NEXT flat list */}
        {upNext.length > 0 && (
          <View style={styles.upNextSection}>
            <Text style={[styles.upNextLabel, { color: colors.textInvisible }]}>UP NEXT</Text>
            <View style={[styles.upNextList, { backgroundColor: 'transparent' }]}>
              {/* Fade mask top */}
              <View style={styles.fadeTop} pointerEvents="none" />
              {upNext.map((t, i) => (
                <View key={t.id}>
                  <View style={styles.upNextRow}>
                    <View style={[styles.upNextDot,
                      { backgroundColor: i === 0 ? colors.accent : colors.textInvisible }]} />
                    <Text style={[styles.upNextName,
                      { color: i === 0 ? colors.textBody : colors.textDim }]} numberOfLines={1}>
                      {t.slot.label}
                    </Text>
                    <Text style={[styles.upNextTime, { color: colors.textInvisible }]}>
                      {t.slot.start_time}
                    </Text>
                  </View>
                  {i < upNext.length - 1 && (
                    <View style={[styles.upNextDivider, { backgroundColor: colors.divider }]} />
                  )}
                </View>
              ))}
              {/* Fade mask bottom */}
              <View style={styles.fadeBottom} pointerEvents="none" />
            </View>
          </View>
        )}
      </Animated.View>
 
      {/* A VIEW HEADER — date + week strip + progress bar, fades in on scroll */}
      <Animated.View style={[styles.aHeader, aHeaderStyle]} pointerEvents="none">
        <View style={styles.aDateBlock}>
          <Text style={[styles.aDayName, { color: colors.textPrimary }]}>
            {isToday ? dayName : dayName}
          </Text>
          <Text style={[styles.aDateSub, { color: colors.textMuted }]}>
            {format(currentDate, 'MMMM d')} · Momentum Planner
          </Text>
        </View>
 
        <WeekStrip
          currentDate={currentDate}
          onDayPress={setCurrentDate}
          completedDates={completedDates}
          colors={colors}
          isDark={isDark}
        />
 
        {/* Green progress bar */}
        <View style={styles.aProgressRow}>
          <View style={[styles.aProgressTrack, { backgroundColor: colors.progressTrack }]}>
            <View style={[styles.aProgressFill, {
              width: `${progress.percentage}%` as any,
              backgroundColor: colors.done,
            }]} />
          </View>
          <Text style={[styles.aProgressPct, { color: colors.done }]}>{progress.percentage}%</Text>
        </View>
      </Animated.View>
 
      {/* Spacer so A list starts below the A header */}
      <View style={{ height: SCROLL_THRESHOLD + 20 }} />
    </View>
  );
 
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: colors.bgBase }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
 
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + SPACING.md }]}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={colors.accent}
            />
          }
        />
      )}
 
      <NotesModal
        visible={notesVisible}
        task={notesTask}
        onClose={() => { setNotesVisible(false); setNotesTask(null); }}
        onSave={handleSaveNotes}
        colors={colors}
      />
    </View>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
 
  // ── B section ──
  bSection: { marginBottom: SPACING.md },
  bGreeting: { marginBottom: SPACING.md },
  bGreetText: { fontSize: FONT.xs, marginBottom: 2 },
  bDateRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bDayName: { fontSize: FONT.xl, fontWeight: '700', letterSpacing: -0.5 },
  bDateSub: { fontSize: FONT.xs },
 
  // Hero card
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  heroEmpty: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  heroEmptyText: { fontSize: FONT.sm, fontStyle: 'italic' },
  heroNowRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  heroNowDot: { width: 5, height: 5, borderRadius: 2.5 },
  heroNowLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.12 },
  heroTaskName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 26, marginBottom: 3 },
  heroTaskSub: { fontSize: FONT.xs, marginBottom: SPACING.md },
  heroFocusBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  heroFocusBtnText: { color: '#fff', fontSize: FONT.xs, fontWeight: '600' },
 
  // Progress row
  progressRow: { marginBottom: SPACING.md },
  ringWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  ringSvgWrap: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  ringOuter: { justifyContent: 'center', alignItems: 'center' },
  ringFill: { position: 'absolute', width: '100%', height: '100%', borderRadius: 19 },
  ringPct: { position: 'absolute', fontSize: 9, fontWeight: '700' },
  ringMain: { fontSize: FONT.sm },
  ringSub: { fontSize: FONT.xs, marginTop: 1 },
 
  // UP NEXT
  upNextSection: { position: 'relative' },
  upNextLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.12, marginBottom: SPACING.sm },
  upNextList: { position: 'relative', overflow: 'hidden' },
  fadeTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 20, zIndex: 1,
  },
  fadeBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, zIndex: 1,
  },
  upNextRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 5 },
  upNextDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  upNextName: { flex: 1, fontSize: FONT.sm },
  upNextTime: { fontSize: FONT.xs },
  upNextDivider: { height: 1, marginVertical: 1 },
 
  // ── A header ──
  aHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 8,
  },
  aDateBlock: { marginBottom: SPACING.md },
  aDayName: { fontSize: FONT.xl, fontWeight: '700', letterSpacing: -0.5 },
  aDateSub: { fontSize: FONT.xs, marginTop: 1 },
  aProgressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  aProgressTrack: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  aProgressFill: { height: '100%', borderRadius: 2 },
  aProgressPct: { fontSize: FONT.sm, fontWeight: '700', minWidth: 32, textAlign: 'right' },
 
  // ── Week strip ──
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  dayCol: { alignItems: 'center', gap: 3 },
  dayLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.04 },
  dayBubble: {
    width: 28, height: 28, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  dayNum: { fontSize: 10, fontWeight: '700' },
 
  // ── Task rows (A view) ──
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 7, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg, marginBottom: 4,
  },
  taskRowCurrent: { borderRadius: RADIUS.lg },
  taskRowDone: { opacity: 0.42 },
 
  checkbox: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  taskIcon: { width: 18, height: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  taskInfo: { flex: 1, minWidth: 0 },
  taskName: { fontSize: 10.5, fontWeight: '600' },
  taskNameDone: { textDecorationLine: 'line-through' },
  taskTime: { fontSize: 8, marginTop: 1 },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  focusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  focusBadgeText: { color: '#fff', fontSize: 7, fontWeight: '700', letterSpacing: 0.06 },
 
  // ── Notes modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  notesCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.xl, padding: SPACING.md },
  notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  notesTitle: { fontSize: FONT.md, fontWeight: '700' },
  notesInput: { fontSize: FONT.sm, borderRadius: RADIUS.md, padding: SPACING.sm, minHeight: 100, borderWidth: 1.5, marginBottom: SPACING.md },
  notesBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: RADIUS.md },
});
 