import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// NeuroDark Design System Colors
const COLORS = {
  bgGradient: ['#0f141a', '#151c24', '#1b2430'],
  card: '#1c2432',
  surface: '#232c3d',
  accent: '#ff6a2e',
  accentSecondary: '#ff5a1f',
  accentTertiary: '#ff3c00',
  textPrimary: '#e6edf5',
  textSecondary: '#a6b0bf',
  textInactive: '#6f7b8c',
  iconInactive: '#8c96a5',
  success: '#4ade80',
  danger: '#ef4444',
};

const neumorphicShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 6, height: 6 },
  shadowOpacity: 0.6,
  shadowRadius: 14,
  elevation: 8,
};

interface ScheduleSlot {
  id: string;
  label: string;
  icon: string;
  start_time: string;
  end_time: string;
  group: string;
  order_index: number;
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
  };
  return iconMap[iconName] || 'ellipse-outline';
};

// Slot Editor Component
const SlotEditor = ({
  slot,
  onUpdate,
  onDelete,
  dragProps,
}: {
  slot: ScheduleSlot;
  onUpdate: (id: string, updates: Partial<ScheduleSlot>) => void;
  onDelete: (id: string) => void;
  dragProps: any;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  return (
    <View style={styles.slotItem}>
      {/* Drag Handle */}
      <TouchableOpacity
        style={styles.dragHandle}
        {...dragProps}
      >
        <Ionicons name="menu" size={20} color={COLORS.iconInactive} />
      </TouchableOpacity>

      {/* Icon Selector */}
      <TouchableOpacity
        style={styles.iconSelector}
        onPress={() => setShowIconPicker(!showIconPicker)}
      >
        <Ionicons name={getIconName(slot.icon)} size={20} color={COLORS.accent} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.slotContent}>
        {isEditing ? (
          <TextInput
            style={styles.labelInput}
            value={slot.label}
            onChangeText={(text) => onUpdate(slot.id, { label: text })}
            onBlur={() => setIsEditing(false)}
            autoFocus
            placeholderTextColor={COLORS.textInactive}
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={styles.slotLabel}>{slot.label}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.timeRow}>
          <TextInput
            style={styles.timeInput}
            value={slot.start_time}
            onChangeText={(text) => onUpdate(slot.id, { start_time: text })}
            placeholder="HH:MM"
            placeholderTextColor={COLORS.textInactive}
            maxLength={5}
          />
          <Text style={styles.timeSeparator}>—</Text>
          <TextInput
            style={styles.timeInput}
            value={slot.end_time}
            onChangeText={(text) => onUpdate(slot.id, { end_time: text })}
            placeholder="HH:MM"
            placeholderTextColor={COLORS.textInactive}
            maxLength={5}
          />
        </View>
      </View>

      {/* Delete Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(slot.id)}
      >
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
      </TouchableOpacity>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <View style={styles.iconPicker}>
          {ICON_OPTIONS.map((icon) => (
            <TouchableOpacity
              key={icon.name}
              style={[
                styles.iconOption,
                slot.icon === icon.name && styles.iconOptionSelected,
              ]}
              onPress={() => {
                onUpdate(slot.id, { icon: icon.name });
                setShowIconPicker(false);
              }}
            >
              <Ionicons
                name={getIconName(icon.name)}
                size={20}
                color={slot.icon === icon.name ? COLORS.accent : COLORS.iconInactive}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function SettingsScreen() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/schedule-slots`);
      const data = await res.json();
      setSlots(data);
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
              setSlots(data);
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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ScheduleSlot>) => (
    <ScaleDecorator>
      <SlotEditor
        slot={item}
        onUpdate={handleUpdateSlot}
        onDelete={handleDeleteSlot}
        dragProps={{ onLongPress: drag, disabled: isActive }}
      />
    </ScaleDecorator>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.bgGradient as any}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Customize your schedule template</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
          ) : (
            <>
              {/* Schedule List */}
              <View style={styles.listContainer}>
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
              <TouchableOpacity style={styles.addButton} onPress={handleAddSlot}>
                <Ionicons name="add" size={24} color={COLORS.textPrimary} />
                <Text style={styles.addButtonText}>Add Activity</Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resetButton]}
                  onPress={handleReset}
                >
                  <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.saveButton,
                    !hasChanges && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!hasChanges || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
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
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...neumorphicShadow,
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  iconSelector: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
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
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  labelInput: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    padding: 0,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    fontSize: 13,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    width: 65,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginHorizontal: 6,
  },
  deleteButton: {
    padding: 10,
    marginLeft: 8,
  },
  iconPicker: {
    position: 'absolute',
    top: 60,
    left: 50,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 200,
    zIndex: 100,
    ...neumorphicShadow,
  },
  iconOption: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    margin: 2,
  },
  iconOptionSelected: {
    backgroundColor: COLORS.surface,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surface,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
    ...neumorphicShadow,
  },
  resetButton: {
    backgroundColor: COLORS.surface,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOpacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});
