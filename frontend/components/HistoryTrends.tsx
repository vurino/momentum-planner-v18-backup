import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSimpleTheme, ThemeTokens } from "../context/SimpleTheme";

const BASE = "";
const RANGES: { key: number; label: string }[] = [
  { key: 7, label: "7 Days" },
  { key: 30, label: "30 Days" },
  { key: 90, label: "90 Days" },
];

interface Metrics {
  scheduled_count: number;
  completed_count: number;
  incomplete_count: number;
  skipped_count: number;
  missed_count: number;
  started_count: number;
  scheduled_minutes: number;
  followed_minutes: number;
  lost_minutes: number;
  completion_rate: number | null;
  start_rate: number | null;
  completion_after_start: number | null;
  avg_scheduled_duration: number | null;
  median_actual_duration: number | null;
  avg_start_delay: number | null;
}
interface Bucket { label: string; start_date: string; end_date: string; metrics: Metrics }
interface Adherence { buckets: Bucket[]; summary: Metrics; insight: { key: string; text: string }; evidence: string }
interface Activity extends Metrics { slot_id: string; name: string; classification: string }
interface Friction { activities: Activity[]; selected: Activity | null; general_issue: boolean; insight: string }
interface Period extends Metrics { key: string; label: string }
interface RecAction { type: string; slot_id: string | null; label: string }
interface Recommendation { type: string; text: string; evidence: string; action: RecAction | null }
interface Temporal { overall_periods: Period[]; activity_periods: Period[] | null; mode: string; recommendation: Recommendation }
interface TrendsPayload { range: number; aggregation: string; adherence: Adherence; friction: Friction; temporal: Temporal }

function localNowISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtMin(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(min)}m`;
}

const CLASS_LABEL: Record<string, string> = {
  initiation: "Rarely started",
  persistence: "Often left incomplete",
  skip: "Often skipped",
  missed: "Often unresolved",
  stable: "Stable",
  mixed: "Mixed",
};

const EVIDENCE_LABEL: Record<string, string> = {
  strong: "Strong",
  moderate: "Moderate",
  tentative: "Tentative",
  insufficient: "Not enough data",
};

function MetricChip({ label, value, T }: { label: string; value: string; T: ThemeTokens }) {
  return (
    <View style={[c.chip, { backgroundColor: T.bg, borderColor: T.border }]}>
      <Text style={[c.chipValue, { color: T.t1 }]}>{value}</Text>
      <Text style={[c.chipLabel, { color: T.t3 }]}>{label}</Text>
    </View>
  );
}

function AdherenceChart({ buckets, T }: { buckets: Bucket[]; T: ThemeTokens }) {
  const CHART_H = 90;
  const maxScheduled = Math.max(1, ...buckets.map(b => b.metrics.scheduled_minutes));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={c.chartRow}>
      {buckets.map((b, i) => {
        const trackH = b.metrics.scheduled_minutes > 0
          ? Math.max(6, Math.round((b.metrics.scheduled_minutes / maxScheduled) * CHART_H))
          : 0;
        const fillPct = b.metrics.scheduled_minutes > 0
          ? Math.min(100, Math.round((b.metrics.followed_minutes / b.metrics.scheduled_minutes) * 100))
          : 0;
        return (
          <View key={i} style={c.chartCol}>
            <View style={[c.chartTrackWrap, { height: CHART_H }]}>
              {trackH > 0 ? (
                <View style={[c.chartTrack, { height: trackH, backgroundColor: T.border }]}>
                  <View style={[c.chartFill, { height: `${fillPct}%` as any, backgroundColor: T.orange }]} />
                </View>
              ) : (
                <View style={[c.chartTrackEmpty, { backgroundColor: T.t4 }]} />
              )}
            </View>
            <Text style={[c.chartColLabel, { color: T.t3 }]} numberOfLines={1}>{b.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function ActivityRow({ activity, maxLost, onPress, T }: { activity: Activity; maxLost: number; onPress: () => void; T: ThemeTokens }) {
  const pct = maxLost > 0 ? Math.round((activity.lost_minutes / maxLost) * 100) : 0;
  return (
    <TouchableOpacity style={[c.actRow, { borderColor: T.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={c.actTop}>
        <Text style={[c.actName, { color: T.t1 }]} numberOfLines={1}>{activity.name}</Text>
        <Text style={[c.actClass, { color: T.orangeHi }]}>{CLASS_LABEL[activity.classification] ?? activity.classification}</Text>
      </View>
      <View style={[c.actBarTrack, { backgroundColor: T.border }]}>
        <View style={[c.actBarFill, { width: `${pct}%` as any, backgroundColor: T.danger }]} />
      </View>
      <Text style={[c.actMeta, { color: T.t3 }]}>
        {fmtMin(activity.lost_minutes)} lost · {activity.completion_rate ?? "—"}% completion · {activity.scheduled_count} occurrences
      </Text>
    </TouchableOpacity>
  );
}

function PeriodChart({ periods, T }: { periods: Period[]; T: ThemeTokens }) {
  const CHART_H = 80;
  return (
    <View style={c.periodRow}>
      {periods.map((p) => {
        const rate = p.completion_rate ?? 0;
        const h = p.scheduled_count > 0 ? Math.max(6, Math.round((rate / 100) * CHART_H)) : 0;
        return (
          <View key={p.key} style={c.periodCol}>
            <View style={[c.periodTrackWrap, { height: CHART_H }]}>
              {h > 0 ? (
                <View style={[c.periodBar, { height: h, backgroundColor: T.orange }]} />
              ) : (
                <View style={[c.chartTrackEmpty, { backgroundColor: T.t4 }]} />
              )}
            </View>
            <Text style={[c.periodPct, { color: T.t2 }]}>{p.scheduled_count > 0 ? `${p.completion_rate}%` : "—"}</Text>
            <Text style={[c.periodLabel, { color: T.t3 }]} numberOfLines={1}>{p.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function DurationCompare({ activity, T }: { activity: Activity; T: ThemeTokens }) {
  const scheduled = activity.avg_scheduled_duration ?? 0;
  const actual = activity.median_actual_duration ?? 0;
  const max = Math.max(1, scheduled, actual);
  return (
    <View style={c.durWrap}>
      {[{ label: "Scheduled", value: scheduled, color: T.border, text: T.t2 },
        { label: "Median actual", value: actual, color: T.orange, text: T.t1 }].map((row, i) => (
        <View key={i} style={c.durRow}>
          <Text style={[c.durLabel, { color: T.t3 }]}>{row.label}</Text>
          <View style={[c.durTrack, { backgroundColor: T.border }]}>
            <View style={[c.durFill, { width: `${Math.min(100, (row.value / max) * 100)}%` as any, backgroundColor: row.color }]} />
          </View>
          <Text style={[c.durValue, { color: row.text }]}>{fmtMin(row.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function EvidenceBadge({ level, T }: { level: string; T: ThemeTokens }) {
  const color = level === "strong" ? T.green : level === "moderate" ? T.orange : T.t3;
  return (
    <View style={[c.evidenceBadge, { borderColor: color }]}>
      <Text style={[c.evidenceText, { color }]}>{EVIDENCE_LABEL[level] ?? level}</Text>
    </View>
  );
}

export default function HistoryTrends() {
  const { T } = useSimpleTheme();
  const router = useRouter();
  const [range, setRange] = useState(30);
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async (r: number) => {
    setLoading(true);
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const res = await fetch(
        `${BASE}/api/analytics/trends?range=${r}&client_now=${encodeURIComponent(localNowISO())}&tz_offset_minutes=${tzOffset}`
      );
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrends(range); }, [range, fetchTrends]);

  const openActivity = (slotId: string | null) => {
    if (!slotId) {
      router.push({ pathname: "/routine" });
      return;
    }
    router.push({ pathname: "/routine", params: { editSlotId: slotId } });
  };

  if (loading && !data) {
    return (
      <View style={c.centered}>
        <ActivityIndicator color={T.orange} />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={c.centered}>
        <Text style={{ color: T.t2, fontFamily: "Montserrat_500Medium" }}>Couldn't load trends.</Text>
      </View>
    );
  }

  const { adherence, friction, temporal } = data;
  const maxLost = Math.max(1, ...friction.activities.map(a => a.lost_minutes));
  const showDurationCompare = friction.selected && ["shorten", "split"].includes(temporal.recommendation.type);
  const periodsToShow = temporal.mode === "activity_specific" && temporal.activity_periods
    ? temporal.activity_periods
    : temporal.overall_periods;

  return (
    <View>
      {/* Range selector */}
      <View style={c.rangeRow}>
        {RANGES.map(r => {
          const active = range === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[c.rangeBtn, { borderColor: T.border }, active && { backgroundColor: T.orange, borderColor: T.orange }]}
              onPress={() => setRange(r.key)}
            >
              <Text style={[c.rangeBtnText, { color: active ? "#fff" : T.t2 }]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && (
        <View style={{ paddingVertical: 8 }}>
          <ActivityIndicator color={T.orange} />
        </View>
      )}

      {/* 1. Follow-Through */}
      <View style={[c.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[c.cardTitle, { color: T.t1 }]}>Follow-Through</Text>
        <Text style={[c.cardSub, { color: T.t3 }]}>Scheduled time vs. followed-through time</Text>

        {adherence.insight.key === "insufficient" ? (
          <Text style={[c.notEnough, { color: T.t3 }]}>Not enough data yet.</Text>
        ) : (
          <>
            <AdherenceChart buckets={adherence.buckets} T={T} />
            <View style={c.chipRow}>
              <MetricChip label="Completion" value={adherence.summary.completion_rate != null ? `${adherence.summary.completion_rate}%` : "—"} T={T} />
              <MetricChip label="Start rate" value={adherence.summary.start_rate != null ? `${adherence.summary.start_rate}%` : "—"} T={T} />
              <MetricChip label="Finish after start" value={adherence.summary.completion_after_start != null ? `${adherence.summary.completion_after_start}%` : "—"} T={T} />
            </View>
            <View style={[c.insightBanner, { backgroundColor: T.bg, borderColor: T.border }]}>
              <Text style={[c.insightText, { color: T.t1 }]}>{adherence.insight.text}</Text>
            </View>
          </>
        )}
      </View>

      {/* 2. Lost Time by Activity */}
      <View style={[c.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[c.cardTitle, { color: T.t1 }]}>Lost Time by Activity</Text>
        <Text style={[c.cardSub, { color: T.t3 }]}>Which activities create the most lost scheduled time</Text>

        {friction.activities.length === 0 ? (
          <Text style={[c.notEnough, { color: T.t3 }]}>Not enough data yet.</Text>
        ) : (
          <>
            {friction.activities.slice(0, 6).map(a => (
              <ActivityRow key={a.slot_id} activity={a} maxLost={maxLost} onPress={() => openActivity(a.slot_id)} T={T} />
            ))}
            <View style={[c.insightBanner, { backgroundColor: T.bg, borderColor: T.border }]}>
              <Text style={[c.insightText, { color: T.t1 }]}>{friction.insight}</Text>
            </View>
          </>
        )}
      </View>

      {/* 3. Time of Day Performance */}
      <View style={[c.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[c.cardTitle, { color: T.t1 }]}>Time of Day Performance</Text>
        <Text style={[c.cardSub, { color: T.t3 }]}>
          {temporal.mode === "activity_specific" && friction.selected
            ? `${friction.selected.name} by time of day`
            : "Completion rate by time of day"}
        </Text>

        <PeriodChart periods={periodsToShow} T={T} />

        {showDurationCompare && friction.selected && (
          <DurationCompare activity={friction.selected} T={T} />
        )}

        <View style={[c.recCard, { backgroundColor: T.bg, borderColor: T.border }]}>
          <View style={c.recHeader}>
            <Text style={[c.recTitle, { color: T.t1 }]}>Suggestion</Text>
            <EvidenceBadge level={temporal.recommendation.evidence} T={T} />
          </View>
          <Text style={[c.recText, { color: T.t2 }]}>{temporal.recommendation.text}</Text>
          {temporal.recommendation.action && (
            <TouchableOpacity
              style={[c.actionBtn, { backgroundColor: T.orange }]}
              onPress={() => openActivity(temporal.recommendation.action!.slot_id)}
            >
              <Text style={c.actionBtnText}>{temporal.recommendation.action.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const c = StyleSheet.create({
  centered: { paddingVertical: 60, alignItems: "center", justifyContent: "center" },

  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  rangeBtn: { flex: 1, borderWidth: 1, borderRadius: 99, paddingVertical: 9, alignItems: "center" },
  rangeBtnText: { fontFamily: "Montserrat_600SemiBold", fontSize: 12 },

  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontFamily: "Montserrat_700Bold", fontSize: 15 },
  cardSub: { fontFamily: "Montserrat_500Medium", fontSize: 11, marginTop: 3, marginBottom: 14 },
  notEnough: { fontFamily: "Montserrat_500Medium", fontSize: 12, fontStyle: "italic", paddingVertical: 12 },

  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingBottom: 4, paddingRight: 4 },
  chartCol: { alignItems: "center", width: 34 },
  chartTrackWrap: { justifyContent: "flex-end", alignItems: "center", width: "100%" },
  chartTrack: { width: 14, borderRadius: 5, overflow: "hidden", justifyContent: "flex-end" },
  chartFill: { width: "100%", borderRadius: 5 },
  chartTrackEmpty: { width: 14, height: 3, borderRadius: 2, marginBottom: 0 },
  chartColLabel: { fontFamily: "Montserrat_500Medium", fontSize: 9, marginTop: 6 },

  chipRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  chip: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  chipValue: { fontFamily: "Montserrat_700Bold", fontSize: 16 },
  chipLabel: { fontFamily: "Montserrat_600SemiBold", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2, textAlign: "center" },

  insightBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14 },
  insightText: { fontFamily: "Montserrat_600SemiBold", fontSize: 12, lineHeight: 17 },

  actRow: { borderBottomWidth: 1, paddingVertical: 12 },
  actTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  actName: { fontFamily: "Montserrat_600SemiBold", fontSize: 13, flex: 1 },
  actClass: { fontFamily: "Montserrat_700Bold", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.4 },
  actBarTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 8 },
  actBarFill: { height: "100%", borderRadius: 3 },
  actMeta: { fontFamily: "Montserrat_500Medium", fontSize: 10, marginTop: 6 },

  periodRow: { flexDirection: "row", justifyContent: "space-between" },
  periodCol: { alignItems: "center", flex: 1 },
  periodTrackWrap: { justifyContent: "flex-end", alignItems: "center", width: "100%" },
  periodBar: { width: 18, borderRadius: 5 },
  periodPct: { fontFamily: "Montserrat_700Bold", fontSize: 11, marginTop: 6 },
  periodLabel: { fontFamily: "Montserrat_500Medium", fontSize: 9, marginTop: 2, textAlign: "center" },

  durWrap: { marginTop: 18, gap: 10 },
  durRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  durLabel: { fontFamily: "Montserrat_600SemiBold", fontSize: 10, width: 84 },
  durTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  durFill: { height: "100%", borderRadius: 4 },
  durValue: { fontFamily: "Montserrat_700Bold", fontSize: 11, width: 44, textAlign: "right" },

  recCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  recHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recTitle: { fontFamily: "Montserrat_700Bold", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  recText: { fontFamily: "Montserrat_500Medium", fontSize: 13, lineHeight: 19, marginTop: 8 },
  evidenceBadge: { borderWidth: 1, borderRadius: 99, paddingVertical: 3, paddingHorizontal: 9 },
  evidenceText: { fontFamily: "Montserrat_700Bold", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5 },
  actionBtn: { marginTop: 12, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  actionBtnText: { fontFamily: "Montserrat_700Bold", fontSize: 12, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 },
});
