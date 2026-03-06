import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme } from '../../context/ThemeContext';
import { TimeEditModal } from '../../components/TimeEditModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  { name: 'restaurant', label: 'Food' },
  { name: 'sunny', label: 'Morning' },
  { name: 'briefcase', label: 'Work' },
  { name: 'cafe', label: 'Break' },
  { name: 'trending-up', label: 'Trading' },
  { name: 'book', label: 'Learning' },
  { name: 'fitness', label: 'Fitness' },
  { name: 'fast-food', label: 'Snack' },
  { name: 'analytics', label: 'Analysis' },
  { name: 'settings', label: 'Settings' },
  { name: 'code', label: 'Code' },
  { name: 'moon', label: 'Evening' },
  { name: 'bed', label: 'Sleep' },
  { name: 'clock', label: 'Time' },
  { name: 'heart', label: 'Health' },
  { name: 'musical-notes', label: 'Music' },
  { name: 'game-controller', label: 'Gaming' },
  { name: 'car', label: 'Travel' },
];

// Icon mapping for Ionicons
const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'restaurant': 'restaurant-outline',
    'sunny': 'sunny-outline',
    'briefcase': 'briefcase-outline',
    'cafe': 'cafe-outline',
    'trending-up': 'trending-up-outline',
    'book': 'book-outline',
    'fitness': 'fitness-outline',
    'fast-food': 'fast-food-outline',
    'analytics': 'analytics-outline',
    'settings': 'settings-outline',
    'code': 'code-outline',
    'moon': 'moon-outline',
    'bed': 'bed-outline',
    'clock': 'time-outline',
    'heart': 'heart-outline',
    'musical-notes': 'musical-notes-outline',
    'game-controller': 'game-controller-outline',
    'car': 'car-outline',
  };
  return iconMap[iconName] || 'ellipse-outline';
};

