import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme, getCardShadow, SPACING, CARD_PADDING } from '../../context/ThemeContext';
import { TimeEditModal } from '../../components/TimeEditModal';
import { ConfirmModal, CustomModal } from '../../components/CustomModal';
import { TaskEditPanel } from '../../components/TaskEditPanel';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout constants
const APPEARANCE_PANEL_HEIGHT = 50;
const DAY_PANEL_HEIGHT = APPEARANCE_PANEL_HEIGHT * 1.7;
const DAY_WHEEL_ITEM_HEIGHT = 30;

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

// Day options
const DAY_OPTIONS = [
  { key: 'weekdays', label: 'Weekdays', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  { key: 'weekends', label: 'Weekends', days: ['sat', 'sun'] },
  { key: 'mon', label: 'Monday', days: ['mon'] },
  { key: 'tue', label: 'Tuesday', days: ['tue'] },
  { key: 'wed', label: 'Wednesday', days: ['wed'] },
  { key: 'thu', label: 'Thursday', days: ['thu'] },
  { key: 'fri', label: 'Friday', days: ['fri'] },
  { key: 'sat', label: 'Saturday', days: ['sat'] },
  { key: 'sun', label: 'Sunday', days: ['sun'] },
];

// Icon options
const ICON_OPTIONS = [
  'restaurant', 'sunny', 'briefcase', 'cafe', 'trending-up', 'book', 
  'fitness', 'fast-food', 'analytics', 'code', 'moon', 'bed', 
  'time', 'heart', 'musical-notes', 'game-controller', 'car', 'home',
  'pencil', 'school', 'walk', 'water', 'leaf', 'medkit',
];

// Icon mapping
const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'restaurant': 'restaurant-outline', 'sunny': 'sunny-outline', 'briefcase': 'briefcase-outline',
    'cafe': 'cafe-outline', 'trending-up': 'trending-up-outline', 'book': 'book-outline',
    'fitness': 'fitness-outline', 'fast-food': 'fast-food-outline', 'analytics': 'analytics-outline',
    'code': 'code-outline', 'moon': 'moon-outline', 'bed': 'bed-outline', 'time': 'time-outline',
    'heart': 'heart-outline', 'musical-notes': 'musical-notes-outline', 
    'game-controller': 'game-controller-outline', 'car': 'car-outline', 'home': 'home-outline',
    'pencil': 'pencil-outline', 'school': 'school-outline', 'walk': 'walk-outline',
    'water': 'water-outline', 'leaf': 'leaf-outline', 'medkit': 'medkit-outline',
  };
  return iconMap[iconName] || 'ellipse-outline';
};

