import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  return iconMap[iconName] || 'time-outline';
};

// Icon options
const ICON_OPTIONS = [
  'restaurant', 'sunny', 'briefcase', 'cafe', 'trending-up', 'book', 
  'fitness', 'fast-food', 'analytics', 'code', 'moon', 'bed', 
  'time', 'heart', 'musical-notes', 'game-controller', 'car', 'home',
  'pencil', 'school', 'walk', 'water', 'leaf', 'medkit',
];

interface TaskEditPanelProps {
  visible: boolean;
  onClose: () => void;
  onSave: (updates: { label: string; icon: string; notes: string }) => void;
  initialLabel: string;
  initialIcon: string;
  initialNotes: string;
  isDark: boolean;
  colors: any;
}

export const TaskEditPanel: React.FC<TaskEditPanelProps> = ({
  visible,
  onClose,
  onSave,
  initialLabel,
  initialIcon,
  initialNotes,
  isDark,
  colors,
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [icon, setIcon] = useState(initialIcon);
  const [notes, setNotes] = useState(initialNotes);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setLabel(initialLabel);
      setIcon(initialIcon);
      setNotes(initialNotes);
      setShowIconPicker(false);
      // Auto focus the input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, initialLabel, initialIcon, initialNotes]);

  // Track keyboard visibility
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSave = () => {
    if (label.trim()) {
      onSave({ label: label.trim(), icon, notes });
      Keyboard.dismiss();
      onClose();
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#888',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.5 : 0.15,
    shadowRadius: 12,
    elevation: 8,
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable 
            style={[
              styles.panel, 
              { backgroundColor: colors.card },
              cardShadow,
            ]} 
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Activity</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Icon Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textInactive }]}>ICON</Text>
              <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowIconPicker(!showIconPicker)}
              >
                <Ionicons name={getIconName(icon)} size={28} color={colors.accent} />
                <Ionicons 
                  name={showIconPicker ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={colors.textSecondary} 
                  style={styles.iconChevron}
                />
              </TouchableOpacity>
            </View>

            {/* Icon Picker Grid - Collapsible */}
            {showIconPicker && (
              <View style={[styles.iconGrid, { backgroundColor: colors.surface }]}>
                {ICON_OPTIONS.map((iconOption) => (
                  <TouchableOpacity
                    key={iconOption}
                    style={[
                      styles.iconOption,
                      icon === iconOption && { backgroundColor: colors.accentGlow, borderColor: colors.accent, borderWidth: 1.5 },
                    ]}
                    onPress={() => {
                      setIcon(iconOption);
                      setShowIconPicker(false);
                    }}
                  >
                    <Ionicons 
                      name={getIconName(iconOption)} 
                      size={22} 
                      color={icon === iconOption ? colors.accent : colors.iconInactive} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Name Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textInactive }]}>NAME</Text>
              <TextInput
                ref={inputRef}
                style={[
                  styles.nameInput, 
                  { 
                    backgroundColor: colors.surface, 
                    color: colors.textPrimary,
                    borderColor: colors.accent,
                  }
                ]}
                value={label}
                onChangeText={setLabel}
                placeholder="Activity name"
                placeholderTextColor={colors.textInactive}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            {/* Notes Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textInactive }]}>NOTES</Text>
              <TextInput
                style={[
                  styles.notesInput, 
                  { backgroundColor: colors.surface, color: colors.textPrimary }
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor={colors.textInactive}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton, { backgroundColor: colors.surface }]} 
                onPress={handleClose}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.saveButton, 
                  { backgroundColor: label.trim() ? colors.accent : colors.surface }
                ]} 
                onPress={handleSave}
                disabled={!label.trim()}
              >
                <Ionicons 
                  name="checkmark" 
                  size={18} 
                  color={label.trim() ? '#fff' : colors.textInactive} 
                />
                <Text style={[
                  styles.buttonText, 
                  { color: label.trim() ? '#fff' : colors.textInactive }
                ]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 50,
    borderRadius: 12,
  },
  iconChevron: {
    position: 'absolute',
    right: 6,
    bottom: 6,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    fontSize: 16,
    fontWeight: '500',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
  },
  notesInput: {
    fontSize: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  cancelButton: {},
  saveButton: {},
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
