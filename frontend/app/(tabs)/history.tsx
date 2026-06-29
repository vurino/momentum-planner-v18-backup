import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";

const BASE = "http://localhost:8001";

interface DayRecord {
  date: string;
  done: number;
  total: number;
  pct: number;
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const num = d.getDate();
  return isToday ? `Today · ${day} ${num}` : `${day} ${num}`;
}

function calcAvg(records: DayRecord[]) {
  if (!records.length) return 0;
  return Math.round(records.reduce((a, r) => a + r.pct, 0) / records.length);
}

function countPerfect(records: DayRecord[]) {
  return records.filter(r => r.pct >= 100).length;
}

function StatCard({ value, label, valueColor }: { value: string; label: string; valueColor: string }) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statVal, { color: valueColor }]}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [streak, setStreak]   = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [histRes, streakRes] = await Promise.all([
        fetch(`${BASE}/api/history?days=7`),
        fetch(`${BASE}/api/streak`),
      ]);
      const histData   = await histRes.json();
      const streakData = await streakRes.json();
      setRecords(Array.isArray(histData) ? histData : histData.history ?? []);
      setStreak(streakData.streak ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color="#d4562a" />
      </View>
    );
  }

  const avg     = calcAvg(records);
  const perfect = countPerfect(records);
  const hasData = records.some(r => r.total > 0);

  return (
    <View style={s.screen}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Past 7 days</Text>
          <Text style={s.title}>History</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <StatCard value={`${avg}%`}       label="Avg"     valueColor="#d4562a" />
          <StatCard value={String(perfect)} label="Perfect" valueColor="#2dd4a0" />
          <StatCard value={`${streak}d`}    label="Streak"  valueColor="#d4562a" />
        </View>

        {/* Divider */}
        <LinearGradient
          colors={["transparent", "#d4562a55", "#ff6b3544", "#d4562a55", "transparent"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 1, marginBottom: 8 }}
        />

        {/* Empty state */}
        {!hasData ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>◎</Text>
            <Text style={s.emptyTitle}>No history yet</Text>
            <Text style={s.emptyDesc}>
              Complete tasks each day to track your progress here. Your streaks and completion rates will appear as you build your routine.
            </Text>
          </View>
        ) : (
          <View style={s.dayList}>
            {records.map((rec, i) => (
              <View
                key={rec.date}
                style={[s.dayRow, i < records.length - 1 && s.dayBorder]}
              >
                <View style={s.dayTop}>
                  <Text style={s.dayName}>{formatDayLabel(rec.date)}</Text>
                  <View style={s.dayRight}>
                    <Text style={s.dayCount}>{rec.done} / {rec.total}</Text>
                    <Text style={[
                      s.dayPct,
                      rec.pct >= 100 && s.dayPctPerfect,
                    ]}>
                      {Math.round(rec.pct)}%
                    </Text>
                  </View>
                </View>
                <View style={s.barTrack}>
                  <LinearGradient
                    colors={rec.pct >= 100
                      ? ["#0e4a30", "#2dd4a0"]
                      : ["#7a2f15", "#ff6b35"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[s.barFill, { width: `${Math.min(rec.pct, 100)}%` as any }]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <LinearGradient
        colors={["transparent", "#090909"]}
        style={s.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: "#090909" },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },
  centered:      { flex: 1, backgroundColor: "#090909", alignItems: "center", justifyContent: "center" },

  header:        { paddingTop: 24, paddingBottom: 22 },
  eyebrow:       { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 4, color: "#d4562a", textTransform: "uppercase", marginBottom: 6 },
  title:         { fontFamily: "Montserrat_700Bold", fontSize: 28, color: "#ede9e1", lineHeight: 34 },

  statsRow:      { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard:      { flex: 1, backgroundColor: "#111116", borderWidth: 1, borderColor: "#1e1e28", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 8, alignItems: "center" },
  statVal:       { fontFamily: "Montserrat_700Bold", fontSize: 22 },
  statLbl:       { fontFamily: "Montserrat_600SemiBold", fontSize: 10, color: "#2e2c3a", letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },

  emptyState:    { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon:     { fontSize: 40, marginBottom: 16, color: "#2e2c3a" },
  emptyTitle:    { fontFamily: "Montserrat_700Bold", fontSize: 18, color: "#ede9e1", marginBottom: 10, textAlign: "center" },
  emptyDesc:     { fontFamily: "Montserrat_500Medium", fontSize: 13, color: "#5a576a", textAlign: "center", lineHeight: 21 },

  dayList:       { marginTop: 8 },
  dayRow:        { paddingVertical: 12 },
  dayBorder:     { borderBottomWidth: 1, borderBottomColor: "#1e1e28" },
  dayTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  dayName:       { fontFamily: "Montserrat_600SemiBold", fontSize: 13, color: "#ede9e1" },
  dayRight:      { flexDirection: "row", alignItems: "baseline", gap: 10 },
  dayCount:      { fontFamily: "Montserrat_500Medium", fontSize: 11, color: "#5a576a" },
  dayPct:        { fontFamily: "Montserrat_700Bold", fontSize: 13, color: "#d4562a" },
  dayPctPerfect: { color: "#2dd4a0" },

  barTrack:      { height: 3, backgroundColor: "#1e1e28", borderRadius: 99, overflow: "hidden" },
  barFill:       { height: "100%", borderRadius: 99 } as any,

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});