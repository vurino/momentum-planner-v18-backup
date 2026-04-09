import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Pressable, Dimensions,
  ScrollView, Animated, Keyboard, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme, getCardShadow, SPACING, CARD_PADDING } from '../../context/ThemeContext';
import { TimeEditModal } from '../../components/TimeEditModal';
import { ConfirmModal } from '../../components/CustomModal';
import { TaskEditPanel } from '../../components/TaskEditPanel';
 
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
 
const DAY_WHEEL_ITEM_HEIGHT = 32;
 
interface ScheduleSlot {
  id: string;
  label: string;
  icon: string;
  start_time: string;
  end_time: string;
  group: string;
  order_index: number;
  days: string[];
  notes?: string;
}
 
const DAY_OPTIONS = [
  { key: 'weekdays', label: 'Weekdays', days: ['mon','tue','wed','thu','fri'] },
  { key: 'weekends', label: 'Weekends', days: ['sat','sun'] },
  { key: 'mon', label: 'Monday', days: ['mon'] },
  { key: 'tue', label: 'Tuesday', days: ['tue'] },
  { key: 'wed', label: 'Wednesday', days: ['wed'] },
  { key: 'thu', label: 'Thursday', days: ['thu'] },
  { key: 'fri', label: 'Friday', days: ['fri'] },
  { key: 'sat', label: 'Saturday', days: ['sat'] },
  { key: 'sun', label: 'Sunday', days: ['sun'] },
];
 
const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
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
  return iconMap[iconName] || 'ellipse-outline';
};
 
const calcDuration = (start: string, end: string): string => {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diff = (eH * 60 + eM) - (sH * 60 + sM);
  if (diff < 0) diff += 1440;
  const h = Math.floor(diff / 60), m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};
 
// =============================================================================
// NEUMORPHIC SWITCH
// =============================================================================
const NeumorphicSwitch = ({ value, onValueChange, colors }: {
  value: boolean; onValueChange: (v: boolean) => void; colors: any;
}) => (
  <Pressable
    style={[S.switch, { backgroundColor: value ? colors.accent : colors.surface }]}
    onPress={() => onValueChange(!value)}
  >
    <View style={[S.switchThumb, { backgroundColor: colors.card, marginLeft: value ? 24 : 2 }]} />
  </Pressable>
);
 
