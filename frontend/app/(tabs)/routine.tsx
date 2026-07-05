import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useSimpleTheme, ThemeTokens } from "../../context/SimpleTheme";

const BASE = "";
const SCROLL_ID = "routine-scroll";

interface Slot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  order_index: number;
  days: string[];
}

const RECURRENCE_OPTIONS: { key: string; label: string; days: string[] }[] = [
  { key: "daily",    label: "Every day", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
  { key: "weekdays", label: "Weekdays",  days: ["mon", "tue", "wed", "thu", "fri"] },
  { key: "weekends", label: "Weekends",  days: ["sat", "sun"] },
];

const FILTER_OPTIONS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  ...RECURRENCE_OPTIONS,
];

function daysToRecurrenceKey(days: string[] | undefined): string {
  const set = new Set(days ?? []);
  const weekdays = ["mon", "tue", "wed", "thu", "fri"];
  const weekends = ["sat", "sun"];
  if (set.size === 5 && weekdays.every(d => set.has(d))) return "weekdays";
  if (set.size === 2 && weekends.every(d => set.has(d))) return "weekends";
  return "daily";
}

function recurrenceLabel(days: string[] | undefined): string {
  const key = daysToRecurrenceKey(days);
  return RECURRENCE_OPTIONS.find(o => o.key === key)?.label ?? "Every day";
}

