import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useSimpleTheme, ThemeTokens } from "../../context/SimpleTheme";

const BASE = "";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DayRecord {
  date: string;
  done: number;
  total: number;
  pct: number;
}

interface DayProgress {
  date: string;
  day: number;
  total: number;
  completed: number;
  percentage: number;
}

interface DayTask {
  id: string;
  name: string;
  completed: boolean;
  skipped: boolean;
  start_time?: string;
  duration?: number;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
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

function getMonthMatrix(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1);
  const numDays = new Date(year, month, 0).getDate();
  const firstWeekday = (firstDay.getDay() + 6) % 7; // Monday-start
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function longestPerfectStreak(days: DayProgress[]): number {
  let best = 0, cur = 0;
  for (const d of days) {
    if (d.total > 0 && d.percentage >= 100) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

function StatCard({ value, label, valueColor, T }: { value: string; label: string; valueColor: string; T: ThemeTokens }) {
  return (
    <View style={[s.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Text style={[s.statVal, { color: valueColor }]}>{value}</Text>
      <Text style={[s.statLbl, { color: T.t3 }]}>{label}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { T } = useSimpleTheme();
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [monthProgress, setMonthProgress] = useState<DayProgress[]>([]);
  const [monthMap, setMonthMap] = useState<Record<string, DayProgress>>({});

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTasks, setDayTasks] = useState<DayTask[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const histRes = await fetch(`${BASE}/api/history?days=7`);
      const histData = await histRes.json();
      setRecords(Array.isArray(histData) ? histData : histData.history ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthProgress = useCallback(async (year: number, month: number) => {
    try {
      const res = await fetch(`${BASE}/api/monthly-progress/${year}/${month}`);
      const data = await res.json();
      const list: DayProgress[] = Array.isArray(data) ? data : [];
      setMonthProgress(list);
      const map: Record<string, DayProgress> = {};
      list.forEach(d => { map[d.date] = d; });
      setMonthMap(map);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchData();
    fetchMonthProgress(calYear, calMonth);
    return () => {
      setSelectedDate(null);
      setDayTasks([]);
    };
  }, [fetchData]));

  useEffect(() => {
    fetchMonthProgress(calYear, calMonth);
  }, [calYear, calMonth, fetchMonthProgress]);

  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const jumpToday = () => {
    const t = new Date();
    setCalYear(t.getFullYear());
    setCalMonth(t.getMonth() + 1);
  };

  const closeDetail = () => {
    setSelectedDate(null);
    setDayTasks([]);
  };

  const selectDate = async (day: number) => {
    const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (selectedDate === dateStr) {
      closeDetail();
      return;
    }
    setSelectedDate(dateStr);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${BASE}/api/daily-tasks/${dateStr}`);
      const data = await res.json();
      setDayTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setDayTasks([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleDayTask = async (id: string, current: boolean) => {
    setDayTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !current } : t));
    try {
      await fetch(`${BASE}/api/daily-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !current }),
      });
      fetchMonthProgress(calYear, calMonth);
      fetchData();
    } catch (e) {
      console.error(e);
      setDayTasks(prev => prev.map(t => t.id === id ? { ...t, completed: current } : t));
    }
  };

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.orange} />
      </View>
    );
  }

  const daysWithData = monthProgress.filter(d => d.total > 0);
  const monthAvg = daysWithData.length
    ? Math.round(daysWithData.reduce((a, d) => a + d.percentage, 0) / daysWithData.length)
    : 0;
  const monthPerfect = daysWithData.filter(d => d.percentage >= 100).length;
  const monthStreak = longestPerfectStreak(monthProgress);

  const hasRecentData = records.some(r => r.total > 0);
  const activeDayTasks = dayTasks.filter(t => !t.skipped);
  const skippedDayTasks = dayTasks.filter(t => t.skipped);
  const dayDone = activeDayTasks.filter(t => t.completed).length;

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.eyebrow, { color: T.orange }]}>{MONTH_NAMES[calMonth - 1]} {calYear}</Text>
          <Text style={[s.title, { color: T.t1 }]}>History</Text>
        </View>

        {/* Month stats */}
        <View style={s.statsRow}>
          <StatCard value={`${monthAvg}%`}       label="Avg"     valueColor={T.orange} T={T} />
          <StatCard value={String(monthPerfect)} label="Perfect" valueColor={T.green}  T={T} />
          <StatCard value={`${monthStreak}d`}    label="Best streak" valueColor={T.orange} T={T} />
        </View>

        {/* Divider */}
        <LinearGradient
          colors={["transparent", `${T.orange}55`, `${T.orangeHi}44`, `${T.orange}55`, "transparent"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 1, marginBottom: 8 }}
        />

        {/* Recent 7 days */}
        <Text style={[s.sectionLabel, { color: T.t2 }]}>Recent</Text>
        {!hasRecentData ? (
          <View style={s.emptyState}>
            <Text style={[s.emptyIcon, { color: T.t3 }]}>◎</Text>
            <Text style={[s.emptyTitle, { color: T.t1 }]}>No history yet</Text>
            <Text style={[s.emptyDesc, { color: T.t2 }]}>
              Complete tasks each day to track your progress here. Your streaks and completion rates will appear as you build your routine.
            </Text>
          </View>
        ) : (
          <View style={s.dayList}>
            {records.map((rec, i) => (
              <View
                key={rec.date}
                style={[s.dayRow, i < records.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border }]}
              >
                <View style={s.dayTop}>
                  <Text style={[s.dayName, { color: T.t1 }]}>{formatDayLabel(rec.date)}</Text>
                  <View style={s.dayRight}>
                    <Text style={[s.dayCount, { color: T.t2 }]}>{rec.done} / {rec.total}</Text>
                    <Text style={[
                      s.dayPct,
                      { color: rec.pct >= 100 ? T.green : T.orange },
                    ]}>
                      {Math.round(rec.pct)}%
                    </Text>
                  </View>
                </View>
                <View style={[s.barTrack, { backgroundColor: T.border }]}>
                  <LinearGradient
                    colors={rec.pct >= 100
                      ? ["#0e4a30", T.green]
                      : ["#7a2f15", T.orangeHi]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[s.barFill, { width: `${Math.min(rec.pct, 100)}%` as any }]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Calendar picker */}
        <View style={s.calSection}>
          <View style={s.calSectionHeader}>
            <Text style={[s.eyebrow, { color: T.orange, marginBottom: 0 }]}>Pick a date</Text>
            <TouchableOpacity
              style={[s.todayBtn, { borderColor: T.border }]}
              onPress={jumpToday}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[s.todayLink, { color: T.t1 }]}>Today</Text>
            </TouchableOpacity>
          </View>

          <View style={s.calHeader}>
            <TouchableOpacity onPress={prevMonth} style={s.calNavBtn}>
              <Text style={[s.calNavText, { color: T.t2 }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.calMonthLabel, { color: T.t1 }]}>
              {MONTH_NAMES[calMonth - 1]} {calYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={s.calNavBtn}>
              <Text style={[s.calNavText, { color: T.t2 }]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.calWeekRow}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <Text key={i} style={[s.calWeekLabel, { color: T.t3 }]}>{d}</Text>
            ))}
          </View>

          {getMonthMatrix(calYear, calMonth).map((week, wi) => (
            <View key={wi} style={s.calWeekRow}>
              {week.map((day, di) => {
                if (day === null) return <View key={di} style={s.calCell} />;
                const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr();
                const prog = monthMap[dateStr];
                const hasProg = !!prog && prog.total > 0;
                const barColor = hasProg ? (prog.percentage >= 100 ? T.green : T.orange) : "transparent";

                return (
                  <View key={di} style={s.calCell}>
                    <TouchableOpacity
                      style={[
                        s.calDayBtn,
                        isSelected && { backgroundColor: `${T.orange}22`, borderWidth: 1.5, borderColor: T.orange },
                        isToday && !isSelected && { borderWidth: 1, borderColor: T.t3 },
                      ]}
                      onPress={() => selectDate(day)}
                    >
                      <Text style={[s.calDayText, { color: T.t1 }]}>{day}</Text>
                      <View style={[s.calDayBar, { backgroundColor: barColor, opacity: 0.3 }]} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}

          {selectedDate && (
            <View style={[s.calDetail, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Text style={[s.calDetailDate, { color: T.t1 }]}>
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </Text>

              {loadingDetail ? (
                <ActivityIndicator color={T.orange} />
              ) : activeDayTasks.length === 0 && skippedDayTasks.length === 0 ? (
                <Text style={[s.calDetailCount, { color: T.t2 }]}>No tasks for this date</Text>
              ) : (
                <>
                  <Text style={[s.calDetailCount, { color: T.t2, marginBottom: 10 }]}>
                    {dayDone} / {activeDayTasks.length} done
                  </Text>
                  {activeDayTasks.map((task, i) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        s.dayTaskRow,
                        i < activeDayTasks.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border },
                      ]}
                      onPress={() => toggleDayTask(task.id, task.completed)}
                    >
                      <View style={[
                        s.dayCheckbox,
                        { borderColor: T.border },
                        task.completed && { borderColor: T.t2, backgroundColor: T.checkedOverlay },
                      ]}>
                        {task.completed && <Text style={[s.dayCheckmark, { color: T.t1 }]}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          s.dayTaskName,
                          { color: T.t1 },
                          task.completed && { color: T.t3, textDecorationLine: "line-through" },
                        ]}>
                          {task.name}
                        </Text>
                        {!!task.start_time && (
                          <Text style={[s.dayTaskMeta, { color: T.t2 }, task.completed && { color: T.t3 }]}>
                            {task.start_time}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {skippedDayTasks.length > 0 && (
                    <Text style={[s.skippedNote, { color: T.t3 }]}>
                      Skipped: {skippedDayTasks.map(t => t.name).join(", ")}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <LinearGradient
        colors={["transparent", T.bg]}
        style={s.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },
  centered:      { flex: 1, alignItems: "center", justifyContent: "center" },

  header:        { paddingTop: 24, paddingBottom: 22 },
  eyebrow:       { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 },
  title:         { fontFamily: "Montserrat_700Bold", fontSize: 28, lineHeight: 34 },

  statsRow:      { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard:      { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 8, alignItems: "center" },
  statVal:       { fontFamily: "Montserrat_700Bold", fontSize: 22 },
  statLbl:       { fontFamily: "Montserrat_600SemiBold", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },

  sectionLabel:  { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, marginTop: 4 },

  emptyState:    { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon:     { fontSize: 40, marginBottom: 16 },
  emptyTitle:    { fontFamily: "Montserrat_700Bold", fontSize: 18, marginBottom: 10, textAlign: "center" },
  emptyDesc:     { fontFamily: "Montserrat_500Medium", fontSize: 13, textAlign: "center", lineHeight: 21 },

  dayList:       { marginTop: 0 },
  dayRow:        { paddingVertical: 12 },
  dayTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  dayName:       { fontFamily: "Montserrat_600SemiBold", fontSize: 13 },
  dayRight:      { flexDirection: "row", alignItems: "baseline", gap: 10 },
  dayCount:      { fontFamily: "Montserrat_500Medium", fontSize: 11 },
  dayPct:        { fontFamily: "Montserrat_700Bold", fontSize: 13 },

  barTrack:      { height: 3, borderRadius: 99, overflow: "hidden" },
  barFill:       { height: "100%", borderRadius: 99 } as any,

  calSection:       { marginTop: 28 },
  calSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  todayBtn:         { borderWidth: 1, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14 },
  todayLink:        { fontFamily: "Montserrat_700Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  calHeader:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 14 },
  calMonthLabel:   { fontFamily: "Montserrat_700Bold", fontSize: 15 },
  calNavBtn:       { paddingHorizontal: 14, paddingVertical: 4 },
  calNavText:      { fontFamily: "Montserrat_700Bold", fontSize: 20 },
  calWeekRow:      { flexDirection: "row" },
  calWeekLabel:    { flex: 1, textAlign: "center", fontFamily: "Montserrat_600SemiBold", fontSize: 10, textTransform: "uppercase", marginBottom: 6 },
  calCell:         { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  calDayBtn:       { width: "78%", height: "78%", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  calDayText:      { fontFamily: "Montserrat_600SemiBold", fontSize: 12 },
  calDayBar:       { position: "absolute", bottom: 4, width: "50%", height: 2, borderRadius: 2 },

  calDetail:       { marginTop: 16, borderWidth: 1, borderRadius: 14, padding: 16 },
  calDetailDate:   { fontFamily: "Montserrat_700Bold", fontSize: 14, marginBottom: 8 },
  calDetailCount:  { fontFamily: "Montserrat_500Medium", fontSize: 12 },

  dayTaskRow:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  dayCheckbox:     { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  dayCheckmark:    { fontFamily: "Montserrat_700Bold", fontSize: 10 },
  dayTaskName:     { fontFamily: "Montserrat_600SemiBold", fontSize: 13 },
  dayTaskMeta:     { fontFamily: "Montserrat_500Medium", fontSize: 10, marginTop: 2 },
  skippedNote:     { fontFamily: "Montserrat_500Medium", fontSize: 11, marginTop: 10, fontStyle: "italic" },

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});