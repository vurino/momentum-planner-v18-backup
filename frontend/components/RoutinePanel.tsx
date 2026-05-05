import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme, getCardShadow, SPACING, RADIUS, FONT } from '../context/ThemeContext';
import { TimeEditModal } from './TimeEditModal';
import { ConfirmModal } from './CustomModal';
import { TaskEditPanel } from './TaskEditPanel';
 
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
 
interface ScheduleSlot {
  id: string; label: string; icon: string;
  start_time: string; end_time: string;
  group: string; order_index: number; days: string[]; notes?: string;
}
 
const RECURRENCE_OPTIONS = [
  { key: 'everyday',  label: 'Every day',  days: ['mon','tue','wed','thu','fri','sat','sun'] },
  { key: 'weekdays',  label: 'Weekdays',   days: ['mon','tue','wed','thu','fri'] },
  { key: 'weekends',  label: 'Weekends',   days: ['sat','sun'] },
];
 
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABELS = ['M','T','W','T','F','S','S'];
 
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
 
const calcDuration = (start: string, end: string) => {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diff = (eH * 60 + eM) - (sH * 60 + sM);
  if (diff < 0) diff += 1440;
  const h = Math.floor(diff / 60), m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};
 
const getRecurrenceLabel = (days: string[]): string => {
  const sorted = [...days].sort();
  const all = ['fri','mon','sat','sun','thu','tue','wed'];
  const wkdays = ['fri','mon','thu','tue','wed'];
  const wkends = ['sat','sun'];
  if (JSON.stringify(sorted) === JSON.stringify(all)) return 'Every day';
  if (JSON.stringify(sorted) === JSON.stringify(wkdays)) return 'Weekdays';
  if (JSON.stringify(sorted) === JSON.stringify(wkends)) return 'Weekends';
  return days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
};
 