// =============================================================================
// DAY WHEEL SELECTOR - Center selection (scroll to select)
// =============================================================================
const DayWheelSelector = ({
  selectedDays, onSelectDays, isDark, colors,
}: {
  selectedDays: string[];
  onSelectDays: (days: string[], key: string) => void;
  isDark: boolean;
  colors: any;
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedIndex, setSelectedIndex] = useState(() => {
    for (let i = 0; i < DAY_OPTIONS.length; i++) {
      const opt = DAY_OPTIONS[i];
      if (opt.days.length === selectedDays.length && opt.days.every(d => selectedDays.includes(d))) {
        return i;
      }
    }
    return 0;
  });

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: selectedIndex * DAY_WHEEL_ITEM_HEIGHT, animated: false });
    }, 100);
  }, []);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / DAY_WHEEL_ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, DAY_OPTIONS.length - 1));
    
    if (clampedIndex !== selectedIndex) {
      setSelectedIndex(clampedIndex);
      onSelectDays(DAY_OPTIONS[clampedIndex].days, DAY_OPTIONS[clampedIndex].key);
    }
    scrollViewRef.current?.scrollTo({ y: clampedIndex * DAY_WHEEL_ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={[styles.dayWheelContainer, { backgroundColor: colors.card, height: DAY_PANEL_HEIGHT }, getCardShadow(isDark)]}>
      <Text style={[styles.dayWheelLabel, { color: colors.textInactive }]}>DAY</Text>
      <View style={styles.wheelWrapper}>
        <View style={[styles.wheelSelectionIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]} />
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={DAY_WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{ paddingVertical: DAY_WHEEL_ITEM_HEIGHT }}
        >
          {DAY_OPTIONS.map((option, index) => {
            const isSelected = index === selectedIndex;
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.55 : 0.3;
            return (
              <View key={option.key} style={[styles.dayWheelItem, { height: DAY_WHEEL_ITEM_HEIGHT }]}>
                <Text style={[styles.dayWheelItemText, {
                  color: isSelected ? colors.accent : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                  opacity,
                  fontSize: isSelected ? 14 : 12,
                }]}>
                  {option.label}
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
// ICON PICKER MODAL - Dark themed
// =============================================================================
const IconPickerModal = ({
  visible, onClose, onSelect, currentIcon, isDark, colors,
}: {
  visible: boolean; onClose: () => void; onSelect: (icon: string) => void;
  currentIcon: string; isDark: boolean; colors: any;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={[styles.iconPickerModal, { backgroundColor: colors.card }, getCardShadow(isDark)]} onPress={e => e.stopPropagation()}>
        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Icon</Text>
        <View style={[styles.modalDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.iconGrid}>
          {ICON_OPTIONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[
                styles.iconOption, 
                { backgroundColor: colors.surface },
                currentIcon === icon && { backgroundColor: colors.accentGlow, borderColor: colors.accent, borderWidth: 1 },
              ]}
              onPress={() => { onSelect(icon); onClose(); }}
            >
              <Ionicons name={getIconName(icon)} size={20} color={currentIcon === icon ? colors.accent : colors.iconInactive} />
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

// =============================================================================
// ACTIVITY EDIT MODAL - For editing name/icon/notes
// =============================================================================
const ActivityEditModal = ({
  visible, onClose, onSave, slot, isDark, colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (updates: Partial<ScheduleSlot>) => void;
  slot: ScheduleSlot | null;
  isDark: boolean;
  colors: any;
}) => {
  const [name, setName] = useState(slot?.label || '');
  const [icon, setIcon] = useState(slot?.icon || 'time');
  const [notes, setNotes] = useState(slot?.notes || '');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (slot) {
      setName(slot.label);
      setIcon(slot.icon);
      setNotes(slot.notes || '');
    }
  }, [slot]);

  const handleSave = () => {
    onSave({ label: name, icon, notes });
    Keyboard.dismiss();
    onClose();
  };

  if (!slot) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <Pressable style={[styles.editModal, { backgroundColor: colors.card }, getCardShadow(isDark)]} onPress={e => e.stopPropagation()}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Activity</Text>
          <View style={[styles.modalDivider, { backgroundColor: colors.divider }]} />
          
          {/* Icon selector */}
          <View style={styles.editRow}>
            <Text style={[styles.editLabel, { color: colors.textInactive }]}>ICON</Text>
            <TouchableOpacity 
              style={[styles.iconSelectButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowIconPicker(true)}
            >
              <Ionicons name={getIconName(icon)} size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Name input */}
          <View style={styles.editRow}>
            <Text style={[styles.editLabel, { color: colors.textInactive }]}>NAME</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="Activity name"
              placeholderTextColor={colors.textInactive}
            />
          </View>

          {/* Notes input */}
          <View style={styles.editRow}>
            <Text style={[styles.editLabel, { color: colors.textInactive }]}>NOTES</Text>
            <TextInput
              style={[styles.editInput, styles.notesInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              placeholderTextColor={colors.textInactive}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Buttons */}
          <View style={styles.editButtons}>
            <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.surface }]} onPress={onClose}>
              <Text style={[styles.editButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.accent }]} onPress={handleSave}>
              <Text style={[styles.editButtonText, { color: '#fff' }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>

      {/* Nested Icon Picker */}
      <IconPickerModal
        visible={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={setIcon}
        currentIcon={icon}
        isDark={isDark}
        colors={colors}
      />
    </Modal>
  );
};

// =============================================================================
// ADD ACTIVITY MODAL - Full form
// =============================================================================
const AddActivityModal = ({
  visible, onClose, onAdd, isDark, colors, selectedDays,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (slot: Partial<ScheduleSlot>) => void;
  isDark: boolean;
  colors: any;
  selectedDays: string[];
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('time');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const resetForm = () => {
    setName('');
    setIcon('time');
    setStartTime('09:00');
    setEndTime('10:00');
    setNotes('');
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      label: name,
      icon,
      start_time: startTime,
      end_time: endTime,
      notes,
      days: selectedDays,
    });
    Keyboard.dismiss();
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <Pressable style={[styles.addModal, { backgroundColor: colors.card }, getCardShadow(isDark)]} onPress={e => e.stopPropagation()}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Activity</Text>
          <View style={[styles.modalDivider, { backgroundColor: colors.divider }]} />
          
          {/* Icon & Name row */}
          <View style={styles.addTopRow}>
            <TouchableOpacity 
              style={[styles.iconSelectLarge, { backgroundColor: colors.surface }]}
              onPress={() => setShowIconPicker(true)}
            >
              <Ionicons name={getIconName(icon)} size={26} color={colors.accent} />
            </TouchableOpacity>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="Activity name"
              placeholderTextColor={colors.textInactive}
            />
          </View>

          {/* Time row */}
          <TouchableOpacity 
            style={[styles.timeRow, { backgroundColor: colors.surface }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={18} color={colors.textInactive} />
            <Text style={[styles.timeText, { color: colors.textPrimary }]}>{startTime} — {endTime}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textInactive} />
          </TouchableOpacity>

          {/* Notes */}
          <TextInput
            style={[styles.notesInputFull, { backgroundColor: colors.surface, color: colors.textPrimary }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes (optional)"
            placeholderTextColor={colors.textInactive}
            multiline
            numberOfLines={2}
          />

          {/* Buttons */}
          <View style={styles.addButtons}>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.surface }]} onPress={onClose}>
              <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: name.trim() ? colors.accent : colors.surface }]} 
              onPress={handleAdd}
              disabled={!name.trim()}
            >
              <Text style={[styles.addButtonText, { color: name.trim() ? '#fff' : colors.textInactive }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>

      <IconPickerModal visible={showIconPicker} onClose={() => setShowIconPicker(false)} onSelect={setIcon} currentIcon={icon} isDark={isDark} colors={colors} />
      <TimeEditModal visible={showTimePicker} onClose={() => setShowTimePicker(false)} onSave={(s, e) => { setStartTime(s); setEndTime(e); setShowTimePicker(false); }} initialStartTime={startTime} initialEndTime={endTime} taskLabel={name || 'New Activity'} isDark={isDark} colors={colors} />
    </Modal>
  );
};

// =============================================================================
// NEUMORPHIC SWITCH
// =============================================================================
const NeumorphicSwitch = ({ value, onValueChange, isDark, colors }: {
  value: boolean; onValueChange: (value: boolean) => void; isDark: boolean; colors: any;
}) => (
  <Pressable style={[styles.neumorphicSwitch, { backgroundColor: value ? colors.accent : colors.surface }]} onPress={() => onValueChange(!value)}>
    <View style={[styles.switchThumb, { backgroundColor: colors.card }, value ? { marginLeft: 24 } : { marginLeft: 2 }]} />
  </Pressable>
);

// =============================================================================
// SLOT EDITOR - Individual activity item
// =============================================================================
const SlotEditor = ({
  slot, onEdit, onDelete, onOpenTimeEditor, onDrag, isActive, isDark, colors,
}: {
  slot: ScheduleSlot;
  onEdit: () => void;
  onDelete: () => void;
  onOpenTimeEditor: () => void;
  onDrag: () => void;
  isActive: boolean;
  isDark: boolean;
  colors: any;
}) => {
  const calculateDuration = (start: string, end: string): string => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  return (
    <View style={[styles.slotItem, { backgroundColor: colors.card }, getCardShadow(isDark), isActive && { opacity: 0.9 }]}>
      {/* Drag handle */}
      <TouchableOpacity style={styles.dragHandle} onLongPress={onDrag} disabled={isActive} delayLongPress={150}>
        <Ionicons name="menu" size={16} color={isActive ? colors.accent : colors.iconInactive} />
      </TouchableOpacity>

      {/* Icon - tap to edit activity */}
      <TouchableOpacity style={[styles.iconSelector, { backgroundColor: colors.surface }]} onPress={onEdit}>
        <Ionicons name={getIconName(slot.icon)} size={18} color={colors.accent} />
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity style={styles.slotContent} onPress={onEdit}>
        <Text style={[styles.slotLabel, { color: colors.textPrimary }]} numberOfLines={1}>{slot.label}</Text>
        <View style={styles.timeRow2}>
          <Text style={[styles.timeText2, { color: colors.textInactive }]}>{slot.start_time} — {slot.end_time}</Text>
          <Text style={[styles.durationText, { color: colors.textInactive }]}>{calculateDuration(slot.start_time, slot.end_time)}</Text>
        </View>
      </TouchableOpacity>

      {/* Time edit button */}
      <TouchableOpacity style={styles.timeButton} onPress={onOpenTimeEditor}>
        <Ionicons name="time-outline" size={16} color={colors.textInactive} />
      </TouchableOpacity>

      {/* Delete button - dimmed */}
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Ionicons name="trash-outline" size={14} color={colors.textInactive} />
      </TouchableOpacity>
    </View>
  );
};

// =============================================================================
// MAIN SETTINGS SCREEN
// =============================================================================
export default function SettingsScreen() {
  const { isDark, colors, toggleTheme, weekStartsOnMonday, setWeekStartsOnMonday } = useTheme();
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  
  // Modal states
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [timeEditorSlot, setTimeEditorSlot] = useState<ScheduleSlot | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteSlot, setDeleteSlot] = useState<ScheduleSlot | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots`);
      const data = await res.json();
      setSlots(data.map((slot: ScheduleSlot) => ({
        ...slot, days: slot.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      })));
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleUpdateSlot = useCallback((id: string, updates: Partial<ScheduleSlot>) => {
    setSlots(prev => prev.map(slot => slot.id === id ? { ...slot, ...updates } : slot));
    setHasChanges(true);
  }, []);

  const handleAddSlot = useCallback((newSlot: Partial<ScheduleSlot>) => {
    const slot: ScheduleSlot = {
      id: `slot-${Date.now()}`,
      label: newSlot.label || 'New Activity',
      icon: newSlot.icon || 'time',
      start_time: newSlot.start_time || '09:00',
      end_time: newSlot.end_time || '10:00',
      group: 'general',
      order_index: slots.length,
      days: newSlot.days || selectedDayFilter,
      notes: newSlot.notes,
    };
    setSlots(prev => [...prev, slot]);
    setHasChanges(true);
  }, [slots.length, selectedDayFilter]);

  const handleDeleteSlot = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
    setHasChanges(true);
    setDeleteSlot(null);
  }, []);

  const handleDragEnd = useCallback(({ data }: { data: ScheduleSlot[] }) => {
    setSlots(data.map((slot, i) => ({ ...slot, order_index: i })));
    setHasChanges(true);
  }, []);

  const handleDayFilterChange = useCallback((days: string[], key: string) => {
    setSelectedDayFilter(days);
    setHasChanges(true);
  }, []);

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
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setShowResetConfirm(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots/reset`, { method: 'POST' });
      const data = await res.json();
      setSlots(data.map((s: ScheduleSlot) => ({ ...s, days: s.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] })));
      setHasChanges(false);
    } catch (error) {
      console.error('Reset error:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
      
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        </View>

        {/* FIXED Panels */}
        <View style={styles.fixedPanels}>
          {/* Appearance */}
          <View style={[styles.themeCard, { backgroundColor: colors.card, height: APPEARANCE_PANEL_HEIGHT }, getCardShadow(isDark)]}>
            <View style={styles.themeContent}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} />
              <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            </View>
            <NeumorphicSwitch value={!isDark} onValueChange={() => toggleTheme()} isDark={isDark} colors={colors} />
          </View>

          {/* Week Start Setting */}
          <View style={[styles.themeCard, { backgroundColor: colors.card, height: APPEARANCE_PANEL_HEIGHT }, getCardShadow(isDark)]}>
            <View style={styles.themeContent}>
              <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>Week starts {weekStartsOnMonday ? 'Mon' : 'Sun'}</Text>
            </View>
            <NeumorphicSwitch value={weekStartsOnMonday} onValueChange={() => setWeekStartsOnMonday(!weekStartsOnMonday)} isDark={isDark} colors={colors} />
          </View>

          {/* Day selector */}
          <DayWheelSelector selectedDays={selectedDayFilter} onSelectDays={handleDayFilterChange} isDark={isDark} colors={colors} />
        </View>

        {/* Activities */}
        <View style={styles.activitiesSection}>
          <View style={styles.activitiesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Activities</Text>
            <Text style={[styles.sectionHint, { color: colors.textInactive }]}>Hold to drag</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <DraggableFlatList
              data={slots}
              keyExtractor={(item) => item.id}
              onDragEnd={handleDragEnd}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              activationDistance={10}
            />
          )}
        </View>

        {/* Bottom Actions - 3 buttons: Reset | + | Save */}
        <View style={[styles.bottomActions, { backgroundColor: colors.card }, getCardShadow(isDark)]}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => setShowResetConfirm(true)}>
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.surface }]} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={22} color={colors.accent} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: hasChanges ? colors.accent : colors.surface }]} 
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color={hasChanges ? '#fff' : colors.textInactive} />
                <Text style={[styles.actionBtnText, { color: hasChanges ? '#fff' : colors.textInactive }]}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <TaskEditPanel
        visible={!!editSlot}
        onClose={() => setEditSlot(null)}
        onSave={(updates) => { if (editSlot) handleUpdateSlot(editSlot.id, updates); }}
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
        onSave={(updates) => handleAddSlot(updates.label, updates.icon, updates.notes)}
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
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  
  fixedPanels: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.section },
  
  themeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: CARD_PADDING.horizontal, borderRadius: 12, marginBottom: SPACING.sm },
  themeContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  themeLabel: { fontSize: 14, fontWeight: '600' },
  neumorphicSwitch: { width: 46, height: 22, borderRadius: 11, flexDirection: 'row', alignItems: 'center' },
  switchThumb: { width: 18, height: 18, borderRadius: 9 },
  
  dayWheelContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: CARD_PADDING.horizontal },
  dayWheelLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginRight: SPACING.md },
  wheelWrapper: { height: DAY_WHEEL_ITEM_HEIGHT * 3, flex: 1, overflow: 'hidden', position: 'relative' },
  wheelSelectionIndicator: { position: 'absolute', top: DAY_WHEEL_ITEM_HEIGHT, left: 0, right: 0, height: DAY_WHEEL_ITEM_HEIGHT, borderRadius: 6, zIndex: -1 },
  dayWheelItem: { justifyContent: 'center', alignItems: 'center' },
  dayWheelItemText: {},
  
  activitiesSection: { flex: 1, paddingHorizontal: SPACING.lg },
  activitiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600' },
  sectionHint: { fontSize: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: SPACING.sm },
  
  slotItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: CARD_PADDING.vertical, marginBottom: SPACING.sm },
  dragHandle: { padding: 6, marginRight: 4 },
  iconSelector: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  slotContent: { flex: 1 },
  slotLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  timeRow2: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  timeText2: { fontSize: 11 },
  durationText: { fontSize: 10, fontWeight: '500' },
  timeButton: { padding: 6 },
  deleteButton: { padding: 6, marginLeft: 2 },
  
  bottomActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: 10, gap: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', paddingVertical: SPACING.md },
  modalDivider: { height: 1, marginHorizontal: SPACING.md },
  
  iconPickerModal: { width: SCREEN_WIDTH - 40, maxWidth: 320, borderRadius: 14 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md },
  iconOption: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  editModal: { width: SCREEN_WIDTH - 40, maxWidth: 340, borderRadius: 14 },
  editRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  editLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, width: 50 },
  editInput: { flex: 1, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, fontSize: 14 },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  iconSelectButton: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editButtons: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  editButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: 10, alignItems: 'center' },
  editButtonText: { fontSize: 14, fontWeight: '600' },
  
  addModal: { width: SCREEN_WIDTH - 40, maxWidth: 340, borderRadius: 14, padding: SPACING.md },
  addTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  iconSelectLarge: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nameInput: { flex: 1, borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, fontSize: 15 },
  timeRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  timeText: { flex: 1, fontSize: 14 },
  notesInputFull: { borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 14, minHeight: 50, textAlignVertical: 'top', marginBottom: SPACING.sm },
  addButtons: { flexDirection: 'row', gap: SPACING.sm },
  addButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: 10, alignItems: 'center' },
  addButtonText: { fontSize: 14, fontWeight: '600' },
});
