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
  total: number;
  completed: number;
  percentage: number;
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

function calcAvg(records: DayRecord[]) {
  if (!records.length) return 0;
  return Math.round(records.reduce((a, r) => a + r.pct, 0) / records.length);
}

function countPerfect(records: DayRecord[]) {
  return records.filter(r => r.pct >= 100).length;
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
  const [streak, setStreak]   = useState(0);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [monthProgress, setMonthProgress] = useState<Record<string, DayProgress>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DayProgress | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/monthly-progress/${calYear}/${calMonth}`);
        const data = await res.json();
        const map: Record<string, DayProgress> = {};
        (Array.isArray(data) ? data : []).forEach((d: any) => { map[d.date] = d; });
        setMonthProgress(map);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const selectDate = async (day: number) => {
    const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${BASE}/api/daily-progress/${dateStr}`);
      const data = await res.json();
      setSelectedDetail(data);
    } catch (e) {
      console.error(e);
      setSelectedDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.orange} />
      </View>
    );
  }

  const avg     = calcAvg(records);
  const perfect = countPerfect(records);
  const hasData = records.some(r => r.total > 0);

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.eyebrow, { color: T.orange }]}>Past 7 days</Text>
          <Text style={[s.title, { color: T.t1 }]}>History</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <StatCard value={`${avg}%`}       label="Avg"     valueColor={T.orange} T={T} />
          <StatCard value={String(perfect)} label="Perfect" valueColor={T.green}  T={T} />
          <StatCard value={`${streak}d`}    label="Streak"  valueColor={T.orange} T={T} />
        </View>

        {/* Divider */}
        <LinearGradient
          colors={["transparent", `${T.orange}55`, `${T.orangeHi}44`, `${T.orange}55`, "transparent"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 1, marginBottom: 8 }}
        />

        {/* Empty state */}
        {!hasData ? (
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
          <Text style={[s.eyebrow, { color: T.orange }]}>Pick a date</Text>

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
                const prog = monthProgress[dateStr];
                const pct = prog?.percentage ?? 0;
                const hasProgress = (prog?.total ?? 0) > 0;
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr();

                return (
                  <View key={di} style={s.calCell}>
                    <TouchableOpacity
                      style={[
                        s.calDayBtn,
                        { backgroundColor: hasProgress ? (pct >= 100 ? `${T.green}30` : `${T.orange}22`) : "transparent" },
                        isSelected && { borderWidth: 1.5, borderColor: T.orange },
                        isToday && !isSelected && { borderWidth: 1, borderColor: T.t3 },
                      ]}
                      onPress={() => selectDate(day)}
                    >
                      <Text style={[s.calDayText, { color: hasProgress ? T.t1 : T.t3 }]}>{day}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}

          {selectedDate && (
            <View style={[s.calDetail, { backgroundColor: T.surface, borderColor: T.border }]}>
              {loadingDetail ? (
                <ActivityIndicator color={T.orange} />
              ) : selectedDetail ? (
                <>
                  <Text style={[s.calDetailDate, { color: T.t1 }]}>
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric",
                    })}
                  </Text>
                  <View style={s.calDetailRow}>
                    <Text style={[s.calDetailCount, { color: T.t2 }]}>
                      {selectedDetail.completed} / {selectedDetail.total} done
                    </Text>
                    <Text style={[
                      s.calDetailPct,
                      { color: selectedDetail.percentage >= 100 ? T.green : T.orange },
                    ]}>
                      {selectedDetail.percentage}%
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[s.calDetailCount, { color: T.t2 }]}>No data for this date</Text>
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

  emptyState:    { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon:     { fontSize: 40, marginBottom: 16 },
  emptyTitle:    { fontFamily: "Montserrat_700Bold", fontSize: 18, marginBottom: 10, textAlign: "center" },
  emptyDesc:     { fontFamily: "Montserrat_500Medium", fontSize: 13, textAlign: "center", lineHeight: 21 },

  dayList:       { marginTop: 8 },
  dayRow:        { paddingVertical: 12 },
  dayTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  dayName:       { fontFamily: "Montserrat_600SemiBold", fontSize: 13 },
  dayRight:      { flexDirection: "row", alignItems: "baseline", gap: 10 },
  dayCount:      { fontFamily: "Montserrat_500Medium", fontSize: 11 },
  dayPct:        { fontFamily: "Montserrat_700Bold", fontSize: 13 },

  barTrack:      { height: 3, borderRadius: 99, overflow: "hidden" },
  barFill:       { height: "100%", borderRadius: 99 } as any,

  calSection:      { marginTop: 28 },
  calHeader:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 14 },
  calMonthLabel:   { fontFamily: "Montserrat_700Bold", fontSize: 15 },
  calNavBtn:       { paddingHorizontal: 14, paddingVertical: 4 },
  calNavText:      { fontFamily: "Montserrat_700Bold", fontSize: 20 },
  calWeekRow:      { flexDirection: "row" },
  calWeekLabel:    { flex: 1, textAlign: "center", fontFamily: "Montserrat_600SemiBold", fontSize: 10, textTransform: "uppercase", marginBottom: 6 },
  calCell:         { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  calDayBtn:       { width: "78%", height: "78%", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  calDayText:      { fontFamily: "Montserrat_600SemiBold", fontSize: 12 },

  calDetail:       { marginTop: 16, borderWidth: 1, borderRadius: 14, padding: 16 },
  calDetailDate:   { fontFamily: "Montserrat_700Bold", fontSize: 14, marginBottom: 8 },
  calDetailRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  calDetailCount:  { fontFamily: "Montserrat_500Medium", fontSize: 12 },
  calDetailPct:    { fontFamily: "Montserrat_700Bold", fontSize: 16 },

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});