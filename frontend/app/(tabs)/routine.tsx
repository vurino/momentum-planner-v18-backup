import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";

const BASE = "http://localhost:8001";

interface Slot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  order_index: number;
  days: string[];
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
}: {
  slot: Partial<Slot> | null;
  onClose: () => void;
  onSave: (data: Partial<Slot>) => void;
  onDelete?: (id: string) => void;
  totalSlots: number;
}) {
  const isNew = !slot?.id;
  const [label, setLabel] = useState(slot?.label ?? "");
  const [time, setTime] = useState(slot?.start_time ?? "09:00");
  const initialDuration = slot?.start_time && slot?.end_time ? diffMinutes(slot.start_time, slot.end_time) : 30;
  const [duration, setDuration] = useState(String(initialDuration));

  const handleSave = () => {
    if (!label.trim()) {
      Alert.alert("Name required");
      return;
    }

    const dur = parseInt(duration, 10) || 30;

    onSave({
      id: slot?.id,
      label: label.trim(),
      start_time: time,
      end_time: calcEndTime(time, dur),
      order_index: slot?.order_index ?? totalSlots,
      days: slot?.days ?? ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
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
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={ms.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={ms.sheet}>
          <Text style={ms.sheetTitle}>{isNew ? "Add activity" : "Edit activity"}</Text>

          <Text style={ms.fieldLabel}>Name</Text>
          <TextInput style={ms.input} value={label} onChangeText={setLabel} placeholder="Activity name" />

          <Text style={ms.fieldLabel}>Time</Text>
          <TextInput style={ms.input} value={time} onChangeText={setTime} placeholder="09:00" />

          <Text style={ms.fieldLabel}>Duration (min)</Text>
          <TextInput
            style={ms.input}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="30"
          />

          <View style={ms.actions}>
            {!isNew && (
              <TouchableOpacity style={ms.deleteBtn} onPress={handleDelete}>
                <Text style={ms.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
              <Text style={ms.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ms.saveBtn} onPress={handleSave}>
              <Text style={ms.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function RoutineScreen() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Slot> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/schedule-slots`);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : data.slots ?? []);
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
      <View style={s.centered}>
        <ActivityIndicator color="#d4562a" />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.header}>
          <Text style={s.eyebrow}>Daily template</Text>
          <Text style={s.title}>Routine</Text>
          <Text style={s.subtitle}>Activities repeat on your schedule</Text>
        </View>

        {slots.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>↻</Text>
            <Text style={s.emptyTitle}>No activities yet</Text>
            <Text style={s.emptyDesc}>
              Add your daily activities below. They'll repeat on your schedule and generate tasks each morning.
            </Text>
          </View>
        )}

        {slots.map((slot, i) => {
          const duration = diffMinutes(slot.start_time, slot.end_time);

          return (
            <TouchableOpacity key={slot.id} style={s.item} onPress={() => openEdit(slot)}>
              <Text style={s.itemNum}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{slot.label}</Text>
                <Text style={s.itemMeta}>
                  {slot.start_time} · {formatDur(duration)}
                </Text>
              </View>
              <View style={s.badge}>
                <Text style={s.badgeText}>Daily</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ Add activity</Text>
        </TouchableOpacity>
      </ScrollView>

      <LinearGradient colors={["transparent", "#090909"]} style={s.fade} pointerEvents="none" />

      {modalOpen && (
        <SlotModal
          slot={editing}
          onClose={closeModal}
          onSave={saveSlot}
          onDelete={deleteSlot}
          totalSlots={slots.length}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090909" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },
  centered: { flex: 1, backgroundColor: "#090909", alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 24, paddingBottom: 22 },
  eyebrow: { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 4, color: "#d4562a", textTransform: "uppercase", marginBottom: 6 },
  title: { fontFamily: "Montserrat_700Bold", fontSize: 28, color: "#ede9e1", lineHeight: 34 },
  subtitle: { fontFamily: "Montserrat_500Medium", fontSize: 13, color: "#5a576a", marginTop: 5 },
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 16, color: "#d4562a" },
  emptyTitle: { fontFamily: "Montserrat_700Bold", fontSize: 18, color: "#ede9e1", marginBottom: 10, textAlign: "center" },
  emptyDesc: { fontFamily: "Montserrat_500Medium", fontSize: 13, color: "#5a576a", textAlign: "center", lineHeight: 20 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#111116", borderWidth: 1, borderColor: "#1e1e28", borderRadius: 14, padding: 16, marginBottom: 8 },
  itemNum: { fontFamily: "Montserrat_700Bold", fontSize: 11, color: "#2e2c3a", width: 22 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: "Montserrat_600SemiBold", fontSize: 14, color: "#ede9e1" },
  itemMeta: { fontFamily: "Montserrat_500Medium", fontSize: 11, color: "#5a576a", marginTop: 3 },
  badge: { borderWidth: 1, borderColor: "#1e1e28", borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontFamily: "Montserrat_600SemiBold", fontSize: 10, color: "#5a576a" },
  addBtn: { borderWidth: 1, borderColor: "#1e1e28", borderStyle: "dashed", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 4 },
  addBtnText: { fontFamily: "Montserrat_600SemiBold", fontSize: 12, color: "#5a576a", letterSpacing: 1 },
  fade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#111116", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: "#1e1e28" },
  sheetTitle: { fontFamily: "Montserrat_700Bold", fontSize: 18, color: "#ede9e1", marginBottom: 20 },
  fieldLabel: { fontFamily: "Montserrat_600SemiBold", fontSize: 11, color: "#5a576a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: "#090909", borderWidth: 1, borderColor: "#1e1e28", borderRadius: 10, padding: 13, fontFamily: "Montserrat_500Medium", fontSize: 14, color: "#ede9e1" },
  actions: { flexDirection: "row", gap: 8, marginTop: 24 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: "rgba(192,64,64,0.4)", alignItems: "center" },
  deleteBtnText: { fontFamily: "Montserrat_700Bold", fontSize: 11, color: "#c04040" },
  cancelBtn: { flex: 1, backgroundColor: "#1e1e28", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelBtnText: { fontFamily: "Montserrat_600SemiBold", fontSize: 13, color: "#5a576a" },
  saveBtn: { flex: 1, backgroundColor: "#d4562a", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { fontFamily: "Montserrat_700Bold", fontSize: 13, color: "#fff" },
});