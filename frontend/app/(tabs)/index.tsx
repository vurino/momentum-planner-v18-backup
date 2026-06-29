import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";

const BASE = "http://localhost:8001";

interface Task {
  _id: string;
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

function PulsingDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.dot, { opacity: anim }]} />;
}

function HeroCard({ task }: { task: Task }) {
  const timeStr = getTaskTime(task);
  const duration = getTaskDuration(task);
  const { remaining, pct } = calcRemaining(timeStr, duration);

  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={["#d4562a", "transparent"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.heroGlow}
      />
      <View style={styles.heroLabel}>
        <PulsingDot />
        <Text style={styles.heroLabelText}>Now active</Text>
      </View>
      <Text style={styles.heroName}>{task.name}</Text>
      <Text style={styles.heroMeta}>
        {timeStr} · {formatDur(duration)}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={styles.heroRemain}>
        {remaining > 0 ? `${remaining} min remaining` : "Time's up"}
      </Text>
      <TouchableOpacity
        style={styles.focusBtn}
        onPress={() => router.push("/focus")}
      >
        <Text style={styles.focusBtnText}>Focus</Text>
      </TouchableOpacity>
    </View>
  );
}

function TaskRow({
  task, isLast, onToggle,
}: {
  task: Task; isLast: boolean; onToggle: (id: string, currentDone: boolean) => void;
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
    onToggle(task._id, task.done);
  };

  const timeStr = getTaskTime(task);
  const duration = getTaskDuration(task);

  return (
    <View style={[
      styles.taskRow,
      !isLast && styles.taskBorder,
      task.done && styles.taskDone,
    ]}>
      <TouchableOpacity
        onPress={handlePress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Animated.View style={[
          styles.checkbox,
          task.done && styles.checkboxDone,
          { transform: [{ scale }] },
        ]}>
          <Animated.Text style={[styles.checkmark, { opacity: whiteOpacity }]}>
            ✓
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskName, task.done && styles.taskNameDone]}>
          {task.name}
        </Text>
        <Text style={[styles.taskMeta, task.done && styles.taskMetaDone]}>
          {timeStr} · {formatDur(duration)}
        </Text>
      </View>
    </View>
  );
}

