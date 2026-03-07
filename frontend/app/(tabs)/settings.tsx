import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme } from '../../context/ThemeContext';
import { TimeEditModal } from '../../components/TimeEditModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout constants
const APPEARANCE_PANEL_HEIGHT = 52;
const DAY_PANEL_HEIGHT = APPEARANCE_PANEL_HEIGHT * 1.8; // Less than 2x

interface ScheduleSlot {
  id: string;
  label: string;
  icon: string;
  start_time: string;
  end_time: string;
  group: string;
  order_index: number;
  days: string[];
}

// Day options for the wheel selector
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

// Icon options for picker
const ICON_OPTIONS = [
  { name: 'restaurant' }, { name: 'sunny' }, { name: 'briefcase' }, { name: 'cafe' },
  { name: 'trending-up' }, { name: 'book' }, { name: 'fitness' }, { name: 'fast-food' },
  { name: 'analytics' }, { name: 'settings' }, { name: 'code' }, { name: 'moon' },
  { name: 'bed' }, { name: 'clock' }, { name: 'heart' }, { name: 'musical-notes' },
  { name: 'game-controller' }, { name: 'car' },
];

// Icon mapping
const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'restaurant': 'restaurant-outline', 'sunny': 'sunny-outline', 'briefcase': 'briefcase-outline',
    'cafe': 'cafe-outline', 'trending-up': 'trending-up-outline', 'book': 'book-outline',
    'fitness': 'fitness-outline', 'fast-food': 'fast-food-outline', 'analytics': 'analytics-outline',
    'settings': 'settings-outline', 'code': 'code-outline', 'moon': 'moon-outline',
    'bed': 'bed-outline', 'clock': 'time-outline', 'heart': 'heart-outline',
    'musical-notes': 'musical-notes-outline', 'game-controller': 'game-controller-outline', 'car': 'car-outline',
  };
  return iconMap[iconName] || 'ellipse-outline';
};

// Compact Day Wheel - Center selection (no tap needed)
const DAY_WHEEL_ITEM_HEIGHT = 32;

