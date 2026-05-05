import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, RefreshControl, Pressable, KeyboardAvoidingView,
  Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useTheme, SPACING, RADIUS, FONT } from '../context/ThemeContext';
 
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
 
interface ScheduleSlot {
  id: string; label: string; icon: string;
  start_time: string; end_time: string;
  order_index: number; days: string[]; notes?: string;
}
interface DailyTask {
  id: string; date: string; slot_id: string; completed: boolean;
}
interface TaskWithSlot extends DailyTask {
  slot: ScheduleSlot; isCurrentTask?: boolean;
}
 
const iconMap: Record<string, string> = {
  'restaurant':'restaurant-outline','sunny':'sunny-outline','briefcase':'briefcase-outline',
  'cafe':'cafe-outline','trending-up':'trending-up-outline','book':'book-outline',
  'fitness':'barbell-outline','fast-food':'fast-food-outline','analytics':'analytics-outline',
  'code':'code-slash-outline','moon':'moon-outline','bed':'bed-outline','time':'time-outline',
  'heart':'heart-outline','musical-notes':'musical-notes-outline',
  'game-controller':'game-controller-outline','car':'car-outline','home':'home-outline',
  'pencil':'pencil-outline','school':'school-outline','walk':'walk-outline',
  'water':'water-outline','leaf':'leaf-outline','medkit':'medkit-outline',
  'settings':'settings-outline',
};
const getIcon = (name: string): keyof typeof Ionicons.glyphMap => {
  if (!name) return 'time-outline';
  if (iconMap[name]) return iconMap[name] as keyof typeof Ionicons.glyphMap;
  if (name.endsWith('-outline')) return name as keyof typeof Ionicons.glyphMap;
  return (name + '-outline') as keyof typeof Ionicons.glyphMap;
};
 
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
 
// ── Animated Checkbox ──────────────────────────────────────────────────────
const Checkbox = ({ done, onToggle, colors, isDark }: {
  done: boolean; onToggle: () => void; colors: any; isDark: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
 
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.75, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onToggle();
  };
 
  return (
    <TouchableOpacity onPress={press} activeOpacity={0.8}>
      <Animated.View style={[styles.checkbox, { transform: [{ scale }],
        backgroundColor: done ? colors.done : 'transparent',
        borderColor: done ? colors.done : colors.textDim,
      }]}>
        {done && <Ionicons name="checkmark" size={11} color={isDark ? '#0e1820' : '#fff'} />}
      </Animated.View>
    </TouchableOpacity>
  );
};
 
