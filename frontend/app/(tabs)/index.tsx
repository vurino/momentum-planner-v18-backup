import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSimpleTheme, ThemeTokens } from "../../context/SimpleTheme";

const BASE = "";

interface Task {
  id: string;
  name: string;
  done: boolean;
  completed: boolean;
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

function calcRemaining(timeStr: string, duration: number) {
  if (!timeStr) return { remaining: 0, pct: 0 };
  const [h, m] = timeStr.split(":").map(Number);
  const start = h * 60 + m;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
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

function HeroCard({ task, T }: { task: Task; T: ThemeTokens }) {
  const timeStr = getTaskTime(task);
  const duration = getTaskDuration(task);
  const { remaining, pct } = calcRemaining(timeStr, duration);

  return (
    <View style={[
      styles.hero,
      { backgroundColor: T.surface, borderColor: T.border, borderLeftColor: T.orange, shadowColor: T.orange },
    ]}>
      <LinearGradient
        colors={[T.orange, "transparent"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.heroGlow}
      />
      <View style={styles.heroLabel}>
        <PulsingDot color={T.orange} />
        <Text style={[styles.heroLabelText, { color: T.orange }]}>Now active</Text>
      </View>
      <Text style={[styles.heroName, { color: T.t1 }]}>{task.name}</Text>
      <Text style={[styles.heroMeta, { color: T.t2 }]}>
        {timeStr} · {formatDur(duration)}
      </Text>
      <View style={[styles.progressTrack, { backgroundColor: T.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: T.orange }]} />
      </View>
      <Text style={[styles.heroRemain, { color: T.t2 }]}>
        {remaining > 0 ? `${remaining} min remaining` : "Time's up"}
      </Text>
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
        <Text style={styles.focusBtnText}>Focus</Text>
      </TouchableOpacity>
    </View>
  );
}

function TaskRow({
  task, isLast, onToggle, T,
}: {
  task: Task; isLast: boolean; onToggle: (id: string, currentDone: boolean) => void; T: ThemeTokens;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const whiteOpacity = useRef(new Animated.Value(task.done ? 1 : 0)).current;

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
      styles.taskRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: T.border },
      task.done && styles.taskDone,
    ]}>
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
    </View>
  );
}

export default function TodayScreen() {
  const { T } = useSimpleTheme();
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [streak, setStreak]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, streakRes] = await Promise.all([
        fetch(`${BASE}/api/daily-tasks/${todayStr()}`),
        fetch(`${BASE}/api/streak`),
      ]);
      const tasksData  = await tasksRes.json();
      const streakData = await streakRes.json();
      const raw = Array.isArray(tasksData) ? tasksData : tasksData.tasks ?? [];
      setTasks(raw.map((t: any) => ({ ...t, done: t.completed ?? false })));
      setStreak(streakData.streak ?? 0);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

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

  const sortedTasks = [...tasks].sort((a, b) =>
    (a.start_time ?? "").localeCompare(b.start_time ?? "")
  );

  const activeTask = sortedTasks.find(t => !t.done) ?? null;
  const listTasks  = sortedTasks.filter(t => t.id !== activeTask?.id);
  const doneCount  = tasks.filter(t => t.done).length;

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
          ? <HeroCard task={activeTask} T={T} />
          : (
            <View style={[styles.hero, styles.heroEmpty, { backgroundColor: T.surface, borderColor: T.border, borderLeftColor: T.orange }]}>
              <Text style={[styles.emptyIcon, { color: T.orange }]}>✓</Text>
              <Text style={[styles.emptyText, { color: T.t2 }]}>All done for today</Text>
            </View>
          )
        }

        <View style={[styles.footer, { borderBottomColor: T.border }]}>
          <Text style={[styles.footerLeft, { color: T.t2 }]}>{doneCount} of {tasks.length} done</Text>
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
            T={T}
          />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      <LinearGradient
        colors={["transparent", T.bg]}
        style={styles.fade}
        pointerEvents="none"
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
  heroLabel:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  heroLabelText: { fontFamily: "Montserrat_700Bold", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" },
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

  listLabel:     { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, marginTop: 20 },

  taskRow:       { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13 },
  taskDone:      { opacity: 0.4 },
  checkbox:      { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkmark:     { fontFamily: "Montserrat_700Bold", fontSize: 11 },
  taskName:      { fontFamily: "Montserrat_600SemiBold", fontSize: 14 },
  taskMeta:      { fontFamily: "Montserrat_500Medium", fontSize: 11, marginTop: 2 },

  footer:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 1 },
  footerLeft:    { fontFamily: "Montserrat_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  footerRight:   { fontFamily: "Montserrat_700Bold", fontSize: 12 },

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});