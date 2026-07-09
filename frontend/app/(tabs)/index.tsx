import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
  RefreshControl, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSimpleTheme, ThemeTokens } from "../../context/SimpleTheme";
import { scheduleTaskReminders } from "../../utils/notifications";
import ConfirmModal from "../../components/ConfirmModal";

const BASE = "";

interface Task {
  id: string;
  name: string;
  done: boolean;
  completed: boolean;
  skipped: boolean;
  notes?: string | null;
  slot_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function getTaskTime(task: Task): string {
  return task.start_time ?? "";
}

function getTaskDuration(task: Task): number {
  return task.duration ?? 30;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function toMinutes(t?: string): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function calcRemaining(timeStr: string, duration: number) {
  if (!timeStr) return { remaining: 0, pct: 0 };
  const [h, m] = timeStr.split(":").map(Number);
  const start = h * 60 + m;
  const cur = nowMinutes();
  const pct = Math.min(100, Math.max(0, ((cur - start) / duration) * 100));
  const remaining = Math.max(0, (start + duration) - cur);
  return { remaining, pct };
}

function formatDur(min: number) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${min} min`;
}

function PulsingDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity: anim }]} />;
}

function NoteEditor({
  task, T, onSaveNote,
}: {
  task: Task; T: ThemeTokens; onSaveNote: (id: string, notes: string) => void;
}) {
  const [text, setText] = useState(task.notes ?? "");
  return (
    <View style={styles.noteEditor}>
      <TextInput
        style={[styles.noteInput, { backgroundColor: T.bg, borderColor: T.border, color: T.t1 }]}
        value={text}
        onChangeText={setText}
        placeholder="Add a note for today..."
        placeholderTextColor={T.t2}
        multiline
      />
      <TouchableOpacity
        style={[styles.noteSaveBtn, { backgroundColor: T.orange }]}
        onPress={() => onSaveNote(task.id, text.trim())}
      >
        <Text style={styles.noteSaveBtnText}>Save note</Text>
      </TouchableOpacity>
    </View>
  );
}

function HeroCard({
  task, T, onSkip, onSaveNote, upcoming,
}: {
  task: Task; T: ThemeTokens;
  onSkip: (id: string, name: string) => void;
  onSaveNote: (id: string, notes: string) => void;
  upcoming: boolean;
}) {
  const timeStr = getTaskTime(task);
  const duration = getTaskDuration(task);
  const { remaining, pct } = calcRemaining(timeStr, duration);
  const [noteOpen, setNoteOpen] = useState(false);

  const accent = upcoming ? T.t2 : T.orange;
  const startMin = toMinutes(timeStr);
  const minsUntil = startMin !== null ? Math.max(0, startMin - nowMinutes()) : 0;

  return (
    <View style={[
      styles.hero,
      { backgroundColor: T.surface, borderColor: T.border, borderLeftColor: accent, shadowColor: accent },
    ]}>
      <LinearGradient
        colors={[accent, "transparent"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.heroGlow}
      />
      <View style={styles.heroTopRow}>
        <View style={styles.heroLabel}>
          <PulsingDot color={accent} />
          <Text style={[styles.heroLabelText, { color: accent }]}>{upcoming ? "Up next" : "Now active"}</Text>
        </View>
        <View style={styles.heroLinks}>
          <TouchableOpacity onPress={() => setNoteOpen(o => !o)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.heroLinkText, { color: T.t2 }]}>{task.notes ? "Note •" : "Note"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onSkip(task.id, task.name || "This task")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.heroLinkText, { color: T.t2 }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.heroName, { color: T.t1 }]}>{task.name}</Text>
      <Text style={[styles.heroMeta, { color: T.t2 }]}>
        {timeStr} · {formatDur(duration)}
      </Text>

      {upcoming ? (
        <Text style={[styles.heroRemain, { color: T.t2, marginTop: 2 }]}>
          Starts {minsUntil <= 60 ? `in ${minsUntil} min` : `at ${timeStr}`}
        </Text>
      ) : (
        <>
          <View style={[styles.progressTrack, { backgroundColor: T.border }]}>
            <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: T.orange }]} />
          </View>
          {remaining > 0 && (
            <Text style={[styles.heroRemain, { color: T.t2 }]}>{remaining} min remaining</Text>
          )}
        </>
      )}

      {noteOpen && (
        <NoteEditor task={task} T={T} onSaveNote={(id, notes) => { onSaveNote(id, notes); setNoteOpen(false); }} />
      )}

      <TouchableOpacity
        style={[styles.focusBtn, { backgroundColor: T.orange, shadowColor: T.orange }]}
        onPress={() => router.push({
          pathname: "/focus",
          params: {
            label: task.name,
            start_time: timeStr,
            end_time: task.end_time ?? "",
          },
        })}
      >
        <Text style={styles.focusBtnText}>{upcoming ? "Start early" : "Focus"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function TaskRow({
  task, isLast, onToggle, onSaveNote, T,
}: {
  task: Task; isLast: boolean;
  onToggle: (id: string, currentDone: boolean) => void;
  onSaveNote: (id: string, notes: string) => void;
  T: ThemeTokens;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const whiteOpacity = useRef(new Animated.Value(task.done ? 1 : 0)).current;
  const [noteOpen, setNoteOpen] = useState(false);

  const handlePress = () => {
    if (!task.done) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 120, useNativeDriver: true }),
      ]).start();
      Animated.timing(whiteOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(whiteOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
    onToggle(task.id, task.done);
  };

  const timeStr = getTaskTime(task);
  const duration = getTaskDuration(task);

  return (
    <View style={[
      !isLast && { borderBottomWidth: 1, borderBottomColor: T.border },
    ]}>
      <View style={[styles.taskRow, task.done && styles.taskDone]}>
        <TouchableOpacity
          onPress={handlePress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Animated.View style={[
            styles.checkbox,
            { borderColor: T.border },
            task.done && { borderColor: T.t2, backgroundColor: T.checkedOverlay },
            { transform: [{ scale }] },
          ]}>
            <Animated.Text style={[styles.checkmark, { color: T.t1, opacity: whiteOpacity }]}>
              ✓
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.taskName,
            { color: T.t1 },
            task.done && { color: T.t3, textDecorationLine: "line-through", textDecorationColor: T.t4 },
          ]}>
            {task.name}
          </Text>
          <Text style={[
            styles.taskMeta,
            { color: T.t2 },
            task.done && { color: T.t3 },
          ]}>
            {timeStr} · {formatDur(duration)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setNoteOpen(o => !o)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.taskLinkText, { color: T.t3 }]}>{task.notes ? "•" : "note"}</Text>
        </TouchableOpacity>
      </View>
      {noteOpen && (
        <View style={{ paddingBottom: 10 }}>
          <NoteEditor task={task} T={T} onSaveNote={(id, notes) => { onSaveNote(id, notes); setNoteOpen(false); }} />
        </View>
      )}
    </View>
  );
}

export default function TodayScreen() {
  const { T } = useSimpleTheme();
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [streak, setStreak]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, streakRes] = await Promise.all([
        fetch(`${BASE}/api/daily-tasks/${todayStr()}`),
        fetch(`${BASE}/api/streak`),
      ]);
      const tasksData  = await tasksRes.json();
      const streakData = await streakRes.json();
      const raw = Array.isArray(tasksData) ? tasksData : tasksData.tasks ?? [];
      const mapped = raw.map((t: any) => ({ ...t, done: t.completed ?? false, skipped: t.skipped ?? false }));
      setTasks(mapped);
      setStreak(streakData.streak ?? 0);

      const remindersPref = await AsyncStorage.getItem("taskReminders");
      const remindersOn = remindersPref !== null ? JSON.parse(remindersPref) : true;
      if (remindersOn) {
        scheduleTaskReminders(mapped.filter((t: Task) => !t.skipped)).catch(err => console.error(err));
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const patchTask = async (id: string, body: Record<string, unknown>) => {
    try {
      await fetch(`${BASE}/api/daily-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTask = async (id: string, currentDone: boolean) => {
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
    try {
      await fetch(`${BASE}/api/daily-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentDone }),
      });
    } catch (e) {
      setTasks(prev =>
        prev.map(t => t.id === id ? { ...t, done: currentDone } : t)
      );
    }
  };

  const skipTask = (id: string, name: string) => {
    setConfirmSkip({ id, name });
  };

  const confirmSkipNow = async () => {
    if (!confirmSkip) return;
    const { id } = confirmSkip;
    setConfirmSkip(null);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, skipped: true } : t));
    await patchTask(id, { skipped: true });
  };

  const saveNote = async (id: string, notes: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notes } : t));
    await patchTask(id, { notes });
  };

  const activeTasks = tasks.filter(t => !t.skipped);
  const skippedTasks = tasks.filter(t => t.skipped);

  const sortedTasks = [...activeTasks].sort((a, b) =>
    (a.start_time ?? "").localeCompare(b.start_time ?? "")
  );

  const activeTask = sortedTasks.find(t => !t.done) ?? null;
  const listTasks  = sortedTasks.filter(t => t.id !== activeTask?.id);
  const doneCount  = activeTasks.filter(t => t.done).length;

  const activeStartMin = activeTask ? toMinutes(activeTask.start_time) : null;
  const isUpcoming = activeTask !== null && activeStartMin !== null && activeStartMin > nowMinutes();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.orange} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: T.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={T.orange}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: T.orange }]}>{getGreeting()}</Text>
          <Text style={[styles.dateText, { color: T.t1 }]}>{formatDate()}</Text>
        </View>

        {activeTask
          ? <HeroCard task={activeTask} T={T} onSkip={skipTask} onSaveNote={saveNote} upcoming={isUpcoming} />
          : activeTasks.length === 0 ? (
            <View style={[styles.hero, styles.heroEmpty, { backgroundColor: T.surface, borderColor: T.border, borderLeftColor: T.t3 }]}>
              <Text style={[styles.emptyIcon, { color: T.t3 }]}>○</Text>
              <Text style={[styles.emptyText, { color: T.t2 }]}>Nothing scheduled today</Text>
            </View>
          ) : (
            <View style={[styles.hero, styles.heroEmpty, { backgroundColor: T.surface, borderColor: T.border, borderLeftColor: T.orange }]}>
              <Text style={[styles.emptyIcon, { color: T.orange }]}>✓</Text>
              <Text style={[styles.emptyText, { color: T.t2 }]}>All done for today</Text>
            </View>
          )
        }

        <View style={[styles.footer, { borderBottomColor: T.border }]}>
          <Text style={[styles.footerLeft, { color: T.t2 }]}>{doneCount} of {activeTasks.length} done</Text>
          <Text style={[styles.footerRight, { color: T.t1 }]}>{streak}d streak</Text>
        </View>

        {listTasks.length > 0 && (
          <Text style={[styles.listLabel, { color: T.t2 }]}>Today's tasks</Text>
        )}

        {listTasks.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            isLast={i === listTasks.length - 1}
            onToggle={toggleTask}
            onSaveNote={saveNote}
            T={T}
          />
        ))}

        {skippedTasks.length > 0 && (
          <>
            <Text style={[styles.listLabel, { color: T.t3, marginTop: 24 }]}>Skipped</Text>
            {skippedTasks.map(task => (
              <View key={task.id} style={styles.skippedRow}>
                <Text style={[styles.skippedText, { color: T.t3 }]}>{task.name}</Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <LinearGradient
        colors={["transparent", T.bg]}
        style={styles.fade}
        pointerEvents="none"
      />

      <ConfirmModal
        visible={!!confirmSkip}
        title="Skip today?"
        message={confirmSkip ? `"${confirmSkip.name}" won't count toward today's total or your streak.` : ""}
        confirmLabel="Skip"
        T={T}
        onCancel={() => setConfirmSkip(null)}
        onConfirm={confirmSkipNow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },
  centered:      { flex: 1, alignItems: "center", justifyContent: "center" },

  header:        { paddingTop: 24, paddingBottom: 22 },
  greeting:      { fontFamily: "Montserrat_600SemiBold", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 },
  dateText:      { fontFamily: "Montserrat_700Bold", fontSize: 18, letterSpacing: 0.3 },

  hero: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 16, padding: 20, marginBottom: 28,
    overflow: "hidden", position: "relative",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  heroEmpty:     { alignItems: "center", justifyContent: "center", minHeight: 100, gap: 8 },
  heroGlow:      { position: "absolute", top: 0, left: 0, right: 0, height: 1, opacity: 0.4 },
  heroTopRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  heroLabel:     { flexDirection: "row", alignItems: "center", gap: 8 },
  heroLabelText: { fontFamily: "Montserrat_700Bold", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" },
  heroLinks:     { flexDirection: "row", gap: 14 },
  heroLinkText:  { fontFamily: "Montserrat_600SemiBold", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  dot:           { width: 6, height: 6, borderRadius: 99 },
  heroName:      { fontFamily: "Montserrat_700Bold", fontSize: 22, lineHeight: 28, marginBottom: 6, letterSpacing: -0.3 },
  heroMeta:      { fontFamily: "Montserrat_500Medium", fontSize: 13, marginBottom: 18, letterSpacing: 0.3 },
  heroRemain:    { fontFamily: "Montserrat_500Medium", fontSize: 11, letterSpacing: 1, marginTop: 7 },

  progressTrack: { height: 2, borderRadius: 99, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 99 },

  focusBtn:      { borderRadius: 10, marginTop: 16, padding: 13, alignItems: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 6 },
  focusBtnText:  { fontFamily: "Montserrat_700Bold", fontSize: 12, color: "#fff", letterSpacing: 2, textTransform: "uppercase" },

  emptyIcon:     { fontFamily: "Montserrat_700Bold", fontSize: 28 },
  emptyText:     { fontFamily: "Montserrat_600SemiBold", fontSize: 15 },

  listLabel:     { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10, marginTop: 18 },

  taskRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  taskDone:      { opacity: 0.4 },
  checkbox:      { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkmark:     { fontFamily: "Montserrat_700Bold", fontSize: 9 },
  taskName:      { fontFamily: "Montserrat_600SemiBold", fontSize: 13 },
  taskMeta:      { fontFamily: "Montserrat_500Medium", fontSize: 10, marginTop: 2 },
  taskLinkText:  { fontFamily: "Montserrat_600SemiBold", fontSize: 10, textTransform: "uppercase" },

  noteEditor:    { marginTop: 4, marginBottom: 4, gap: 8 },
  noteInput:     { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: "Montserrat_500Medium", fontSize: 12, minHeight: 44, textAlignVertical: "top" },
  noteSaveBtn:   { alignSelf: "flex-start", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  noteSaveBtnText: { fontFamily: "Montserrat_700Bold", fontSize: 10, color: "#fff", textTransform: "uppercase", letterSpacing: 1 },

  skippedRow:    { paddingVertical: 6 },
  skippedText:   { fontFamily: "Montserrat_500Medium", fontSize: 12, textDecorationLine: "line-through" },

  footer:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 1 },
  footerLeft:    { fontFamily: "Montserrat_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  footerRight:   { fontFamily: "Montserrat_700Bold", fontSize: 12 },

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});