// =============================================================================
// DAY WHEEL — fixed snap + orange selection (same pattern as TimeEditModal)
// =============================================================================
const DayWheelSelector = ({ selectedDays, onSelectDays, isDark, colors }: {
  selectedDays: string[];
  onSelectDays: (days: string[], key: string) => void;
  isDark: boolean; colors: any;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initIdx = DAY_OPTIONS.findIndex(o =>
    o.days.length === selectedDays.length && o.days.every(d => selectedDays.includes(d))
  );
  const [displayIdx, setDisplayIdx] = useState(initIdx >= 0 ? initIdx : 0);
 
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: displayIdx * DAY_WHEEL_ITEM_HEIGHT, animated: false });
    }, 80);
  }, []);
 
  const doSnap = useCallback((y: number) => {
    const idx = Math.max(0, Math.min(Math.round(y / DAY_WHEEL_ITEM_HEIGHT), DAY_OPTIONS.length - 1));
    scrollRef.current?.scrollTo({ y: idx * DAY_WHEEL_ITEM_HEIGHT, animated: false });
    setDisplayIdx(idx);
    onSelectDays(DAY_OPTIONS[idx].days, DAY_OPTIONS[idx].key);
  }, [onSelectDays]);
 
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(Math.round(y / DAY_WHEEL_ITEM_HEIGHT), DAY_OPTIONS.length - 1));
    setDisplayIdx(idx);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => doSnap(y), 80);
  }, [doSnap]);
 
  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    doSnap(e.nativeEvent.contentOffset.y);
  }, [doSnap]);
 
  return (
    <View style={[S.dayCard, { backgroundColor: colors.card }, getCardShadow(isDark)]}>
      <Text style={[S.dayLabel, { color: colors.textInactive }]}>DAY</Text>
      <View style={S.dayWheelWrapper}>
        <View style={[S.daySelIndicator, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
        }]} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={DAY_WHEEL_ITEM_HEIGHT}
          decelerationRate={0.9}
          scrollEventThrottle={16}
          disableIntervalMomentum={true}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{ paddingVertical: DAY_WHEEL_ITEM_HEIGHT }}
        >
          {DAY_OPTIONS.map((opt, index) => {
            const isSel = index === displayIdx;
            const dist = Math.abs(index - displayIdx);
            return (
              <View key={opt.key} style={[S.dayItem, { height: DAY_WHEEL_ITEM_HEIGHT }]}>
                <Text style={{
                  color: isSel ? colors.accent : colors.textSecondary,
                  fontWeight: isSel ? '700' : '500',
                  opacity: dist === 0 ? 1 : dist === 1 ? 0.5 : 0.25,
                  fontSize: isSel ? 14 : 12,
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
 
// =============================================================================
// PREFERENCES PANEL (collapsible)
// =============================================================================
const PreferencesPanel = ({ isDark, colors }: { isDark: boolean; colors: any }) => {
  const {
    toggleTheme, weekStartsOnMonday, setWeekStartsOnMonday,
    ignoreOverlaps, setIgnoreOverlaps, cascadeMode, setCascadeMode,
  } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
 
  // Local state mirrors for immediate UI response
  const [localIgnoreOverlaps, setLocalIgnoreOverlaps] = useState(ignoreOverlaps);
  const [localCascadeMode, setLocalCascadeMode] = useState(cascadeMode);
 
  const handleIgnoreOverlaps = (val: boolean) => {
    setLocalIgnoreOverlaps(val);
    setIgnoreOverlaps(val);
  };
 
  const handleCascadeMode = () => {
    const next = localCascadeMode === 'shift-up' ? 'shift-down' : 'shift-up';
    setLocalCascadeMode(next);
    setCascadeMode(next);
  };
 
  return (
    <View style={[S.prefsPanel, {
      backgroundColor: colors.surface,
      borderColor: isDark ? 'rgba(255,106,46,0.18)' : 'rgba(255,106,46,0.12)',
    }]}>
      <Text style={[S.prefsPanelTitle, { color: colors.textInactive }]}>PREFERENCES</Text>
 
      {/* Dark Mode */}
      <View style={S.prefRow}>
        <View style={S.prefLeft}>
          <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={16} color={colors.accent} />
          <Text style={[S.prefLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
        </View>
        <NeumorphicSwitch value={isDark} onValueChange={() => toggleTheme()} colors={colors} />
      </View>
 
      {/* Week starts Mon */}
      <View style={S.prefRow}>
        <View style={S.prefLeft}>
          <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          <Text style={[S.prefLabel, { color: colors.textPrimary }]}>Week starts Mon</Text>
        </View>
        <NeumorphicSwitch value={weekStartsOnMonday} onValueChange={setWeekStartsOnMonday} colors={colors} />
      </View>
 
      {/* Ignore overlaps */}
      <View style={S.prefRow}>
        <View style={S.prefLeft}>
          <Ionicons name="git-merge-outline" size={16} color={colors.accent} />
          <Text style={[S.prefLabel, { color: colors.textPrimary }]}>Ignore overlaps</Text>
        </View>
        <NeumorphicSwitch value={localIgnoreOverlaps} onValueChange={handleIgnoreOverlaps} colors={colors} />
      </View>
 
      {/* Cascade on drag */}
      <View style={[S.prefRow, { marginBottom: 12 }]}>
        <View style={S.prefLeft}>
          <Ionicons name="swap-vertical-outline" size={16} color={colors.accent} />
          <Text style={[S.prefLabel, { color: colors.textPrimary }]}>Cascade on drag</Text>
        </View>
        <TouchableOpacity
          style={[S.cascadePill, { backgroundColor: colors.accentGlow }]}
          onPress={handleCascadeMode}
        >
          <Text style={[S.cascadePillText, { color: colors.accent }]}>
            {localCascadeMode === 'shift-up' ? 'Shift up ▾' : 'Shift down ▾'}
          </Text>
        </TouchableOpacity>
      </View>
 
      {/* Divider */}
      <View style={[S.prefDivider, { backgroundColor: colors.divider }]} />
 
      {/* Reset All Data */}
      <TouchableOpacity
        style={[S.resetDangerBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
        onPress={() => setShowResetConfirm(true)}
      >
        <Ionicons name="trash-outline" size={15} color="#ef4444" />
        <Text style={S.resetDangerText}>Reset All Data</Text>
      </TouchableOpacity>
 
      <ConfirmModal
        visible={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => { setShowResetConfirm(false); /* handled by parent */ }}
        title="Reset All Data"
        message="This will permanently delete all your activities and reset all settings to defaults."
        confirmText="Reset"
        isDanger
        isDark={isDark}
        colors={colors}
      />
    </View>
  );
};
 
// =============================================================================
// SLOT EDITOR — individual activity row
// =============================================================================
const SlotEditor = ({ slot, onEdit, onDelete, onOpenTimeEditor, onDrag, isActive, isDark, colors }: {
  slot: ScheduleSlot; onEdit: () => void; onDelete: () => void;
  onOpenTimeEditor: () => void; onDrag: () => void;
  isActive: boolean; isDark: boolean; colors: any;
}) => (
  <View style={[S.slotItem, { backgroundColor: colors.card }, getCardShadow(isDark), isActive && { opacity: 0.9, transform: [{ scale: 1.02 }] }]}>
    {/* Drag handle — long press */}
    <TouchableOpacity style={S.dragHandle} onLongPress={onDrag} delayLongPress={200}>
      <Ionicons name="menu" size={16} color={isActive ? colors.accent : colors.iconInactive} />
    </TouchableOpacity>
 
    {/* Icon */}
    <TouchableOpacity style={[S.slotIcon, { backgroundColor: colors.surface }]} onPress={onEdit}>
      <Ionicons name={getIconName(slot.icon)} size={16} color={colors.accent} />
    </TouchableOpacity>
 
    {/* Label + time */}
    <TouchableOpacity style={S.slotContent} onPress={onEdit}>
      <Text style={[S.slotLabel, { color: colors.textPrimary }]} numberOfLines={1}>{slot.label}</Text>
      <View style={S.slotTimeRow}>
        <Text style={[S.slotTime, { color: colors.textInactive }]}>{slot.start_time} — {slot.end_time}</Text>
        <Text style={[S.slotDur, { color: colors.textInactive }]}>{calcDuration(slot.start_time, slot.end_time)}</Text>
      </View>
    </TouchableOpacity>
 
    {/* Time edit */}
    <TouchableOpacity style={S.slotAction} onPress={onOpenTimeEditor}>
      <Ionicons name="time-outline" size={16} color={colors.textInactive} />
    </TouchableOpacity>
 
    {/* Delete */}
    <TouchableOpacity style={S.slotAction} onPress={onDelete}>
      <Ionicons name="trash-outline" size={14} color={colors.textInactive} />
    </TouchableOpacity>
  </View>
);
 
// =============================================================================
// MAIN SETTINGS SCREEN
// =============================================================================
export default function SettingsScreen() {
  const { isDark, colors, cascadeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState(['mon','tue','wed','thu','fri']);
  const [showPrefs, setShowPrefs] = useState(false);
  const prefsAnim = useRef(new Animated.Value(0)).current;
 
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [timeEditorSlot, setTimeEditorSlot] = useState<ScheduleSlot | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteSlot, setDeleteSlot] = useState<ScheduleSlot | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
 
  // Overwrite confirmation
  const [pendingDayChange, setPendingDayChange] = useState<{ days: string[]; key: string } | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
 
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
 
  // Toggle preferences panel with animation
  const togglePrefs = () => {
    const toValue = showPrefs ? 0 : 1;
    setShowPrefs(!showPrefs);
    Animated.spring(prefsAnim, { toValue, useNativeDriver: false, tension: 80, friction: 12 }).start();
  };
 
  const handleUpdateSlot = useCallback((id: string, updates: Partial<ScheduleSlot>) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    setHasChanges(true);
  }, []);
 
  const handleAddSlot = useCallback((updates: any) => {
    const slot: ScheduleSlot = {
      id: `slot-${Date.now()}`,
      label: updates.label || 'New Activity',
      icon: updates.icon || 'time',
      start_time: '09:00',
      end_time: '10:00',
      group: 'general',
      order_index: slots.length,
      days: selectedDayFilter,
      notes: updates.notes,
    };
    setSlots(prev => [...prev, slot]);
    setHasChanges(true);
  }, [slots.length, selectedDayFilter]);
 
  const handleDeleteSlot = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
    setHasChanges(true);
    setDeleteSlot(null);
  }, []);
 
  // Auto-cascade on drag
  const handleDragEnd = useCallback(({ data }: { data: ScheduleSlot[] }) => {
    // Reorder with cascade: reassign times based on drag order
    let reordered = data.map((slot, i) => ({ ...slot, order_index: i }));
 
    if (cascadeMode === 'shift-up') {
      // Shift up: fill gap left by dragged item, push items up
      let prevEnd: string | null = null;
      reordered = reordered.map(slot => {
        if (!prevEnd) { prevEnd = slot.end_time; return slot; }
        // Calculate duration
        const [sH, sM] = slot.start_time.split(':').map(Number);
        const [eH, eM] = slot.end_time.split(':').map(Number);
        const dur = (eH * 60 + eM) - (sH * 60 + sM);
        // New start = prev end
        const [pH, pM] = prevEnd.split(':').map(Number);
        const newStartMins = pH * 60 + pM;
        const newEndMins = newStartMins + Math.abs(dur);
        const newStart = `${Math.floor(newStartMins / 60).toString().padStart(2,'0')}:${(newStartMins % 60).toString().padStart(2,'0')}`;
        const newEnd = `${Math.floor(newEndMins / 60).toString().padStart(2,'0')}:${(newEndMins % 60).toString().padStart(2,'0')}`;
        prevEnd = newEnd;
        return { ...slot, start_time: newStart, end_time: newEnd };
      });
    } else {
      // Shift down: push items below down
      let prevEnd: string | null = null;
      reordered = reordered.map(slot => {
        if (!prevEnd) { prevEnd = slot.end_time; return slot; }
        const [sH, sM] = slot.start_time.split(':').map(Number);
        const [eH, eM] = slot.end_time.split(':').map(Number);
        const dur = Math.abs((eH * 60 + eM) - (sH * 60 + sM));
        const [pH, pM] = prevEnd.split(':').map(Number);
        const prevEndMins = pH * 60 + pM;
        const slotStartMins = sH * 60 + sM;
        // Only shift if overlapping
        if (slotStartMins < prevEndMins) {
          const newStartMins = prevEndMins;
          const newEndMins = newStartMins + dur;
          const newStart = `${Math.floor(newStartMins/60).toString().padStart(2,'0')}:${(newStartMins%60).toString().padStart(2,'0')}`;
          const newEnd = `${Math.floor(newEndMins/60).toString().padStart(2,'0')}:${(newEndMins%60).toString().padStart(2,'0')}`;
          prevEnd = newEnd;
          return { ...slot, start_time: newStart, end_time: newEnd };
        }
        prevEnd = slot.end_time;
        return slot;
      });
    }
 
    setSlots(reordered);
    setHasChanges(true);
  }, [cascadeMode]);
 
  // Day change — check for existing tasks and warn
  const handleDayFilterChange = useCallback((days: string[], key: string) => {
    const hasExistingTasks = slots.some(s => s.days?.some(d => days.includes(d)));
    if (hasExistingTasks) {
      setPendingDayChange({ days, key });
      setShowOverwriteConfirm(true);
    } else {
      setSelectedDayFilter(days);
      setHasChanges(true);
    }
  }, [slots]);
 
  const confirmDayChange = () => {
    if (pendingDayChange) {
      setSelectedDayFilter(pendingDayChange.days);
      setHasChanges(true);
      setPendingDayChange(null);
    }
    setShowOverwriteConfirm(false);
  };
 
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
    setShowResetConfirm(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots/reset`, { method: 'POST' });
      const data = await res.json();
      setSlots(data.map((s: ScheduleSlot) => ({ ...s, days: s.days || ['mon','tue','wed','thu','fri','sat','sun'] })));
      setHasChanges(false);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
 
  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ScheduleSlot>) => (
    <ScaleDecorator>
      <SlotEditor
        slot={item}
        onEdit={() => setEditSlot(item)}
        onDelete={() => setDeleteSlot(item)}
        onOpenTimeEditor={() => setTimeEditorSlot(item)}
        onDrag={drag}
        isActive={isActive}
        isDark={isDark}
        colors={colors}
      />
    </ScaleDecorator>
  ), [isDark, colors]);
 
  const prefsHeight = prefsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });
 
  return (
    <View style={S.container}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
      <View style={[S.safeArea, { paddingTop: insets.top }]}>
 
        {/* ── Header ── */}
        <View style={S.header}>
          <Text style={[S.title, { color: colors.textPrimary }]}>Settings</Text>
          {/* Preferences toggle button */}
          <TouchableOpacity
            style={[S.prefsBtn, {
              backgroundColor: showPrefs ? colors.accentGlow : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
            }]}
            onPress={togglePrefs}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={showPrefs ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
 
        {/* ── Collapsible Preferences Panel ── */}
        <Animated.View style={[S.prefsWrapper, { height: prefsHeight, overflow: 'hidden' }]}>
          <View style={{ paddingHorizontal: SPACING.lg }}>
            <PreferencesPanel isDark={isDark} colors={colors} />
          </View>
        </Animated.View>
 
        {/* ── Fixed panels ── */}
        <View style={S.fixedPanels}>
          <DayWheelSelector
            selectedDays={selectedDayFilter}
            onSelectDays={handleDayFilterChange}
            isDark={isDark}
            colors={colors}
          />
        </View>
 
        {/* ── Activities ── */}
        <View style={S.activitiesSection}>
          <View style={S.activitiesHeader}>
            <Text style={[S.sectionTitle, { color: colors.textPrimary }]}>Activities</Text>
            <Text style={[S.sectionHint, { color: colors.textInactive }]}>Hold to drag</Text>
          </View>
 
          {loading ? (
            <View style={S.loadingContainer}>
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
              activationDistance={1}
            />
          )}
        </View>
 
        {/* ── Bottom actions ── */}
        <View style={[S.bottomActions, { backgroundColor: colors.card }, getCardShadow(isDark)]}>
          <TouchableOpacity
            style={[S.actionBtn, { backgroundColor: colors.surface }]}
            onPress={() => setShowResetConfirm(true)}
          >
            <Ionicons name="refresh" size={15} color={colors.textSecondary} />
            <Text style={[S.actionBtnText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
 
          <TouchableOpacity
            style={[S.addBtn, { backgroundColor: colors.surface }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={22} color={colors.accent} />
          </TouchableOpacity>
 
          <TouchableOpacity
            style={[S.actionBtn, { backgroundColor: hasChanges ? colors.accent : colors.surface }]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={15} color={hasChanges ? '#fff' : colors.textInactive} />
                <Text style={[S.actionBtnText, { color: hasChanges ? '#fff' : colors.textInactive }]}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
 
      {/* ── Modals ── */}
      <TaskEditPanel
        visible={!!editSlot}
        onClose={() => setEditSlot(null)}
        onSave={updates => { if (editSlot) handleUpdateSlot(editSlot.id, updates); }}
        initialLabel={editSlot?.label || ''}
        initialIcon={editSlot?.icon || 'time'}
        initialNotes={editSlot?.notes || ''}
        isDark={isDark}
        colors={colors}
      />
 
      <TimeEditModal
        visible={!!timeEditorSlot}
        onClose={() => setTimeEditorSlot(null)}
        onSave={(s, e) => { if (timeEditorSlot) handleUpdateSlot(timeEditorSlot.id, { start_time: s, end_time: e }); setTimeEditorSlot(null); }}
        initialStartTime={timeEditorSlot?.start_time || '09:00'}
        initialEndTime={timeEditorSlot?.end_time || '10:00'}
        taskLabel={timeEditorSlot?.label}
        isDark={isDark}
        colors={colors}
      />
 
      <TaskEditPanel
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={updates => handleAddSlot(updates)}
        initialLabel=""
        initialIcon="time"
        initialNotes=""
        isDark={isDark}
        colors={colors}
      />
 
      <ConfirmModal
        visible={!!deleteSlot}
        onClose={() => setDeleteSlot(null)}
        onConfirm={() => deleteSlot && handleDeleteSlot(deleteSlot.id)}
        title="Delete Activity"
        message={`Are you sure you want to delete "${deleteSlot?.label}"?`}
        confirmText="Delete"
        isDanger
        isDark={isDark}
        colors={colors}
      />
 
      <ConfirmModal
        visible={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title="Reset Schedule"
        message="This will restore the default schedule and remove all your customizations."
        confirmText="Reset"
        isDanger
        isDark={isDark}
        colors={colors}
      />
 
      {/* Day overwrite warning */}
      <ConfirmModal
        visible={showOverwriteConfirm}
        onClose={() => { setShowOverwriteConfirm(false); setPendingDayChange(null); }}
        onConfirm={confirmDayChange}
        title="Existing Tasks"
        message={`Some activities are already scheduled for ${pendingDayChange ? DAY_OPTIONS.find(o => o.key === pendingDayChange.key)?.label : 'these days'}. You can keep or overwrite them.`}
        confirmText="Overwrite"
        cancelText="Keep"
        isDanger={false}
        isDark={isDark}
        colors={colors}
      />
    </View>
  );
}
 
const S = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  prefsBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
 
  // Preferences panel
  prefsWrapper: { overflow: 'hidden' },
  prefsPanel: { borderRadius: 14, padding: 14, marginBottom: SPACING.sm, borderWidth: 1 },
  prefsPanelTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefLabel: { fontSize: 13, fontWeight: '500' },
  cascadePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cascadePillText: { fontSize: 12, fontWeight: '600' },
  prefDivider: { height: 1, marginBottom: 10 },
  resetDangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 10 },
  resetDangerText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
 
  // Switch
  switch: { width: 46, height: 22, borderRadius: 11, flexDirection: 'row', alignItems: 'center' },
  switchThumb: { width: 18, height: 18, borderRadius: 9 },
 
  // Day wheel
  fixedPanels: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  dayCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: CARD_PADDING.horizontal, height: DAY_WHEEL_ITEM_HEIGHT * 3 },
  dayLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginRight: SPACING.md },
  dayWheelWrapper: { height: DAY_WHEEL_ITEM_HEIGHT * 3, flex: 1, overflow: 'hidden', position: 'relative' },
  daySelIndicator: { position: 'absolute', top: DAY_WHEEL_ITEM_HEIGHT, left: 0, right: 0, height: DAY_WHEEL_ITEM_HEIGHT, borderRadius: 8, zIndex: -1 },
  dayItem: { justifyContent: 'center', alignItems: 'center' },
 
  // Activities
  activitiesSection: { flex: 1, paddingHorizontal: SPACING.lg },
  activitiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600' },
  sectionHint: { fontSize: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: SPACING.sm },
 
  // Slot item
  slotItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: CARD_PADDING.vertical, marginBottom: SPACING.sm },
  dragHandle: { padding: 6, marginRight: 2 },
  slotIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  slotContent: { flex: 1 },
  slotLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  slotTime: { fontSize: 11 },
  slotDur: { fontSize: 10, fontWeight: '500' },
  slotAction: { padding: 6 },
 
  // Bottom
  bottomActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: 10, gap: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
 