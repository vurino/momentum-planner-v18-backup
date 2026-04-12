import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Pressable, Dimensions,
  ScrollView, Animated, Keyboard, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme, getCardShadow, SPACING, RADIUS, FONT } from '../../context/ThemeContext';
import { TimeEditModal } from '../../components/TimeEditModal';
import { ConfirmModal } from '../../components/CustomModal';
import { TaskEditPanel } from '../../components/TaskEditPanel';
 
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
 
interface ScheduleSlot {
  id: string; label: string; icon: string;
  start_time: string; end_time: string;
  group: string; order_index: number; days: string[]; notes?: string;
}
 
const DAY_OPTIONS = [
  { key: 'weekdays', label: 'Weekdays', days: ['mon','tue','wed','thu','fri'] },
  { key: 'weekends', label: 'Weekends', days: ['sat','sun'] },
  { key: 'mon', label: 'Monday',    days: ['mon'] },
  { key: 'tue', label: 'Tuesday',   days: ['tue'] },
  { key: 'wed', label: 'Wednesday', days: ['wed'] },
  { key: 'thu', label: 'Thursday',  days: ['thu'] },
  { key: 'fri', label: 'Friday',    days: ['fri'] },
  { key: 'sat', label: 'Saturday',  days: ['sat'] },
  { key: 'sun', label: 'Sunday',    days: ['sun'] },
];
 
const DAY_ITEM_H = 32;
 
const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'restaurant':'restaurant-outline','sunny':'sunny-outline','briefcase':'briefcase-outline',
  'cafe':'cafe-outline','trending-up':'trending-up-outline','book':'book-outline',
  'fitness':'fitness-outline','fast-food':'fast-food-outline','analytics':'analytics-outline',
  'code':'code-outline','moon':'moon-outline','bed':'bed-outline','time':'time-outline',
  'heart':'heart-outline','musical-notes':'musical-notes-outline',
  'game-controller':'game-controller-outline','car':'car-outline','home':'home-outline',
  'pencil':'pencil-outline','school':'school-outline','walk':'walk-outline',
  'water':'water-outline','leaf':'leaf-outline','medkit':'medkit-outline',
};
const getIcon = (name: string): keyof typeof Ionicons.glyphMap =>
  iconMap[name] || iconMap[name + '-outline'] || 'ellipse-outline';
 
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
 
// ─────────────────────────────────────────────────────────────────────────────
// SWITCH
// ─────────────────────────────────────────────────────────────────────────────
const Switch = ({ value, onValueChange, colors }: {
  value: boolean; onValueChange: (v: boolean) => void; colors: any;
}) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    style={[S.switch, { backgroundColor: value ? colors.accent : colors.bgBase }]}
  >
    <View style={[S.switchThumb, {
      backgroundColor: '#fff',
      marginLeft: value ? 24 : 2,
    }]} />
  </Pressable>
);
 