// Day Wheel Selector Component
const WHEEL_ITEM_HEIGHT = 44;

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
  
  // Find current selection
  const getCurrentIndex = () => {
    for (let i = 0; i < DAY_OPTIONS.length; i++) {
      const opt = DAY_OPTIONS[i];
      if (opt.days.length === selectedDays.length && 
          opt.days.every(d => selectedDays.includes(d))) {
        return i;
      }
    }
    return 0; // Default to weekdays
  };

  const [selectedIndex, setSelectedIndex] = useState(getCurrentIndex());

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: selectedIndex * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, []);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / WHEEL_ITEM_HEIGHT);
    if (index >= 0 && index < DAY_OPTIONS.length) {
      setSelectedIndex(index);
      onSelectDays(DAY_OPTIONS[index].days, DAY_OPTIONS[index].key);
      scrollViewRef.current?.scrollTo({
        y: index * WHEEL_ITEM_HEIGHT,
        animated: true,
      });
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
    <View style={[styles.dayWheelContainer, { backgroundColor: colors.card }, cardShadow]}>
      <Text style={[styles.dayWheelLabel, { color: colors.textSecondary }]}>
        SCHEDULE FOR
      </Text>
      <View style={styles.wheelWrapper}>
        {/* Selection indicator */}
        <View style={[
          styles.wheelSelectionIndicator,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
        ]} />
        <ScrollView
          ref={scrollViewRef}
          style={styles.dayWheel}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * 2 }}
        >
          {DAY_OPTIONS.map((option, index) => {
            const isSelected = index === selectedIndex;
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.2;

            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.dayWheelItem, { height: WHEEL_ITEM_HEIGHT }]}
                onPress={() => {
                  setSelectedIndex(index);
                  onSelectDays(option.days, option.key);
                  scrollViewRef.current?.scrollTo({
                    y: index * WHEEL_ITEM_HEIGHT,
                    animated: true,
                  });
                }}
              >
                <Text style={[
                  styles.dayWheelItemText,
                  {
                    color: isSelected ? colors.accent : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '400',
                    opacity,
                  }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

// Icon Picker Modal Component
const IconPickerModal = ({
  visible,
  onClose,
  onSelect,
  currentIcon,
  isDark,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (icon: string) => void;
  currentIcon: string;
  isDark: boolean;
  colors: any;
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.iconPickerModal, { backgroundColor: colors.card }]}>
          <Text style={[styles.iconPickerTitle, { color: colors.textPrimary }]}>Select Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((icon) => (
              <TouchableOpacity
                key={icon.name}
                style={[
                  styles.iconOptionModal,
                  { backgroundColor: colors.surface },
                  currentIcon === icon.name && {
                    backgroundColor: colors.accent,
                    shadowColor: colors.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                  },
                ]}
                onPress={() => {
                  onSelect(icon.name);
                  onClose();
                }}
              >
                <Ionicons
                  name={getIconName(icon.name)}
                  size={24}
                  color={currentIcon === icon.name ? '#fff' : colors.iconInactive}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

// Neumorphic Toggle Switch
const NeumorphicSwitch = ({
  value,
  onValueChange,
  isDark,
  colors,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDark: boolean;
  colors: any;
}) => {
  return (
    <Pressable
      style={[
        styles.neumorphicSwitch,
        { backgroundColor: value ? colors.accent : colors.surface },
      ]}
      onPress={() => onValueChange(!value)}
    >
      <View
        style={[
          styles.switchThumb,
          { backgroundColor: colors.card },
          value ? { marginLeft: 24 } : { marginLeft: 2 },
        ]}
      />
    </Pressable>
  );
};

// Slot Editor Component (simplified - no individual day selection)
const SlotEditor = ({
  slot,
  onUpdate,
  onDelete,
  onOpenIconPicker,
  onOpenTimeEditor,
  dragProps,
  isDark,
  colors,
}: {
  slot: ScheduleSlot;
  onUpdate: (id: string, updates: Partial<ScheduleSlot>) => void;
  onDelete: (id: string) => void;
  onOpenIconPicker: (slotId: string) => void;
  onOpenTimeEditor: (slotId: string) => void;
  dragProps: any;
  isDark: boolean;
  colors: any;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  };

  // Calculate duration
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

  const duration = calculateDuration(slot.start_time, slot.end_time);

  return (
    <View style={[styles.slotItem, { backgroundColor: colors.card }, cardShadow]}>
      {/* Drag Handle */}
      <TouchableOpacity
        style={styles.dragHandle}
        {...dragProps}
      >
        <Ionicons name="menu" size={20} color={colors.iconInactive} />
      </TouchableOpacity>

      {/* Icon Selector */}
      <TouchableOpacity
        style={[styles.iconSelector, { backgroundColor: colors.surface }]}
        onPress={() => onOpenIconPicker(slot.id)}
      >
        <Ionicons name={getIconName(slot.icon)} size={20} color={colors.accent} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.slotContent}>
        {isEditing ? (
          <TextInput
            style={[styles.labelInput, { color: colors.textPrimary, borderBottomColor: colors.accent }]}
            value={slot.label}
            onChangeText={(text) => onUpdate(slot.id, { label: text })}
            onBlur={() => setIsEditing(false)}
            autoFocus
            placeholderTextColor={colors.textInactive}
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={[styles.slotLabel, { color: colors.textPrimary }]}>{slot.label}</Text>
          </TouchableOpacity>
        )}

        {/* Time Display - Tap to open time editor */}
        <TouchableOpacity
          style={[styles.timeDisplayButton, { backgroundColor: colors.surface }]}
          onPress={() => onOpenTimeEditor(slot.id)}
        >
          <Ionicons name="time-outline" size={14} color={colors.accent} style={styles.timeIcon} />
          <Text style={[styles.timeDisplayText, { color: colors.textPrimary }]}>
            {slot.start_time} — {slot.end_time}
          </Text>
          <View style={[styles.durationBadge, { backgroundColor: isDark ? '#1a2230' : '#e8e2d8' }]}>
            <Text style={[styles.durationText, { color: colors.accent }]}>{duration}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Delete Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(slot.id)}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
};

export default function SettingsScreen() {
  const { isDark, colors, toggleTheme } = useTheme();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  
  // Modal states
  const [iconPickerSlotId, setIconPickerSlotId] = useState<string | null>(null);
  const [timeEditorSlotId, setTimeEditorSlotId] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots`);
      const data = await res.json();
      const slotsWithDays = data.map((slot: ScheduleSlot) => ({
        ...slot,
        days: slot.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      }));
      setSlots(slotsWithDays);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleUpdateSlot = (id: string, updates: Partial<ScheduleSlot>) => {
    setSlots(prev => prev.map(slot => 
      slot.id === id ? { ...slot, ...updates } : slot
    ));
    setHasChanges(true);
  };

  const handleDeleteSlot = (id: string) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSlots(prev => prev.filter(slot => slot.id !== id));
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const handleAddSlot = () => {
    const newSlot: ScheduleSlot = {
      id: `slot-${Date.now()}`,
      label: 'New Activity',
      icon: 'clock',
      start_time: '09:00',
      end_time: '10:00',
      group: 'general',
      order_index: slots.length,
      days: selectedDayFilter, // Use current day filter
    };
    setSlots(prev => [...prev, newSlot]);
    setHasChanges(true);
  };

  const handleDragEnd = ({ data }: { data: ScheduleSlot[] }) => {
    const reorderedData = data.map((slot, index) => ({
      ...slot,
      order_index: index,
    }));
    setSlots(reorderedData);
    setHasChanges(true);
  };

  // Apply day filter to all slots
  const handleDayFilterChange = (days: string[], key: string) => {
    setSelectedDayFilter(days);
    // Update all slots with the new days
    setSlots(prev => prev.map(slot => ({
      ...slot,
      days: days,
    })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/schedule-slots/bulk/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      
      if (response.ok) {
        setHasChanges(false);
        Alert.alert('Saved', 'Your schedule template has been saved.');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving slots:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Schedule',
      'This will reset your schedule to the default template. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch(`${API_URL}/api/schedule-slots/reset`, {
                method: 'POST',
              });
              const data = await response.json();
              const slotsWithDays = data.map((slot: ScheduleSlot) => ({
                ...slot,
                days: slot.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
              }));
              setSlots(slotsWithDays);
              setHasChanges(false);
              Alert.alert('Reset Complete', 'Your schedule has been reset to default.');
            } catch (error) {
              console.error('Error resetting slots:', error);
              Alert.alert('Error', 'Failed to reset schedule.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleIconSelect = (icon: string) => {
    if (iconPickerSlotId) {
      handleUpdateSlot(iconPickerSlotId, { icon });
    }
    setIconPickerSlotId(null);
  };

  const handleTimeSave = (startTime: string, endTime: string) => {
    if (timeEditorSlotId) {
      handleUpdateSlot(timeEditorSlotId, { start_time: startTime, end_time: endTime });
    }
    setTimeEditorSlotId(null);
  };

  const currentSlotForIcon = iconPickerSlotId ? slots.find(s => s.id === iconPickerSlotId) : null;
  const currentSlotForTime = timeEditorSlotId ? slots.find(s => s.id === timeEditorSlotId) : null;

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ScheduleSlot>) => (
    <ScaleDecorator>
      <SlotEditor
        slot={item}
        onUpdate={handleUpdateSlot}
        onDelete={handleDeleteSlot}
        onOpenIconPicker={setIconPickerSlotId}
        onOpenTimeEditor={setTimeEditorSlotId}
        dragProps={{ onLongPress: drag, disabled: isActive }}
        isDark={isDark}
        colors={colors}
      />
    </ScaleDecorator>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.bgGradient as any}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Customize your schedule</Text>
          </View>

          {/* Theme Toggle */}
          <View style={[styles.themeToggleCard, { backgroundColor: colors.card }, cardShadow]}>
            <View style={styles.themeToggleContent}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={22}
                color={colors.accent}
              />
              <View style={styles.themeToggleText}>
                <Text style={[styles.themeToggleLabel, { color: colors.textPrimary }]}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
            </View>
            <NeumorphicSwitch
              value={!isDark}
              onValueChange={() => toggleTheme()}
              isDark={isDark}
              colors={colors}
            />
          </View>

          {/* Day Wheel Selector */}
          <DayWheelSelector
            selectedDays={selectedDayFilter}
            onSelectDays={handleDayFilterChange}
            isDark={isDark}
            colors={colors}
          />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <>
              {/* Schedule List */}
              <View style={styles.listContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Activities</Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Long press to drag & reorder</Text>
                <DraggableFlatList
                  data={slots}
                  keyExtractor={(item) => item.id}
                  onDragEnd={handleDragEnd}
                  renderItem={renderItem}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              </View>

              {/* Add Button */}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.surface }]}
                onPress={handleAddSlot}
              >
                <Ionicons name="add" size={22} color={colors.textPrimary} />
                <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>Add Activity</Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.surface }, cardShadow]}
                  onPress={handleReset}
                >
                  <Ionicons name="refresh" size={18} color={colors.textSecondary} />
                  <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: hasChanges ? colors.accent : colors.surface },
                    cardShadow,
                    hasChanges && { shadowColor: colors.accent, shadowOpacity: 0.3 },
                  ]}
                  onPress={handleSave}
                  disabled={!hasChanges || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={hasChanges ? '#fff' : colors.textSecondary} />
                      <Text style={[
                        styles.actionButtonText,
                        { color: hasChanges ? '#fff' : colors.textSecondary }
                      ]}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Icon Picker Modal */}
      <IconPickerModal
        visible={!!iconPickerSlotId}
        onClose={() => setIconPickerSlotId(null)}
        onSelect={handleIconSelect}
        currentIcon={currentSlotForIcon?.icon || 'clock'}
        isDark={isDark}
        colors={colors}
      />

      {/* Time Edit Modal */}
      <TimeEditModal
        visible={!!timeEditorSlotId}
        onClose={() => setTimeEditorSlotId(null)}
        onSave={handleTimeSave}
        initialStartTime={currentSlotForTime?.start_time || '09:00'}
        initialEndTime={currentSlotForTime?.end_time || '10:00'}
        taskLabel={currentSlotForTime?.label}
        isDark={isDark}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  themeToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleText: {
    marginLeft: 12,
  },
  themeToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  neumorphicSwitch: {
    width: 50,
    height: 26,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  dayWheelContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  dayWheelLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  wheelWrapper: {
    height: WHEEL_ITEM_HEIGHT * 5,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  wheelSelectionIndicator: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    zIndex: -1,
  },
  dayWheel: {
    flex: 1,
  },
  dayWheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayWheelItemText: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: 11,
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 10,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  dragHandle: {
    padding: 6,
    marginRight: 6,
  },
  iconSelector: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  slotContent: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  labelInput: {
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  timeDisplayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timeIcon: {
    marginRight: 6,
  },
  timeDisplayText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPickerModal: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 340,
    borderRadius: 18,
    padding: 18,
  },
  iconPickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  iconOptionModal: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