export default function TodayScreen() {
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
      prev.map(t => t._id === id ? { ...t, done: !t.done } : t)
    );
    try {
      await fetch(`${BASE}/api/daily-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentDone }),
      });
    } catch (e) {
      setTasks(prev =>
        prev.map(t => t._id === id ? { ...t, done: currentDone } : t)
      );
    }
  };

  const sortedTasks = [...tasks].sort((a, b) =>
    (a.start_time ?? "").localeCompare(b.start_time ?? "")
  );

  const activeTask = sortedTasks.find(t => !t.done) ?? null;
  const listTasks  = sortedTasks.filter(t => t._id !== activeTask?._id);
  const doneCount  = tasks.filter(t => t.done).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#d4562a" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor="#d4562a"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{formatDate()}</Text>
        </View>

        {activeTask
          ? <HeroCard task={activeTask} />
          : (
            <View style={[styles.hero, styles.heroEmpty]}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyText}>All done for today</Text>
            </View>
          )
        }

        {listTasks.length > 0 && (
          <Text style={styles.listLabel}>Up next</Text>
        )}

        {listTasks.map((task, i) => (
          <TaskRow
            key={task._id}
            task={task}
            isLast={i === listTasks.length - 1}
            onToggle={toggleTask}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerLeft}>{doneCount} of {tasks.length} done</Text>
          <Text style={styles.footerRight}>{streak}d streak</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <LinearGradient
        colors={["transparent", "#090909"]}
        style={styles.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: "#090909" },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },
  centered:      { flex: 1, backgroundColor: "#090909", alignItems: "center", justifyContent: "center" },

  header:        { paddingTop: 24, paddingBottom: 22 },
  greeting:      { fontFamily: "Montserrat_600SemiBold", fontSize: 11, letterSpacing: 3, color: "#d4562a", textTransform: "uppercase", marginBottom: 6 },
  dateText:      { fontFamily: "Montserrat_700Bold", fontSize: 18, color: "#ede9e1", letterSpacing: 0.3 },

  hero: {
    backgroundColor: "#111116",
    borderWidth: 1, borderColor: "#1e1e28",
    borderLeftWidth: 3, borderLeftColor: "#d4562a",
    borderRadius: 16, padding: 20, marginBottom: 28,
    overflow: "hidden", position: "relative",
    shadowColor: "#d4562a", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  heroEmpty:     { alignItems: "center", justifyContent: "center", minHeight: 100, gap: 8 },
  heroGlow:      { position: "absolute", top: 0, left: 0, right: 0, height: 1, opacity: 0.4 },
  heroLabel:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  heroLabelText: { fontFamily: "Montserrat_700Bold", fontSize: 10, letterSpacing: 3, color: "#d4562a", textTransform: "uppercase" },
  dot:           { width: 6, height: 6, borderRadius: 99, backgroundColor: "#d4562a" },
  heroName:      { fontFamily: "Montserrat_700Bold", fontSize: 22, color: "#ede9e1", lineHeight: 28, marginBottom: 6, letterSpacing: -0.3 },
  heroMeta:      { fontFamily: "Montserrat_500Medium", fontSize: 13, color: "#5a576a", marginBottom: 18, letterSpacing: 0.3 },
  heroRemain:    { fontFamily: "Montserrat_500Medium", fontSize: 11, color: "#5a576a", letterSpacing: 1, marginTop: 7 },

  progressTrack: { height: 2, backgroundColor: "#1e1e28", borderRadius: 99, overflow: "hidden" },
  progressFill:  { height: "100%", backgroundColor: "#d4562a", borderRadius: 99 },

  focusBtn:      { backgroundColor: "#d4562a", borderRadius: 10, marginTop: 16, padding: 13, alignItems: "center", shadowColor: "#d4562a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 6 },
  focusBtnText:  { fontFamily: "Montserrat_700Bold", fontSize: 12, color: "#fff", letterSpacing: 2, textTransform: "uppercase" },

  emptyIcon:     { fontFamily: "Montserrat_700Bold", fontSize: 28, color: "#d4562a" },
  emptyText:     { fontFamily: "Montserrat_600SemiBold", fontSize: 15, color: "#5a576a" },

  listLabel:     { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 3, color: "#5a576a", textTransform: "uppercase", marginBottom: 12 },

  taskRow:       { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13 },
  taskBorder:    { borderBottomWidth: 1, borderBottomColor: "#1e1e28" },
  taskDone:      { opacity: 0.4 },
  checkbox:      { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "#1e1e28", alignItems: "center", justifyContent: "center" },
  checkboxDone:  { borderColor: "#5a576a", backgroundColor: "rgba(255,255,255,0.06)" },
  checkmark:     { fontFamily: "Montserrat_700Bold", fontSize: 11, color: "#ffffff" },
  taskName:      { fontFamily: "Montserrat_600SemiBold", fontSize: 14, color: "#ede9e1" },
  taskNameDone:  { color: "#2e2c3a", textDecorationLine: "line-through", textDecorationColor: "#1a1825" },
  taskMeta:      { fontFamily: "Montserrat_500Medium", fontSize: 11, color: "#5a576a", marginTop: 2 },
  taskMetaDone:  { color: "#2e2c3a" },

  footer:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 8 },
  footerLeft:    { fontFamily: "Montserrat_600SemiBold", fontSize: 12, color: "#5a576a", letterSpacing: 1, textTransform: "uppercase" },
  footerRight:   { fontFamily: "Montserrat_700Bold", fontSize: 12, color: "#ede9e1" },

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});