// ── Recurrence Selector Modal ───────────────────────────────────────────────
const RecurrenceModal = ({ visible, slot, onClose, onSave, colors, isDark }: {
  visible: boolean; slot: ScheduleSlot | null; onClose: () => void;
  onSave: (days: string[]) => void; colors: any; isDark: boolean;
}) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
 
  useEffect(() => {
    if (slot) setSelectedDays(slot.days || ['mon','tue','wed','thu','fri']);
  }, [slot]);
 
  if (!slot) return null;
 
  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };
 
  const selectPreset = (days: string[]) => setSelectedDays(days);
 
  return (
    <ConfirmModal
      visible={visible}
      onClose={onClose}
      onConfirm={() => { onSave(selectedDays); onClose(); }}
      title={`${slot.label} — schedule`}
      message=""
      confirmText="Done"
      isDanger={false}
      isDark={isDark}
      colors={colors}
      customContent={
        <View>
          {/* Preset pills */}
          <View style={rS.presetRow}>
            {RECURRENCE_OPTIONS.map(opt => {
              const active = JSON.stringify([...selectedDays].sort()) === JSON.stringify([...opt.days].sort());
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => selectPreset(opt.days)}
                  style={[rS.presetPill, active && { backgroundColor: colors.accent }]}
                >
                  <Text style={[rS.presetTxt, { color: active ? '#fff' : colors.textMuted }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Custom day grid */}
          <Text style={[rS.customLbl, { color: colors.textDim }]}>Custom</Text>
          <View style={rS.dayGrid}>
            {DAY_KEYS.map((day, i) => {
              const active = selectedDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[rS.dayCell, active && { backgroundColor: colors.accent }]}
                >
                  <Text style={[rS.dayCellTxt, { color: active ? '#fff' : colors.textDim }]}>
                    {DAY_LABELS[i]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      }
    />
  );
};
 
const rS = StyleSheet.create({
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md, flexWrap: 'wrap' },
  presetPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.06)' },
  presetTxt: { fontSize: 12, fontWeight: '600' },
  customLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.sm },
  dayGrid: { flexDirection: 'row', gap: 8 },
  dayCell: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  dayCellTxt: { fontSize: 12, fontWeight: '700' },
});
 
// ── Slot row ────────────────────────────────────────────────────────────────
const SlotRow = ({ slot, onEdit, onDelete, onTime, onRecurrence, onDrag, isActive, isDark, colors }: {
  slot: ScheduleSlot; onEdit: () => void; onDelete: () => void;
  onTime: () => void; onRecurrence: () => void; onDrag: () => void;
  isActive: boolean; isDark: boolean; colors: any;
}) => (
  <View style={[S.slotRow, { backgroundColor: colors.bgBase }, getCardShadow(isDark),
    isActive && { opacity: 0.9, transform: [{ scale: 1.02 }] }]}>
    <TouchableOpacity style={S.dragHandle} onLongPress={onDrag} delayLongPress={150}>
      <Ionicons name="menu" size={15} color={isActive ? colors.accent : colors.textDim} />
    </TouchableOpacity>
    <TouchableOpacity style={[S.slotIco, { backgroundColor: `${colors.accent}18` }]} onPress={onEdit}>
      <Ionicons name={getIcon(slot.icon)} size={14} color={colors.accent} />
    </TouchableOpacity>
    <TouchableOpacity style={S.slotContent} onPress={onEdit}>
      <Text style={[S.slotLabel, { color: colors.textBody }]} numberOfLines={1}>{slot.label}</Text>
      <View style={S.slotMeta}>
        <Text style={[S.slotTime, { color: colors.textDim }]}>
          {slot.start_time} – {slot.end_time} · {calcDuration(slot.start_time, slot.end_time)}
        </Text>
      </View>
      <TouchableOpacity onPress={onRecurrence}>
        <Text style={[S.slotRecurrence, { color: colors.accent }]}>
          {getRecurrenceLabel(slot.days || ['mon','tue','wed','thu','fri'])}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
    <TouchableOpacity style={S.slotAction} onPress={onTime}>
      <Ionicons name="time-outline" size={15} color={colors.textDim} />
    </TouchableOpacity>
    <TouchableOpacity style={S.slotAction} onPress={onDelete}>
      <Ionicons name="trash-outline" size={13} color={colors.textDim} />
    </TouchableOpacity>
  </View>
);
 
// ── Main ────────────────────────────────────────────────────────────────────
export function RoutinePanel({ insets }: { insets: any }) {
  const { isDark, colors } = useTheme();
 
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
 
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [timeSlot, setTimeSlot] = useState<ScheduleSlot | null>(null);
  const [recurrenceSlot, setRecurrenceSlot] = useState<ScheduleSlot | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [deleteSlot, setDeleteSlot] = useState<ScheduleSlot | null>(null);
  const [resetModal, setResetModal] = useState(false);
 
  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots`);
      const data = await res.json();
      setSlots(data.map((s: ScheduleSlot) => ({
        ...s, days: s.days || ['mon','tue','wed','thu','fri','sat','sun'],
      })));
      setHasChanges(false);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);
 
  useEffect(() => { fetchSlots(); }, [fetchSlots]);
 
  const autoSave = useCallback(async (newSlots: ScheduleSlot[]) => {
    try {
      await fetch(`${API_URL}/api/schedule-slots/bulk/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: newSlots }),
      });
      setHasChanges(false);
    } catch (e) { console.error('Auto-save:', e); }
  }, []);
 
  const updateSlot = useCallback((id: string, updates: Partial<ScheduleSlot>) => {
    setSlots(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      autoSave(next);
      return next;
    });
  }, [autoSave]);
 
  const handleDragEnd = useCallback(({ data }: { data: ScheduleSlot[] }) => {
    // Auto shift-up cascade
    let prevEnd: string | null = null;
    const reordered = data.map((slot, i) => {
      const s = { ...slot, order_index: i };
      if (!prevEnd) { prevEnd = s.end_time; return s; }
      const [sH, sM] = s.start_time.split(':').map(Number);
      const [eH, eM] = s.end_time.split(':').map(Number);
      const dur = Math.abs((eH * 60 + eM) - (sH * 60 + sM));
      const [pH, pM] = prevEnd.split(':').map(Number);
      const newS = pH * 60 + pM, newE = newS + dur;
      prevEnd = `${Math.floor(newE/60).toString().padStart(2,'0')}:${(newE%60).toString().padStart(2,'0')}`;
      return { ...s,
        start_time: `${Math.floor(newS/60).toString().padStart(2,'0')}:${(newS%60).toString().padStart(2,'0')}`,
        end_time: prevEnd };
    });
    setSlots(reordered);
    autoSave(reordered);
  }, [autoSave]);
 
  const handleAddSlot = useCallback((updates: any) => {
    const slot: ScheduleSlot = {
      id: `slot-${Date.now()}`,
      label: updates.label || 'New Activity',
      icon: updates.icon || 'time',
      start_time: '09:00', end_time: '10:00',
      group: 'general', order_index: slots.length,
      days: ['mon','tue','wed','thu','fri'],
      notes: updates.notes,
    };
    const next = [...slots, slot];
    setSlots(next);
    autoSave(next);
  }, [slots, autoSave]);
 
  const handleDeleteSlot = useCallback((id: string) => {
    const next = slots.filter(s => s.id !== id);
    setSlots(next);
    autoSave(next);
    setDeleteSlot(null);
  }, [slots, autoSave]);
 
  const handleReset = async () => {
    setResetModal(false); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots/reset`, { method: 'POST' });
      const data = await res.json();
      setSlots(data.map((s: ScheduleSlot) => ({ ...s, days: s.days || ['mon','tue','wed','thu','fri','sat','sun'] })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
 
  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ScheduleSlot>) => (
    <ScaleDecorator>
      <SlotRow
        slot={item}
        onEdit={() => setEditSlot(item)}
        onDelete={() => setDeleteSlot(item)}
        onTime={() => setTimeSlot(item)}
        onRecurrence={() => setRecurrenceSlot(item)}
        onDrag={drag}
        isActive={isActive}
        isDark={isDark}
        colors={colors}
      />
    </ScaleDecorator>
  ), [isDark, colors]);
 
  return (
    <View style={[S.screen, { backgroundColor: colors.bgBase }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
      <View style={[S.safe, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={[S.title, { color: colors.textPrimary }]}>Routine</Text>
            <Text style={[S.subtitle, { color: colors.textDim }]}>Your daily template</Text>
          </View>
          <TouchableOpacity
            style={[S.resetBtn, { backgroundColor: colors.bgBase, borderColor: colors.dividerStrong }]}
            onPress={() => setResetModal(true)}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.textDim} />
          </TouchableOpacity>
        </View>
 
        {/* Activity list */}
        <View style={S.listSection}>
          <View style={S.listHeader}>
            <Text style={[S.listLbl, { color: colors.textDim }]}>ACTIVITIES</Text>
            <Text style={[S.listHint, { color: colors.textDim }]}>Hold to drag</Text>
          </View>
          {loading ? (
            <View style={S.center}><ActivityIndicator size="large" color={colors.accent} /></View>
          ) : (
            <DraggableFlatList
              data={slots}
              keyExtractor={item => item.id}
              onDragEnd={handleDragEnd}
              renderItem={renderItem}
              contentContainerStyle={S.listContent}
              showsVerticalScrollIndicator={false}
              activationDistance={1}
            />
          )}
        </View>
 
        {/* Add button */}
        <View style={[S.bottomBar, { backgroundColor: colors.bgBase }]}>
          <TouchableOpacity
            style={[S.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => setAddModal(true)}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={S.addBtnTxt}>Add activity</Text>
          </TouchableOpacity>
        </View>
      </View>
 
      {/* Modals */}
      <TaskEditPanel visible={!!editSlot} onClose={() => setEditSlot(null)}
        onSave={u => { if (editSlot) updateSlot(editSlot.id, u); }}
        initialLabel={editSlot?.label || ''} initialIcon={editSlot?.icon || 'time'}
        initialNotes={editSlot?.notes || ''} isDark={isDark} colors={colors} />
 
      <TimeEditModal visible={!!timeSlot} onClose={() => setTimeSlot(null)}
        onSave={(s, e) => { if (timeSlot) { updateSlot(timeSlot.id, { start_time: s, end_time: e }); setTimeSlot(null); } }}
        initialStartTime={timeSlot?.start_time || '09:00'} initialEndTime={timeSlot?.end_time || '10:00'}
        taskLabel={timeSlot?.label} isDark={isDark} colors={colors} />
 
      <RecurrenceModal
        visible={!!recurrenceSlot} slot={recurrenceSlot}
        onClose={() => setRecurrenceSlot(null)}
        onSave={days => { if (recurrenceSlot) updateSlot(recurrenceSlot.id, { days }); }}
        colors={colors} isDark={isDark}
      />
 
      <TaskEditPanel visible={addModal} onClose={() => setAddModal(false)}
        onSave={handleAddSlot}
        initialLabel="" initialIcon="time" initialNotes="" isDark={isDark} colors={colors} />
 
      <ConfirmModal visible={!!deleteSlot} onClose={() => setDeleteSlot(null)}
        onConfirm={() => deleteSlot && handleDeleteSlot(deleteSlot.id)}
        title="Delete Activity" message={`Delete "${deleteSlot?.label}"?`}
        confirmText="Delete" isDanger isDark={isDark} colors={colors} />
 
      <ConfirmModal visible={resetModal} onClose={() => setResetModal(false)}
        onConfirm={handleReset}
        title="Reset Routine" message="Restore default schedule and remove all customizations."
        confirmText="Reset" isDanger isDark={isDark} colors={colors} />
    </View>
  );
}
 
const S = StyleSheet.create({
  screen: { flex: 1 },
  safe:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
 
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  title:    { fontSize: FONT.xl, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: FONT.xs, marginTop: 1 },
  resetBtn: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center',
    justifyContent: 'center', borderWidth: 0.5 },
 
  listSection: { flex: 1, paddingHorizontal: SPACING.lg },
  listHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  listLbl:     { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  listHint:    { fontSize: 10 },
  listContent: { paddingBottom: SPACING.sm },
 
  slotRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm },
  dragHandle: { padding: 6, marginRight: 2 },
  slotIco:    { width: 30, height: 30, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  slotContent: { flex: 1 },
  slotLabel:   { fontSize: 13, fontWeight: '600', marginBottom: 1 },
  slotMeta:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  slotTime:    { fontSize: 10 },
  slotRecurrence: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  slotAction:  { padding: 6 },
 
  bottomBar: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  addBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: 13, borderRadius: RADIUS.lg },
  addBtnTxt: { color: '#fff', fontSize: FONT.sm, fontWeight: '600' },
});
 