// ─────────────────────────────────────────────────────────────────────────────
// DAY WHEEL
// ─────────────────────────────────────────────────────────────────────────────
const DayWheel = ({ selectedDays, onSelectDays, isDark, colors }: {
  selectedDays: string[]; onSelectDays: (days: string[], key: string) => void;
  isDark: boolean; colors: any;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initIdx = DAY_OPTIONS.findIndex(o =>
    o.days.length === selectedDays.length && o.days.every(d => selectedDays.includes(d)));
  const [displayIdx, setDisplayIdx] = useState(initIdx >= 0 ? initIdx : 0);
 
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: displayIdx * DAY_ITEM_H, animated: false });
    }, 80);
  }, []);
 
  const doSnap = useCallback((y: number) => {
    const idx = Math.max(0, Math.min(Math.round(y / DAY_ITEM_H), DAY_OPTIONS.length - 1));
    scrollRef.current?.scrollTo({ y: idx * DAY_ITEM_H, animated: false });
    setDisplayIdx(idx);
    onSelectDays(DAY_OPTIONS[idx].days, DAY_OPTIONS[idx].key);
  }, [onSelectDays]);
 
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setDisplayIdx(Math.max(0, Math.min(Math.round(y / DAY_ITEM_H), DAY_OPTIONS.length - 1)));
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => doSnap(y), 80);
  }, [doSnap]);
 
  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    doSnap(e.nativeEvent.contentOffset.y);
  }, [doSnap]);
 
  return (
    <View style={[S.dayCard, { backgroundColor: colors.bgBase }, getCardShadow(isDark)]}>
      <Text style={[S.dayCardLabel, { color: colors.textDim }]}>DAY</Text>
      <View style={S.dayWheelWrap}>
        <View style={[S.daySelHighlight, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        }]} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={DAY_ITEM_H}
          decelerationRate={0.9}
          scrollEventThrottle={16}
          disableIntervalMomentum
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{ paddingVertical: DAY_ITEM_H }}
        >
          {DAY_OPTIONS.map((opt, i) => {
            const sel = i === displayIdx;
            const dist = Math.abs(i - displayIdx);
            return (
              <View key={opt.key} style={[S.dayItem, { height: DAY_ITEM_H }]}>
                <Text style={{
                  color: sel ? colors.accent : colors.textSecondary,
                  fontWeight: sel ? '700' : '500',
                  opacity: dist === 0 ? 1 : dist === 1 ? 0.45 : 0.2,
                  fontSize: sel ? 14 : 12,
                }}>
                  {opt.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// PREFERENCES PANEL
// ─────────────────────────────────────────────────────────────────────────────
const PrefsPanel = ({ isDark, colors }: { isDark: boolean; colors: any }) => {
  const {
    toggleTheme, weekStartsOnMonday, setWeekStartsOnMonday,
    ignoreOverlaps, setIgnoreOverlaps, cascadeMode, setCascadeMode,
  } = useTheme();
  const [showReset, setShowReset] = useState(false);
  const [localOverlaps, setLocalOverlaps] = useState(ignoreOverlaps);
  const [localCascade, setLocalCascade] = useState(cascadeMode);
 
  const prefRow = (icon: keyof typeof Ionicons.glyphMap, label: string, control: React.ReactNode) => (
    <View style={S.prefRow}>
      <View style={S.prefLeft}>
        <Ionicons name={icon} size={15} color={colors.accent} />
        <Text style={[S.prefLabel, { color: colors.textBody }]}>{label}</Text>
      </View>
      {control}
    </View>
  );
 
  return (
    <View style={[S.prefsPanel, {
      backgroundColor: colors.bgSurface || colors.bgBase,
      borderColor: `${colors.accent}20`,
    }]}>
      <Text style={[S.prefsPanelTitle, { color: colors.textDim }]}>PREFERENCES</Text>
 
      {prefRow(isDark ? 'moon-outline' : 'sunny-outline', 'Dark Mode',
        <Switch value={isDark} onValueChange={toggleTheme} colors={colors} />)}
 
      {prefRow('calendar-outline', 'Week starts Monday',
        <Switch value={weekStartsOnMonday} onValueChange={setWeekStartsOnMonday} colors={colors} />)}
 
      {prefRow('git-merge-outline', 'Ignore overlaps',
        <Switch value={localOverlaps} onValueChange={v => { setLocalOverlaps(v); setIgnoreOverlaps(v); }} colors={colors} />)}
 
      {prefRow('swap-vertical-outline', 'Cascade on drag',
        <TouchableOpacity
          style={[S.cascadePill, { backgroundColor: `${colors.accent}18` }]}
          onPress={() => {
            const next = localCascade === 'shift-up' ? 'shift-down' : 'shift-up';
            setLocalCascade(next); setCascadeMode(next);
          }}
        >
          <Text style={[S.cascadePillText, { color: colors.accent }]}>
            {localCascade === 'shift-up' ? 'Shift up ▾' : 'Shift down ▾'}
          </Text>
        </TouchableOpacity>
      )}
 
      <View style={[S.prefDivider, { backgroundColor: colors.divider }]} />
 
      <TouchableOpacity
        style={[S.dangerBtn, { backgroundColor: 'rgba(239,68,68,0.10)' }]}
        onPress={() => setShowReset(true)}
      >
        <Ionicons name="trash-outline" size={14} color="#ef4444" />
        <Text style={S.dangerBtnText}>Reset All Data</Text>
      </TouchableOpacity>
 
      <ConfirmModal
        visible={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={() => setShowReset(false)}
        title="Reset All Data"
        message="Permanently delete all activities and reset settings to defaults."
        confirmText="Reset"
        isDanger
        isDark={isDark}
        colors={colors}
      />
    </View>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// SLOT EDITOR ROW
// ─────────────────────────────────────────────────────────────────────────────
const SlotRow = ({ slot, onEdit, onDelete, onTime, onDrag, isActive, isDark, colors }: {
  slot: ScheduleSlot; onEdit: () => void; onDelete: () => void;
  onTime: () => void; onDrag: () => void;
  isActive: boolean; isDark: boolean; colors: any;
}) => (
  <View style={[S.slotRow, { backgroundColor: colors.bgBase }, getCardShadow(isDark),
    isActive && { opacity: 0.9, transform: [{ scale: 1.02 }] }]}>
 
    {/* Drag handle — fixed: activationDistance handled at list level */}
    <TouchableOpacity style={S.dragHandle} onLongPress={onDrag} delayLongPress={150}>
      <Ionicons name="menu" size={15} color={isActive ? colors.accent : colors.textDim} />
    </TouchableOpacity>
 
    {/* Icon */}
    <TouchableOpacity
      style={[S.slotIcon, { backgroundColor: `${colors.accent}18` }]}
      onPress={onEdit}
    >
      <Ionicons name={getIcon(slot.icon)} size={14} color={colors.accent} />
    </TouchableOpacity>
 
    {/* Label + time */}
    <TouchableOpacity style={S.slotContent} onPress={onEdit}>
      <Text style={[S.slotLabel, { color: colors.textBody }]} numberOfLines={1}>
        {slot.label}
      </Text>
      <View style={S.slotTimeRow}>
        <Text style={[S.slotTime, { color: colors.textDim }]}>
          {slot.start_time} – {slot.end_time}
        </Text>
        <Text style={[S.slotDur, { color: colors.textDim }]}>
          {calcDuration(slot.start_time, slot.end_time)}
        </Text>
      </View>
    </TouchableOpacity>
 
    {/* Time edit */}
    <TouchableOpacity style={S.slotAction} onPress={onTime}>
      <Ionicons name="time-outline" size={15} color={colors.textDim} />
    </TouchableOpacity>
 
    {/* Delete */}
    <TouchableOpacity style={S.slotAction} onPress={onDelete}>
      <Ionicons name="trash-outline" size={13} color={colors.textDim} />
    </TouchableOpacity>
  </View>
);
 
// ─────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { isDark, colors, cascadeMode } = useTheme();
  const insets = useSafeAreaInsets();
 
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedDays, setSelectedDays] = useState(['mon','tue','wed','thu','fri']);
  const [showPrefs, setShowPrefs] = useState(false);
  const prefsAnim = useRef(new Animated.Value(0)).current;
 
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [timeSlot, setTimeSlot] = useState<ScheduleSlot | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [deleteSlot, setDeleteSlot] = useState<ScheduleSlot | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [pendingDay, setPendingDay] = useState<{ days: string[]; key: string } | null>(null);
  const [showDayWarn, setShowDayWarn] = useState(false);
 
  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots`);
      const data = await res.json();
      setSlots(data.map((s: ScheduleSlot) => ({
        ...s, days: s.days || ['mon','tue','wed','thu','fri','sat','sun'],
      })));
      setHasChanges(false);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
 
  useEffect(() => { fetchSlots(); }, [fetchSlots]);
 
  const togglePrefs = () => {
    const to = showPrefs ? 0 : 1;
    setShowPrefs(!showPrefs);
    Animated.spring(prefsAnim, { toValue: to, useNativeDriver: false, tension: 80, friction: 12 }).start();
  };
  const prefsHeight = prefsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 280] });
 
  const handleUpdateSlot = useCallback((id: string, updates: Partial<ScheduleSlot>) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    setHasChanges(true);
  }, []);
 
  const handleAddSlot = useCallback((updates: any) => {
    const slot: ScheduleSlot = {
      id: `slot-${Date.now()}`,
      label: updates.label || 'New Activity',
      icon: updates.icon || 'time',
      start_time: '09:00', end_time: '10:00',
      group: 'general', order_index: slots.length,
      days: selectedDays, notes: updates.notes,
    };
    setSlots(prev => [...prev, slot]);
    setHasChanges(true);
  }, [slots.length, selectedDays]);
 
  const handleDeleteSlot = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
    setHasChanges(true);
    setDeleteSlot(null);
  }, []);
 
  const handleDragEnd = useCallback(({ data }: { data: ScheduleSlot[] }) => {
    let reordered = data.map((s, i) => ({ ...s, order_index: i }));
 
    if (cascadeMode === 'shift-up') {
      let prevEnd: string | null = null;
      reordered = reordered.map(slot => {
        if (!prevEnd) { prevEnd = slot.end_time; return slot; }
        const [sH, sM] = slot.start_time.split(':').map(Number);
        const [eH, eM] = slot.end_time.split(':').map(Number);
        const dur = Math.abs((eH * 60 + eM) - (sH * 60 + sM));
        const [pH, pM] = prevEnd.split(':').map(Number);
        const newS = pH * 60 + pM, newE = newS + dur;
        prevEnd = `${Math.floor(newE / 60).toString().padStart(2,'0')}:${(newE % 60).toString().padStart(2,'0')}`;
        return { ...slot,
          start_time: `${Math.floor(newS / 60).toString().padStart(2,'0')}:${(newS % 60).toString().padStart(2,'0')}`,
          end_time: prevEnd };
      });
    } else {
      let prevEnd: string | null = null;
      reordered = reordered.map(slot => {
        if (!prevEnd) { prevEnd = slot.end_time; return slot; }
        const [sH, sM] = slot.start_time.split(':').map(Number);
        const [eH, eM] = slot.end_time.split(':').map(Number);
        const dur = Math.abs((eH * 60 + eM) - (sH * 60 + sM));
        const [pH, pM] = prevEnd.split(':').map(Number);
        const prevMins = pH * 60 + pM, slotMins = sH * 60 + sM;
        if (slotMins < prevMins) {
          const newS = prevMins, newE = newS + dur;
          prevEnd = `${Math.floor(newE / 60).toString().padStart(2,'0')}:${(newE % 60).toString().padStart(2,'0')}`;
          return { ...slot,
            start_time: `${Math.floor(newS / 60).toString().padStart(2,'0')}:${(newS % 60).toString().padStart(2,'0')}`,
            end_time: prevEnd };
        }
        prevEnd = slot.end_time;
        return slot;
      });
    }
 
    setSlots(reordered);
    setHasChanges(true);
  }, [cascadeMode]);
 
  const handleDayChange = useCallback((days: string[], key: string) => {
    const hasExisting = slots.some(s => s.days?.some(d => days.includes(d)));
    if (hasExisting) { setPendingDay({ days, key }); setShowDayWarn(true); }
    else { setSelectedDays(days); setHasChanges(true); }
  }, [slots]);
 
  const handleSave = async () => {
    setSaving(true);
    Keyboard.dismiss();
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots/bulk/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      if (res.ok) setHasChanges(false);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };
 
  const handleReset = async () => {
    setShowReset(false); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots/reset`, { method: 'POST' });
      const data = await res.json();
      setSlots(data.map((s: ScheduleSlot) => ({ ...s, days: s.days || ['mon','tue','wed','thu','fri','sat','sun'] })));
      setHasChanges(false);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
 
  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ScheduleSlot>) => (
    <ScaleDecorator>
      <SlotRow
        slot={item}
        onEdit={() => setEditSlot(item)}
        onDelete={() => setDeleteSlot(item)}
        onTime={() => setTimeSlot(item)}
        onDrag={drag}
        isActive={isActive}
        isDark={isDark}
        colors={colors}
      />
    </ScaleDecorator>
  ), [isDark, colors]);
 
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={S.screen}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
      <View style={[S.safe, { paddingTop: insets.top }]}>
 
        {/* Header */}
        <View style={S.header}>
          <Text style={[S.title, { color: colors.textPrimary }]}>Schedule</Text>
          <TouchableOpacity
            style={[S.prefsBtn, { backgroundColor: showPrefs ? `${colors.accent}18` : colors.bgBase }]}
            onPress={togglePrefs}
          >
            <Ionicons name="options-outline" size={19}
              color={showPrefs ? colors.accent : colors.textDim} />
          </TouchableOpacity>
        </View>
 
        {/* Collapsible prefs */}
        <Animated.View style={[S.prefsWrap, { height: prefsHeight, overflow: 'hidden' }]}>
          <View style={{ paddingHorizontal: SPACING.lg }}>
            <PrefsPanel isDark={isDark} colors={colors} />
          </View>
        </Animated.View>
 
        {/* Day wheel */}
        <View style={S.fixedPanels}>
          <DayWheel
            selectedDays={selectedDays}
            onSelectDays={handleDayChange}
            isDark={isDark}
            colors={colors}
          />
        </View>
 
        {/* Activities list */}
        <View style={S.activitiesSection}>
          <View style={S.activitiesHeader}>
            <Text style={[S.sectionTitle, { color: colors.textBody }]}>Activities</Text>
            <Text style={[S.sectionHint, { color: colors.textDim }]}>Hold to drag</Text>
          </View>
 
          {loading ? (
            <View style={S.loadingWrap}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <DraggableFlatList
              data={slots}
              keyExtractor={item => item.id}
              onDragEnd={handleDragEnd}
              renderItem={renderItem}
              contentContainerStyle={S.listContent}
              showsVerticalScrollIndicator={false}
              activationDistance={1}  // ← FIX: resolves double-press workaround
            />
          )}
        </View>
 
        {/* Bottom actions */}
        <View style={[S.bottomBar, { backgroundColor: colors.bgBase }, getCardShadow(isDark)]}>
          <TouchableOpacity
            style={[S.actionBtn, { backgroundColor: colors.bgBase, borderWidth: 0.5, borderColor: colors.dividerStrong }]}
            onPress={() => setShowReset(true)}
          >
            <Ionicons name="refresh" size={14} color={colors.textMuted} />
            <Text style={[S.actionBtnText, { color: colors.textMuted }]}>Reset</Text>
          </TouchableOpacity>
 
          <TouchableOpacity
            style={[S.addBtn, { backgroundColor: `${colors.accent}18`, borderWidth: 1, borderColor: `${colors.accent}30` }]}
            onPress={() => setAddModal(true)}
          >
            <Ionicons name="add" size={22} color={colors.accent} />
          </TouchableOpacity>
 
          <TouchableOpacity
            style={[S.actionBtn, { backgroundColor: hasChanges ? colors.accent : colors.bgBase,
              borderWidth: 0.5, borderColor: hasChanges ? colors.accent : colors.dividerStrong }]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="checkmark" size={14} color={hasChanges ? '#fff' : colors.textDim} />
                <Text style={[S.actionBtnText, { color: hasChanges ? '#fff' : colors.textDim }]}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
 
      {/* Modals */}
      <TaskEditPanel visible={!!editSlot} onClose={() => setEditSlot(null)}
        onSave={u => { if (editSlot) handleUpdateSlot(editSlot.id, u); }}
        initialLabel={editSlot?.label || ''} initialIcon={editSlot?.icon || 'time'}
        initialNotes={editSlot?.notes || ''} isDark={isDark} colors={colors} />
 
      <TimeEditModal visible={!!timeSlot} onClose={() => setTimeSlot(null)}
        onSave={(s, e) => { if (timeSlot) { handleUpdateSlot(timeSlot.id, { start_time: s, end_time: e }); setTimeSlot(null); } }}
        initialStartTime={timeSlot?.start_time || '09:00'} initialEndTime={timeSlot?.end_time || '10:00'}
        taskLabel={timeSlot?.label} isDark={isDark} colors={colors} />
 
      <TaskEditPanel visible={addModal} onClose={() => setAddModal(false)}
        onSave={handleAddSlot}
        initialLabel="" initialIcon="time" initialNotes="" isDark={isDark} colors={colors} />
 
      <ConfirmModal visible={!!deleteSlot} onClose={() => setDeleteSlot(null)}
        onConfirm={() => deleteSlot && handleDeleteSlot(deleteSlot.id)}
        title="Delete Activity" message={`Delete "${deleteSlot?.label}"?`}
        confirmText="Delete" isDanger isDark={isDark} colors={colors} />
 
      <ConfirmModal visible={showReset} onClose={() => setShowReset(false)}
        onConfirm={handleReset}
        title="Reset Schedule" message="Restore the default schedule and remove all customizations."
        confirmText="Reset" isDanger isDark={isDark} colors={colors} />
 
      <ConfirmModal visible={showDayWarn}
        onClose={() => { setShowDayWarn(false); setPendingDay(null); }}
        onConfirm={() => {
          if (pendingDay) { setSelectedDays(pendingDay.days); setHasChanges(true); setPendingDay(null); }
          setShowDayWarn(false);
        }}
        title="Existing Tasks"
        message={`Some activities already have tasks for ${pendingDay ? DAY_OPTIONS.find(o => o.key === pendingDay.key)?.label : 'these days'}. Overwrite?`}
        confirmText="Overwrite" cancelText="Keep" isDanger={false} isDark={isDark} colors={colors} />
    </View>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
 
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  title: { fontSize: FONT.xl, fontWeight: '700', letterSpacing: -0.5 },
  prefsBtn: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
 
  prefsWrap: { overflow: 'hidden' },
  prefsPanel: { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1 },
  prefsPanelTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefLabel: { fontSize: 13, fontWeight: '500' },
  cascadePill: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  cascadePillText: { fontSize: 12, fontWeight: '600' },
  prefDivider: { height: 1, marginBottom: 10 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: RADIUS.sm, paddingVertical: 10 },
  dangerBtnText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
 
  switch: { width: 46, height: 22, borderRadius: 11, flexDirection: 'row', alignItems: 'center' },
  switchThumb: { width: 18, height: 18, borderRadius: 9 },
 
  fixedPanels: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  dayCard: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, height: DAY_ITEM_H * 3 },
  dayCardLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginRight: SPACING.md },
  dayWheelWrap: { height: DAY_ITEM_H * 3, flex: 1, overflow: 'hidden', position: 'relative' },
  daySelHighlight: { position: 'absolute', top: DAY_ITEM_H, left: 0, right: 0,
    height: DAY_ITEM_H, borderRadius: RADIUS.sm, zIndex: -1 },
  dayItem: { justifyContent: 'center', alignItems: 'center' },
 
  activitiesSection: { flex: 1, paddingHorizontal: SPACING.lg },
  activitiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600' },
  sectionHint: { fontSize: 10 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: SPACING.sm },
 
  slotRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm },
  dragHandle: { padding: 6, marginRight: 2 },
  slotIcon: { width: 30, height: 30, borderRadius: RADIUS.md, alignItems: 'center',
    justifyContent: 'center', marginRight: SPACING.sm },
  slotContent: { flex: 1 },
  slotLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  slotTime: { fontSize: 11 },
  slotDur: { fontSize: 10, fontWeight: '500' },
  slotAction: { padding: 6 },
 
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, borderRadius: RADIUS.md, gap: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
 