const DayWheelSelector = ({
  selectedDays,
  onSelectDays,
  isDark,
  colors,
}: {
  selectedDays: string[];
  onSelectDays: (days: string[], key: string) => void;
  isDark: boolean;
  colors: any;
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  
  const getCurrentIndex = () => {
    for (let i = 0; i < DAY_OPTIONS.length; i++) {
      const opt = DAY_OPTIONS[i];
      if (opt.days.length === selectedDays.length && 
          opt.days.every(d => selectedDays.includes(d))) {
        return i;
      }
    }
    return 0;
  };

  const [selectedIndex, setSelectedIndex] = useState(getCurrentIndex());

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: selectedIndex * DAY_WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
  }, []);

  // Center selection - auto select on scroll end
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / DAY_WHEEL_ITEM_HEIGHT);
    if (index >= 0 && index < DAY_OPTIONS.length) {
      setSelectedIndex(index);
      onSelectDays(DAY_OPTIONS[index].days, DAY_OPTIONS[index].key);
    }
    scrollViewRef.current?.scrollTo({
      y: index * DAY_WHEEL_ITEM_HEIGHT,
      animated: true,
    });
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / DAY_WHEEL_ITEM_HEIGHT);
    if (index >= 0 && index < DAY_OPTIONS.length) {
      scrollViewRef.current?.scrollTo({
        y: index * DAY_WHEEL_ITEM_HEIGHT,
        animated: true,
      });
      if (index !== selectedIndex) {
        setSelectedIndex(index);
        onSelectDays(DAY_OPTIONS[index].days, DAY_OPTIONS[index].key);
      }
    }
  };

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  };

  return (
    <View style={[styles.dayWheelContainer, { backgroundColor: colors.card, height: DAY_PANEL_HEIGHT }, cardShadow]}>
      <Text style={[styles.dayWheelLabel, { color: colors.textSecondary }]}>DAY</Text>
      <View style={styles.wheelWrapper}>
        <View style={[
          styles.wheelSelectionIndicator,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} />
        <ScrollView
          ref={scrollViewRef}
          style={styles.dayWheel}
          showsVerticalScrollIndicator={false}
          snapToInterval={DAY_WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollEndDrag={handleScrollEndDrag}
          contentContainerStyle={{ paddingVertical: DAY_WHEEL_ITEM_HEIGHT }}
        >
          {DAY_OPTIONS.map((option, index) => {
            const isSelected = index === selectedIndex;
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.35 : 0.15;

            return (
              <View
                key={option.key}
                style={[styles.dayWheelItem, { height: DAY_WHEEL_ITEM_HEIGHT }]}
              >
                <Text style={[
                  styles.dayWheelItemText,
                  {
                    color: isSelected ? colors.accent : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '400',
                    opacity,
                    fontSize: isSelected ? 15 : 13,
                  }
                ]}>
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

// Icon Picker Modal
const IconPickerModal = ({
  visible, onClose, onSelect, currentIcon, isDark, colors,
}: {
  visible: boolean; onClose: () => void; onSelect: (icon: string) => void;
  currentIcon: string; isDark: boolean; colors: any;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={[styles.iconPickerModal, { backgroundColor: colors.card }]}>
        <Text style={[styles.iconPickerTitle, { color: colors.textPrimary }]}>Select Icon</Text>
        <View style={styles.iconGrid}>
          {ICON_OPTIONS.map((icon) => (
            <TouchableOpacity
              key={icon.name}
              style={[
                styles.iconOptionModal, { backgroundColor: colors.surface },
                currentIcon === icon.name && { backgroundColor: colors.accent },
              ]}
              onPress={() => { onSelect(icon.name); onClose(); }}
            >
              <Ionicons name={getIconName(icon.name)} size={22} color={currentIcon === icon.name ? '#fff' : colors.iconInactive} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Pressable>
  </Modal>
);

// Neumorphic Toggle Switch
const NeumorphicSwitch = ({ value, onValueChange, isDark, colors }: {
  value: boolean; onValueChange: (value: boolean) => void; isDark: boolean; colors: any;
}) => (
  <Pressable
    style={[styles.neumorphicSwitch, { backgroundColor: value ? colors.accent : colors.surface }]}
    onPress={() => onValueChange(!value)}
  >
    <View style={[styles.switchThumb, { backgroundColor: colors.card }, value ? { marginLeft: 24 } : { marginLeft: 2 }]} />
  </Pressable>
);

// Slot Editor Component
const SlotEditor = ({
  slot, onUpdate, onDelete, onOpenIconPicker, onOpenTimeEditor, dragProps, isDark, colors,
}: {
  slot: ScheduleSlot; onUpdate: (id: string, updates: Partial<ScheduleSlot>) => void;
  onDelete: (id: string) => void; onOpenIconPicker: (slotId: string) => void;
  onOpenTimeEditor: (slotId: string) => void; dragProps: any; isDark: boolean; colors: any;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  };

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
    <View style={[styles.slotItem, { backgroundColor: colors.card }, cardShadow]}>
      <TouchableOpacity style={styles.dragHandle} {...dragProps}>
        <Ionicons name="menu" size={18} color={colors.iconInactive} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.iconSelector, { backgroundColor: colors.surface }]} onPress={() => onOpenIconPicker(slot.id)}>
        <Ionicons name={getIconName(slot.icon)} size={18} color={colors.accent} />
      </TouchableOpacity>

      <View style={styles.slotContent}>
        {isEditing ? (
          <TextInput
            style={[styles.labelInput, { color: colors.textPrimary, borderBottomColor: colors.accent }]}
            value={slot.label}
            onChangeText={(text) => onUpdate(slot.id, { label: text })}
            onBlur={() => setIsEditing(false)}
            autoFocus
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={[styles.slotLabel, { color: colors.textPrimary }]}>{slot.label}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.timeDisplayButton, { backgroundColor: colors.surface }]} onPress={() => onOpenTimeEditor(slot.id)}>
          <Ionicons name="time-outline" size={12} color={colors.accent} style={styles.timeIcon} />
          <Text style={[styles.timeDisplayText, { color: colors.textPrimary }]}>{slot.start_time} — {slot.end_time}</Text>
          <View style={[styles.durationBadge, { backgroundColor: isDark ? '#1a2230' : '#e8e2d8' }]}>
            <Text style={[styles.durationText, { color: colors.accent }]}>{calculateDuration(slot.start_time, slot.end_time)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(slot.id)}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
};

export default function SettingsScreen() {
  const { isDark, colors, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [iconPickerSlotId, setIconPickerSlotId] = useState<string | null>(null);
  const [timeEditorSlotId, setTimeEditorSlotId] = useState<string | null>(null);

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

  const handleUpdateSlot = (id: string, updates: Partial<ScheduleSlot>) => {
    setSlots(prev => prev.map(slot => slot.id === id ? { ...slot, ...updates } : slot));
    setHasChanges(true);
  };

  const handleDeleteSlot = (id: string) => {
    Alert.alert('Delete Activity', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { setSlots(prev => prev.filter(s => s.id !== id)); setHasChanges(true); } },
    ]);
  };

  const handleAddSlot = () => {
    setSlots(prev => [...prev, {
      id: `slot-${Date.now()}`, label: 'New Activity', icon: 'clock',
      start_time: '09:00', end_time: '10:00', group: 'general',
      order_index: prev.length, days: selectedDayFilter,
    }]);
    setHasChanges(true);
  };

  const handleDragEnd = ({ data }: { data: ScheduleSlot[] }) => {
    setSlots(data.map((slot, i) => ({ ...slot, order_index: i })));
    setHasChanges(true);
  };

  const handleDayFilterChange = (days: string[]) => {
    setSelectedDayFilter(days);
    // Update all slots to use the new day filter
    setSlots(prev => prev.map(slot => ({ ...slot, days })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots/bulk/update`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      if (res.ok) { setHasChanges(false); Alert.alert('Saved', 'Schedule saved successfully.'); }
      else throw new Error();
    } catch { Alert.alert('Error', 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    Alert.alert('Reset Schedule', 'Reset to default?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/schedule-slots/reset`, { method: 'POST' });
            const data = await res.json();
            setSlots(data.map((s: ScheduleSlot) => ({ ...s, days: s.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] })));
            setHasChanges(false);
          } catch { Alert.alert('Error', 'Failed to reset.'); }
          finally { setLoading(false); }
        },
      },
    ]);
  };

  const currentSlotForIcon = iconPickerSlotId ? slots.find(s => s.id === iconPickerSlotId) : null;
  const currentSlotForTime = timeEditorSlotId ? slots.find(s => s.id === timeEditorSlotId) : null;

  const cardShadow = { shadowColor: isDark ? '#000' : '#999', shadowOffset: { width: 3, height: 3 }, shadowOpacity: isDark ? 0.4 : 0.08, shadowRadius: 8, elevation: 4 };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ScheduleSlot>) => (
    <ScaleDecorator>
      <SlotEditor
        slot={item} onUpdate={handleUpdateSlot} onDelete={handleDeleteSlot}
        onOpenIconPicker={setIconPickerSlotId} onOpenTimeEditor={setTimeEditorSlotId}
        dragProps={{ onLongPress: drag, disabled: isActive }} isDark={isDark} colors={colors}
      />
    </ScaleDecorator>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
      
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header - Fixed */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        </View>

        {/* Fixed Panels Section */}
        <View style={styles.fixedPanels}>
          {/* Appearance Mode Panel */}
          <View style={[styles.themeToggleCard, { backgroundColor: colors.card, height: APPEARANCE_PANEL_HEIGHT }, cardShadow]}>
            <View style={styles.themeToggleContent}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.accent} />
              <Text style={[styles.themeToggleLabel, { color: colors.textPrimary }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <NeumorphicSwitch value={!isDark} onValueChange={() => toggleTheme()} isDark={isDark} colors={colors} />
          </View>

          {/* Day Panel - Compact with center selection */}
          <DayWheelSelector 
            selectedDays={selectedDayFilter} 
            onSelectDays={handleDayFilterChange} 
            isDark={isDark} 
            colors={colors} 
          />
        </View>

        {/* Activities Section - Scrollable */}
        <View style={styles.activitiesSection}>
          <View style={styles.activitiesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Activities</Text>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Hold & drag to reorder</Text>
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
              ListFooterComponent={
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.surface }]} 
                  onPress={handleAddSlot}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                  <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>Add Activity</Text>
                </TouchableOpacity>
              }
            />
          )}
        </View>

        {/* Fixed Action Buttons at Bottom */}
        <View style={[styles.actionButtons, { backgroundColor: colors.bgGradient[2] }]}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }, cardShadow]} onPress={handleReset}>
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: hasChanges ? colors.accent : colors.surface }, cardShadow]}
            onPress={handleSave} disabled={!hasChanges || saving}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="checkmark" size={16} color={hasChanges ? '#fff' : colors.textSecondary} />
                <Text style={[styles.actionButtonText, { color: hasChanges ? '#fff' : colors.textSecondary }]}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <IconPickerModal visible={!!iconPickerSlotId} onClose={() => setIconPickerSlotId(null)} onSelect={(icon) => { if (iconPickerSlotId) handleUpdateSlot(iconPickerSlotId, { icon }); setIconPickerSlotId(null); }} currentIcon={currentSlotForIcon?.icon || 'clock'} isDark={isDark} colors={colors} />
      <TimeEditModal visible={!!timeEditorSlotId} onClose={() => setTimeEditorSlotId(null)} onSave={(s, e) => { if (timeEditorSlotId) handleUpdateSlot(timeEditorSlotId, { start_time: s, end_time: e }); setTimeEditorSlotId(null); }} initialStartTime={currentSlotForTime?.start_time || '09:00'} initialEndTime={currentSlotForTime?.end_time || '10:00'} taskLabel={currentSlotForTime?.label} isDark={isDark} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  
  // Fixed panels section
  fixedPanels: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  
  themeToggleCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 14,
    borderRadius: 12, 
    marginBottom: 10 
  },
  themeToggleContent: { flexDirection: 'row', alignItems: 'center' },
  themeToggleLabel: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  neumorphicSwitch: { width: 48, height: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10 },
  
  // Day wheel - more compact
  dayWheelContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12, 
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  dayWheelLabel: { 
    fontSize: 10, 
    fontWeight: '700', 
    letterSpacing: 1.5, 
    marginRight: 12,
  },
  wheelWrapper: { 
    height: DAY_WHEEL_ITEM_HEIGHT * 3, 
    flex: 1, 
    overflow: 'hidden', 
    position: 'relative' 
  },
  wheelSelectionIndicator: { 
    position: 'absolute', 
    top: DAY_WHEEL_ITEM_HEIGHT, 
    left: 0, 
    right: 0, 
    height: DAY_WHEEL_ITEM_HEIGHT, 
    borderRadius: 6, 
    zIndex: -1 
  },
  dayWheel: { flex: 1 },
  dayWheelItem: { justifyContent: 'center', alignItems: 'center' },
  dayWheelItemText: {},
  
  // Activities section
  activitiesSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  activitiesHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  sectionHint: { fontSize: 10 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 10 },
  
  slotItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, marginBottom: 8 },
  dragHandle: { padding: 4, marginRight: 4 },
  iconSelector: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  slotContent: { flex: 1 },
  slotLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  labelInput: { fontSize: 14, fontWeight: '600', padding: 0, marginBottom: 4, borderBottomWidth: 1 },
  timeDisplayButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  timeIcon: { marginRight: 4 },
  timeDisplayText: { fontSize: 12, fontWeight: '500', flex: 1 },
  durationBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  durationText: { fontSize: 9, fontWeight: '700' },
  deleteButton: { padding: 8, marginLeft: 4 },
  
  addButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderStyle: 'dashed', 
    marginTop: 4 
  },
  addButtonText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  actionButtons: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  actionButtonText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  iconPickerModal: { width: SCREEN_WIDTH - 40, maxWidth: 320, borderRadius: 16, padding: 16 },
  iconPickerTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  iconOptionModal: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