function diffMinutes(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

function calcEndTime(startTime: string, durationMin: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function formatDur(min: number) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${min} min`;
}

function SlotModal({
  slot,
  onClose,
  onSave,
  onDelete,
  totalSlots,
  T,
}: {
  slot: Partial<Slot> | null;
  onClose: () => void;
  onSave: (data: Partial<Slot>) => void;
  onDelete?: (id: string) => void;
  totalSlots: number;
  T: ThemeTokens;
}) {
  const isNew = !slot?.id;
  const [label, setLabel] = useState(slot?.label ?? "");
  const [time, setTime] = useState(slot?.start_time ?? "09:00");
  const initialDuration = slot?.start_time && slot?.end_time ? diffMinutes(slot.start_time, slot.end_time) : 30;
  const [duration, setDuration] = useState(String(initialDuration));
  const [recurrence, setRecurrence] = useState(daysToRecurrenceKey(slot?.days));

  const handleSave = () => {
    if (!label.trim()) {
      Alert.alert("Name required");
      return;
    }

    const dur = parseInt(duration, 10) || 30;
    const days = RECURRENCE_OPTIONS.find(o => o.key === recurrence)?.days
      ?? RECURRENCE_OPTIONS[0].days;

    onSave({
      id: slot?.id,
      label: label.trim(),
      start_time: time,
      end_time: calcEndTime(time, dur),
      order_index: slot?.order_index ?? totalSlots,
      days,
    });
  };

  const handleDelete = () => {
    if (!slot?.id) return;

    Alert.alert("Delete activity?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete?.(slot.id!) },
    ]);
  };

  return (
    <View style={ms.overlay}>
      <KeyboardAvoidingView
        style={ms.sheetWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[ms.sheet, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[ms.sheetTitle, { color: T.t1 }]}>{isNew ? "Add activity" : "Edit activity"}</Text>

          <Text style={[ms.fieldLabel, { color: T.t2 }]}>Name</Text>
          <TextInput
            style={[ms.input, { backgroundColor: T.bg, borderColor: T.border, color: T.t1 }]}
            value={label}
            onChangeText={setLabel}
            placeholder="Activity name"
            placeholderTextColor={T.t2}
          />

          <Text style={[ms.fieldLabel, { color: T.t2 }]}>Time</Text>
          <TextInput
            style={[ms.input, { backgroundColor: T.bg, borderColor: T.border, color: T.t1 }]}
            value={time}
            onChangeText={setTime}
            placeholder="09:00"
            placeholderTextColor={T.t2}
          />

          <Text style={[ms.fieldLabel, { color: T.t2 }]}>Duration (min)</Text>
          <TextInput
            style={[ms.input, { backgroundColor: T.bg, borderColor: T.border, color: T.t1 }]}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={T.t2}
          />

          <Text style={[ms.fieldLabel, { color: T.t2 }]}>Repeat</Text>
          <View style={ms.recurrenceRow}>
            {RECURRENCE_OPTIONS.map(opt => {
              const active = recurrence === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    ms.recurrenceBtn,
                    { borderColor: T.border },
                    active && { backgroundColor: T.orange, borderColor: T.orange },
                  ]}
                  onPress={() => setRecurrence(opt.key)}
                >
                  <Text style={[ms.recurrenceBtnText, { color: active ? "#fff" : T.t2 }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={ms.actions}>
            {!isNew && (
              <TouchableOpacity style={ms.deleteBtn} onPress={handleDelete}>
                <Text style={[ms.deleteBtnText, { color: T.danger }]}>Delete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[ms.cancelBtn, { backgroundColor: T.border }]} onPress={onClose}>
              <Text style={[ms.cancelBtnText, { color: T.t2 }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[ms.saveBtn, { backgroundColor: T.orange }]} onPress={handleSave}>
              <Text style={ms.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function RoutineScreen() {
  const { T } = useSimpleTheme();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Slot> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const style = document.createElement("style");
    style.textContent = `
      #${SCROLL_ID}::-webkit-scrollbar { display: none; }
      #${SCROLL_ID} { scrollbar-width: none; -ms-overflow-style: none; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/schedule-slots`);
      const data = await res.json();
      const raw: Slot[] = Array.isArray(data) ? data : data.slots ?? [];
      setSlots([...raw].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSlots();
    }, [fetchSlots])
  );

  const openAdd = () => {
    setEditing({});
    setModalOpen(true);
  };

  const openEdit = (slot: Slot) => {
    setEditing(slot);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const saveSlot = async (data: Partial<Slot>) => {
    try {
      const body = {
        label: data.label,
        start_time: data.start_time,
        end_time: data.end_time,
        order_index: data.order_index ?? slots.length,
        days: data.days ?? ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      };

      const res = await fetch(
        data.id ? `${BASE}/api/schedule-slots/${data.id}` : `${BASE}/api/schedule-slots`,
        {
          method: data.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        Alert.alert("Error", JSON.stringify(err));
        return;
      }

      closeModal();
      fetchSlots();
    } catch (e) {
      Alert.alert("Network error", String(e));
    }
  };

  const deleteSlot = async (id: string) => {
    try {
      await fetch(`${BASE}/api/schedule-slots/${id}`, { method: "DELETE" });
      closeModal();
      fetchSlots();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.orange} />
      </View>
    );
  }

  const visibleSlots = filter === "all"
    ? slots
    : slots.filter(slot => daysToRecurrenceKey(slot.days) === filter);

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <ScrollView
        nativeID={SCROLL_ID}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={[s.eyebrow, { color: T.orange }]}>Daily template</Text>
          <Text style={[s.title, { color: T.t1 }]}>Routine</Text>
          <Text style={[s.subtitle, { color: T.t2 }]}>Activities repeat on your schedule</Text>
        </View>

        <View style={s.filterRow}>
          {FILTER_OPTIONS.map(opt => {
            const active = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  s.filterBtn,
                  { borderColor: T.border },
                  active && { backgroundColor: T.orange, borderColor: T.orange },
                ]}
                onPress={() => setFilter(opt.key)}
              >
                <Text style={[s.filterBtnText, { color: active ? "#fff" : T.t2 }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {visibleSlots.length === 0 && (
          <View style={s.emptyState}>
            <Text style={[s.emptyIcon, { color: T.orange }]}>↻</Text>
            <Text style={[s.emptyTitle, { color: T.t1 }]}>No activities yet</Text>
            <Text style={[s.emptyDesc, { color: T.t2 }]}>
              {slots.length === 0
                ? "Add your daily activities below. They'll repeat on your schedule and generate tasks each morning."
                : "No activities match this filter."}
            </Text>
          </View>
        )}

        {visibleSlots.map((slot) => {
          const duration = diffMinutes(slot.start_time, slot.end_time);

          return (
            <TouchableOpacity
              key={slot.id}
              style={[s.item, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={() => openEdit(slot)}
            >
              <View style={s.itemInfo}>
                <Text style={[s.itemName, { color: T.t1 }]}>{slot.label}</Text>
                <Text style={[s.itemMeta, { color: T.t2 }]}>
                  {slot.start_time} · {formatDur(duration)}
                </Text>
              </View>
              <View style={[s.badge, { borderColor: T.border }]}>
                <Text style={[s.badgeText, { color: T.t2 }]}>{recurrenceLabel(slot.days)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={[s.addBtn, { borderColor: T.border }]} onPress={openAdd}>
          <Text style={[s.addBtnText, { color: T.t2 }]}>+ Add activity</Text>
        </TouchableOpacity>
      </ScrollView>

      <LinearGradient colors={["transparent", T.bg]} style={s.fade} pointerEvents="none" />

      {modalOpen && (
        <SlotModal
          slot={editing}
          onClose={closeModal}
          onSave={saveSlot}
          onDelete={deleteSlot}
          totalSlots={slots.length}
          T={T}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 24, paddingBottom: 22 },
  eyebrow: { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 },
  title: { fontFamily: "Montserrat_700Bold", fontSize: 28, lineHeight: 34 },
  subtitle: { fontFamily: "Montserrat_500Medium", fontSize: 13, marginTop: 5 },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  filterBtn: { borderWidth: 1, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 14 },
  filterBtnText: { fontFamily: "Montserrat_600SemiBold", fontSize: 11 },

  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: { fontFamily: "Montserrat_700Bold", fontSize: 18, marginBottom: 10, textAlign: "center" },
  emptyDesc: { fontFamily: "Montserrat_500Medium", fontSize: 13, textAlign: "center", lineHeight: 20 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: "Montserrat_600SemiBold", fontSize: 13 },
  itemMeta: { fontFamily: "Montserrat_500Medium", fontSize: 11, marginTop: 3 },
  badge: { borderWidth: 1, borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontFamily: "Montserrat_600SemiBold", fontSize: 10 },
  addBtn: { borderWidth: 1, borderStyle: "dashed", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 4 },
  addBtnText: { fontFamily: "Montserrat_600SemiBold", fontSize: 12, letterSpacing: 1 },
  fade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});

const ms = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end", zIndex: 999, elevation: 999 },
  sheetWrap: { justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1 },
  sheetTitle: { fontFamily: "Montserrat_700Bold", fontSize: 18, marginBottom: 20 },
  fieldLabel: { fontFamily: "Montserrat_600SemiBold", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontFamily: "Montserrat_500Medium", fontSize: 14 },
  recurrenceRow: { flexDirection: "row", gap: 8 },
  recurrenceBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  recurrenceBtnText: { fontFamily: "Montserrat_600SemiBold", fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 24 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: "rgba(192,64,64,0.4)", alignItems: "center" },
  deleteBtnText: { fontFamily: "Montserrat_700Bold", fontSize: 11 },
  cancelBtn: { flex: 1, borderRadius: 10, padding: 13, alignItems: "center" },
  cancelBtnText: { fontFamily: "Montserrat_600SemiBold", fontSize: 13 },
  saveBtn: { flex: 1, borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { fontFamily: "Montserrat_700Bold", fontSize: 13, color: "#fff" },
});