// ── Week strip ─────────────────────────────────────────────────────────────
const WeekStrip = ({ currentDate, onDayPress, colors }: {
  currentDate: Date; onDayPress: (d: Date) => void; colors: any;
}) => {
  const days = ['M','T','W','T','F','S','S'];
  const today = format(new Date(), 'yyyy-MM-dd');
 
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
 
  return (
    <View style={styles.weekStrip}>
      {getWeekDays(currentDate).map((day, i) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isToday = dateStr === today;
        return (
          <TouchableOpacity key={i} onPress={() => onDayPress(day)} style={styles.dayCol} activeOpacity={0.7}>
            <Text style={[styles.dayLbl, { color: colors.dayLabelColor }]}>{days[i]}</Text>
            <View style={[styles.dayBubble,
              isToday ? { backgroundColor: colors.accent } : { backgroundColor: colors.dayBubbleNormal }]}>
              <Text style={[styles.dayNum, { color: isToday ? '#fff' : colors.textDim }]}>
                {format(day, 'd')}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
 
// ── Task row ───────────────────────────────────────────────────────────────
const TaskRow = ({ task, onToggle, onFocus, onNotesTap, colors, isDark }: {
  task: TaskWithSlot; onToggle: () => void; onFocus: () => void;
  onNotesTap: () => void; colors: any; isDark: boolean;
}) => {
  const isCur = task.isCurrentTask;
  const isDone = task.completed;
  const left = isCur && !isDone ? minsLeft(task.slot.end_time) : '';
 
  return (
    <View style={[
      styles.taskRow,
      isDone && styles.taskDone,
      isCur && !isDone && { backgroundColor: colors.bgTask, borderRadius: RADIUS.lg },
    ]}>
      {isCur && !isDone && (
        <View style={[styles.curBar, { backgroundColor: colors.accent }]} />
      )}
      <Checkbox done={isDone} onToggle={onToggle} colors={colors} isDark={isDark} />
      <View style={styles.taskIco}>
        <Ionicons
          name={getIcon(task.slot.icon)} size={14}
          color={isCur && !isDone ? colors.accent : isDone ? colors.done : colors.iconMuted}
        />
      </View>
      <View style={styles.taskInfo}>
        <Text numberOfLines={1} style={[styles.taskName,
          { color: isCur && !isDone ? colors.textPrimary : isDone ? colors.textDim : colors.textSecondary },
          isDone && styles.taskStrike,
          isCur && !isDone && { fontWeight: '700' },
        ]}>
          {task.slot.label}
        </Text>
        <Text style={[styles.taskTime, { color: isCur ? colors.textMuted : colors.textDim }]}>
          {task.slot.start_time} – {task.slot.end_time}
          {left ? `  · ${left}` : ''}
        </Text>
      </View>
      {isCur && !isDone ? (
        <TouchableOpacity onPress={onFocus} style={[styles.focusBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.focusBadgeTxt}>FOCUS</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onNotesTap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={task.slot.notes ? 'document-text' : 'document-text-outline'}
            size={14} color={task.slot.notes ? colors.accent : colors.textDim}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};
 
// ── Notes modal ────────────────────────────────────────────────────────────
const NotesModal = ({ visible, task, onClose, onSave, colors }: {
  visible: boolean; task: TaskWithSlot | null; onClose: () => void;
  onSave: (slotId: string, notes: string) => void; colors: any;
}) => {
  const [notes, setNotes] = useState('');
  useEffect(() => { if (task) setNotes(task.slot.notes || ''); }, [task]);
  if (!task) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable onPress={e => e.stopPropagation()}
            style={[styles.notesCard, { backgroundColor: colors.bgSurface || colors.bgBase }]}>
            <View style={styles.notesHdr}>
              <Text style={[styles.notesTitle, { color: colors.textPrimary }]}>{task.slot.label}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.notesInput, { color: colors.textPrimary, borderColor: colors.accent, backgroundColor: colors.bgBase }]}
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
 
// ── Day complete screen ────────────────────────────────────────────────────
const DayComplete = ({ colors }: { colors: any }) => (
  <View style={styles.dayCompleteWrap}>
    <View style={[styles.dayCompleteIcon, { backgroundColor: `${colors.done}18` }]}>
      <Ionicons name="checkmark-circle" size={72} color={colors.done} />
    </View>
    <Text style={[styles.dayCompleteTitle, { color: colors.textPrimary }]}>Day complete!</Text>
    <Text style={[styles.dayCompleteSub, { color: colors.textMuted }]}>
      You finished everything on your schedule.
    </Text>
  </View>
);
 
// ── Main ───────────────────────────────────────────────────────────────────
export function TimelinePanel({ insets }: { insets: any }) {
  const { isDark, colors } = useTheme();
  const router = useRouter();
 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskWithSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [notesTask, setNotesTask] = useState<TaskWithSlot | null>(null);
 
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
 
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
    } catch (e) { console.error('TimelinePanel fetch:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [dateStr, isToday]);
 
  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
 
  const handleToggle = useCallback(async (taskId: string, completed: boolean) => {
    try {
      await fetch(`${API_URL}/api/daily-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } : t));
    } catch (e) { console.error('Toggle:', e); }
  }, []);
 
  const handleSaveNotes = useCallback(async (slotId: string, notes: string) => {
    try {
      await fetch(`${API_URL}/api/schedule-slots/${slotId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      setTasks(prev => prev.map(t => t.slot.id === slotId ? { ...t, slot: { ...t.slot, notes } } : t));
    } catch (e) { console.error('Notes:', e); }
  }, []);
 
  const total = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const allDone = total > 0 && completedCount === total;
 
  return (
    <View style={[styles.screen, { backgroundColor: colors.bgBase }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
 
      {/* Sticky header — always visible */}
      <View style={[styles.stickyHdr, { paddingTop: insets.top + SPACING.sm, backgroundColor: colors.bgBase }]}>
        <Text style={[styles.hdrDay, { color: colors.textPrimary }]}>
          {format(currentDate, 'EEEE')}
        </Text>
        <Text style={[styles.hdrDate, { color: colors.textMuted }]}>
          {format(currentDate, 'MMMM d')} · Momentum Planner
        </Text>
        <WeekStrip currentDate={currentDate} onDayPress={setCurrentDate} colors={colors} />
        <View style={styles.pbarRow}>
          <View style={[styles.pbarTrack, { backgroundColor: colors.progressTrack }]}>
            <View style={[styles.pbarFill, { width: `${pct}%` as any, backgroundColor: colors.done }]} />
          </View>
          <Text style={[styles.pbarPct, { color: colors.done }]}>{pct}%</Text>
        </View>
      </View>
 
      {/* Task list */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : allDone ? (
        <DayComplete colors={colors} />
      ) : (
        <Animated.ScrollView
          contentContainerStyle={[styles.listContent]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={colors.accent}
            />
          }
        >
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              colors={colors}
              isDark={isDark}
              onToggle={() => handleToggle(task.id, !task.completed)}
              onFocus={() => router.push({
                pathname: '/focus',
                params: { label: task.slot.label, icon: task.slot.icon, start_time: task.slot.start_time, end_time: task.slot.end_time },
              })}
              onNotesTap={() => { setNotesTask(task); setNotesVisible(true); }}
            />
          ))}
        </Animated.ScrollView>
      )}
 
      <NotesModal
        visible={notesVisible} task={notesTask}
        onClose={() => { setNotesVisible(false); setNotesTask(null); }}
        onSave={handleSaveNotes} colors={colors}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 120, paddingTop: SPACING.sm },
 
  stickyHdr: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  hdrDay:  { fontSize: FONT.xl, fontWeight: '700', letterSpacing: -0.5 },
  hdrDate: { fontSize: FONT.xs, marginBottom: SPACING.sm },
 
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  dayCol:   { alignItems: 'center', gap: 3 },
  dayLbl:   { fontSize: 9, fontWeight: '600' },
  dayBubble:{ width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dayNum:   { fontSize: 11, fontWeight: '700' },
 
  pbarRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pbarTrack:{ flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  pbarFill: { height: '100%', borderRadius: 2 },
  pbarPct:  { fontSize: FONT.sm, fontWeight: '700', minWidth: 32, textAlign: 'right' },
 
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 9, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg, marginBottom: 6, overflow: 'hidden',
  },
  taskDone: { opacity: 0.4 },
  curBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
  },
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  taskIco:  { width: 20, height: 20, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  taskInfo: { flex: 1, minWidth: 0 },
  taskName: { fontSize: 12, fontWeight: '600' },
  taskStrike: { textDecorationLine: 'line-through' },
  taskTime: { fontSize: 10, marginTop: 1 },
  focusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  focusBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '700', letterSpacing: 0.06 },
 
  dayCompleteWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  dayCompleteIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  dayCompleteTitle: { fontSize: FONT.xxl, fontWeight: '700', letterSpacing: -0.5, marginBottom: SPACING.sm },
  dayCompleteSub: { fontSize: FONT.sm, textAlign: 'center', lineHeight: 22 },
 
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  notesCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.xl, padding: SPACING.md },
  notesHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  notesTitle: { fontSize: FONT.md, fontWeight: '700' },
  notesInput: { fontSize: FONT.sm, borderRadius: RADIUS.md, padding: SPACING.sm, minHeight: 100, borderWidth: 1.5, marginBottom: SPACING.md },
  notesBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: RADIUS.md },
});
 