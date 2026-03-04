import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Dimensions,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme } from '../../context/ThemeContext';

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

// Day options
const DAY_OPTIONS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
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

// Time Picker Modal Component
const TimePickerModal = ({
  visible,
  onClose,
  onSelect,
  initialTime,
  isDark,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  initialTime: string;
  isDark: boolean;
  colors: any;
}) => {
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (initialTime) {
      const [h, m] = initialTime.split(':');
      setHour(h || '09');
      setMinute(m || '00');
    }
  }, [initialTime, visible]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const handleConfirm = () => {
    onSelect(`${hour}:${minute}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.timePickerContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.timePickerTitle, { color: colors.textPrimary }]}>Select Time</Text>
          
          <View style={styles.timePickerRow}>
            <ScrollView style={styles.timePickerColumn} showsVerticalScrollIndicator={false}>
              {hours.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.timePickerItem,
                    hour === h && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => setHour(h)}
                >
                  <Text style={[
                    styles.timePickerItemText,
                    { color: colors.textSecondary },
                    hour === h && { color: '#fff', fontWeight: '700' },
                  ]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={[styles.timePickerSeparator, { color: colors.textPrimary }]}>:</Text>
            
            <ScrollView style={styles.timePickerColumn} showsVerticalScrollIndicator={false}>
              {minutes.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.timePickerItem,
                    minute === m && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => setMinute(m)}
                >
                  <Text style={[
                    styles.timePickerItemText,
                    { color: colors.textSecondary },
                    minute === m && { color: '#fff', fontWeight: '700' },
                  ]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.timePickerActions}>
            <TouchableOpacity
              style={[styles.timePickerButton, { backgroundColor: colors.surface }]}
              onPress={onClose}
            >
              <Text style={[styles.timePickerButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timePickerButton, { backgroundColor: colors.accent }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.timePickerButtonText, { color: '#fff' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
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

// Day Selector Component
const DaySelector = ({
  selectedDays,
  onToggleDay,
  isDark,
  colors,
}: {
  selectedDays: string[];
  onToggleDay: (day: string) => void;
  isDark: boolean;
  colors: any;
}) => {
  const allWeekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const weekend = ['sat', 'sun'];
  const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const isAllWeekdays = allWeekdays.every(d => selectedDays.includes(d));
  const isWeekend = weekend.every(d => selectedDays.includes(d)) && !allWeekdays.some(d => selectedDays.includes(d));
  const isAllDays = allDays.every(d => selectedDays.includes(d));

  const handleQuickSelect = (type: 'weekdays' | 'weekend' | 'all') => {
    // This would require a different callback to set all days at once
  };

  return (
    <View style={styles.daySelector}>
      {DAY_OPTIONS.map((day) => {
        const isSelected = selectedDays.includes(day.key);
        return (
          <TouchableOpacity
            key={day.key}
            style={[
              styles.dayChip,
              { backgroundColor: colors.surface },
              isSelected && { backgroundColor: colors.accent },
            ]}
            onPress={() => onToggleDay(day.key)}
          >
            <Text style={[
              styles.dayChipText,
              { color: colors.textSecondary },
              isSelected && { color: '#fff', fontWeight: '600' },
            ]}>
              {day.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
        {
          shadowColor: isDark ? '#000' : '#999',
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: isDark ? 0.5 : 0.1,
          shadowRadius: 6,
        },
      ]}
      onPress={() => onValueChange(!value)}
    >
      <View
        style={[
          styles.switchThumb,
          { backgroundColor: colors.card },
          value ? { marginLeft: 24 } : { marginLeft: 2 },
          {
            shadowColor: isDark ? '#000' : '#999',
            shadowOffset: { width: 2, height: 2 },
            shadowOpacity: isDark ? 0.4 : 0.15,
            shadowRadius: 4,
          },
        ]}
      />
    </Pressable>
  );
};

// Slot Editor Component
const SlotEditor = ({
  slot,
  onUpdate,
  onDelete,
  onOpenIconPicker,
  onOpenTimePicker,
  dragProps,
  isDark,
  colors,
}: {
  slot: ScheduleSlot;
  onUpdate: (id: string, updates: Partial<ScheduleSlot>) => void;
  onDelete: (id: string) => void;
  onOpenIconPicker: (slotId: string) => void;
  onOpenTimePicker: (slotId: string, type: 'start' | 'end') => void;
  dragProps: any;
  isDark: boolean;
  colors: any;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDays, setShowDays] = useState(false);

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: isDark ? 0.55 : 0.12,
    shadowRadius: 12,
    elevation: 8,
  };

  const handleToggleDay = (day: string) => {
    const currentDays = slot.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let newDays: string[];
    if (currentDays.includes(day)) {
      newDays = currentDays.filter(d => d !== day);
    } else {
      newDays = [...currentDays, day];
    }
    onUpdate(slot.id, { days: newDays });
  };

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

        <View style={styles.timeRow}>
          <TouchableOpacity
            style={[styles.timeButton, { backgroundColor: colors.surface }]}
            onPress={() => onOpenTimePicker(slot.id, 'start')}
          >
            <Text style={[styles.timeButtonText, { color: colors.textSecondary }]}>
              {slot.start_time}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>—</Text>
          <TouchableOpacity
            style={[styles.timeButton, { backgroundColor: colors.surface }]}
            onPress={() => onOpenTimePicker(slot.id, 'end')}
          >
            <Text style={[styles.timeButtonText, { color: colors.textSecondary }]}>
              {slot.end_time}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Day Toggle */}
        <TouchableOpacity
          style={styles.daysToggle}
          onPress={() => setShowDays(!showDays)}
        >
          <Text style={[styles.daysToggleText, { color: colors.accent }]}>
            {showDays ? 'Hide days' : `${slot.days?.length || 7} days`}
          </Text>
          <Ionicons
            name={showDays ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.accent}
          />
        </TouchableOpacity>

        {showDays && (
          <DaySelector
            selectedDays={slot.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']}
            onToggleDay={handleToggleDay}
            isDark={isDark}
            colors={colors}
          />
        )}
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
  
  // Modal states
  const [iconPickerSlotId, setIconPickerSlotId] = useState<string | null>(null);
  const [timePickerState, setTimePickerState] = useState<{ slotId: string; type: 'start' | 'end' } | null>(null);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots`);
      const data = await res.json();
      // Ensure all slots have days property
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
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
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

  const handleTimeSelect = (time: string) => {
    if (timePickerState) {
      const { slotId, type } = timePickerState;
      const update = type === 'start' ? { start_time: time } : { end_time: time };
      handleUpdateSlot(slotId, update);
    }
    setTimePickerState(null);
  };

  const currentSlotForIcon = iconPickerSlotId ? slots.find(s => s.id === iconPickerSlotId) : null;
  const currentSlotForTime = timePickerState ? slots.find(s => s.id === timePickerState.slotId) : null;

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: isDark ? 0.55 : 0.12,
    shadowRadius: 12,
    elevation: 8,
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ScheduleSlot>) => (
    <ScaleDecorator>
      <SlotEditor
        slot={item}
        onUpdate={handleUpdateSlot}
        onDelete={handleDeleteSlot}
        onOpenIconPicker={setIconPickerSlotId}
        onOpenTimePicker={(slotId, type) => setTimePickerState({ slotId, type })}
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
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Customize your schedule template</Text>
          </View>

          {/* Theme Toggle */}
          <View style={[styles.themeToggleCard, { backgroundColor: colors.card }, cardShadow]}>
            <View style={styles.themeToggleContent}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={24}
                color={colors.accent}
              />
              <View style={styles.themeToggleText}>
                <Text style={[styles.themeToggleLabel, { color: colors.textPrimary }]}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Text style={[styles.themeToggleSubtext, { color: colors.textSecondary }]}>
                  Toggle appearance
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

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <>
              {/* Schedule List */}
              <View style={styles.listContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Schedule Template</Text>
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
                <Ionicons name="add" size={24} color={colors.textPrimary} />
                <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>Add Activity</Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resetButton, { backgroundColor: colors.surface }, cardShadow]}
                  onPress={handleReset}
                >
                  <Ionicons name="refresh" size={20} color={colors.textSecondary} />
                  <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.saveButton,
                    { backgroundColor: hasChanges ? colors.accent : colors.surface },
                    cardShadow,
                    hasChanges && { shadowColor: colors.accent, shadowOpacity: 0.4 },
                  ]}
                  onPress={handleSave}
                  disabled={!hasChanges || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color={hasChanges ? '#fff' : colors.textSecondary} />
                      <Text style={[
                        styles.saveButtonText,
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

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={!!timePickerState}
        onClose={() => setTimePickerState(null)}
        onSelect={handleTimeSelect}
        initialTime={
          currentSlotForTime
            ? timePickerState?.type === 'start'
              ? currentSlotForTime.start_time
              : currentSlotForTime.end_time
            : '09:00'
        }
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
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  themeToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleText: {
    marginLeft: 12,
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeToggleSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  neumorphicSwitch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
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
    paddingBottom: 20,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  iconSelector: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  slotContent: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  labelInput: {
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: 13,
    marginHorizontal: 6,
  },
  daysToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  daysToggleText: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 10,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  resetButton: {},
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {},
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
  },
  iconPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  iconOptionModal: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerContainer: {
    width: SCREEN_WIDTH - 60,
    maxWidth: 320,
    borderRadius: 20,
    padding: 20,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  timePickerColumn: {
    width: 70,
    height: 200,
  },
  timePickerItem: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  timePickerItemText: {
    fontSize: 18,
    fontWeight: '500',
  },
  timePickerSeparator: {
    fontSize: 28,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  timePickerActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
