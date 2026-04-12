import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONT } from '../context/ThemeContext';
 
// ─────────────────────────────────────────────────────────────────────────────
// AVAILABLE ICONS — matches the existing app's icon set
// ─────────────────────────────────────────────────────────────────────────────
const ICONS: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'sunny',         icon: 'sunny-outline'         },
  { key: 'cafe',          icon: 'cafe-outline'          },
  { key: 'briefcase',     icon: 'briefcase-outline'     },
  { key: 'restaurant',    icon: 'restaurant-outline'    },
  { key: 'fast-food',     icon: 'fast-food-outline'     },
  { key: 'book',          icon: 'book-outline'          },
  { key: 'fitness',       icon: 'fitness-outline'       },
  { key: 'walk',          icon: 'walk-outline'          },
  { key: 'heart',         icon: 'heart-outline'         },
  { key: 'moon',          icon: 'moon-outline'          },
  { key: 'bed',           icon: 'bed-outline'           },
  { key: 'code',          icon: 'code-outline'          },
  { key: 'analytics',     icon: 'analytics-outline'     },
  { key: 'trending-up',   icon: 'trending-up-outline'   },
  { key: 'musical-notes', icon: 'musical-notes-outline' },
  { key: 'game-controller', icon: 'game-controller-outline' },
  { key: 'car',           icon: 'car-outline'           },
  { key: 'home',          icon: 'home-outline'          },
  { key: 'pencil',        icon: 'pencil-outline'        },
  { key: 'school',        icon: 'school-outline'        },
  { key: 'water',         icon: 'water-outline'         },
  { key: 'leaf',          icon: 'leaf-outline'          },
  { key: 'medkit',        icon: 'medkit-outline'        },
  { key: 'time',          icon: 'time-outline'          },
];
 
// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────
interface TaskEditPanelProps {
  visible: boolean;
  onClose: () => void;
  onSave: (updates: { label: string; icon: string; notes?: string }) => void;
  initialLabel: string;
  initialIcon: string;
  initialNotes?: string;
  isDark: boolean;
  colors: any;
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const TaskEditPanel: React.FC<TaskEditPanelProps> = ({
  visible, onClose, onSave,
  initialLabel, initialIcon, initialNotes = '',
  isDark, colors,
}) => {
  const [label, setLabel]   = useState(initialLabel);
  const [icon,  setIcon]    = useState(initialIcon);
  const [notes, setNotes]   = useState(initialNotes);
 
  useEffect(() => {
    if (visible) {
      setLabel(initialLabel);
      setIcon(initialIcon);
      setNotes(initialNotes);
    }
  }, [visible, initialLabel, initialIcon, initialNotes]);
 
  const hasChanges =
    label !== initialLabel ||
    icon  !== initialIcon  ||
    notes !== initialNotes;
 
  const handleSave = () => {
    if (!label.trim()) return;
    onSave({ label: label.trim(), icon, notes: notes.trim() || undefined });
    onClose();
  };
 
  // ── Colors using new tokens ─────────────────────────────────────────────
  const cardBg   = isDark ? (colors.bgSurface || '#212530') : (colors.bgSurface || '#e8e2d8');
  const inputBg  = isDark ? colors.bgBase : '#f0ebe2';
  const cancelBg = isDark ? colors.bgBase : '#e0dbd2';
 
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={S.kbWrap}
      >
        <Pressable style={S.overlay} onPress={onClose}>
          <Pressable style={S.sheetWrap} onPress={e => e.stopPropagation()}>
            <View style={[S.sheet, { backgroundColor: cardBg }]}>
 
              {/* Handle bar */}
              <View style={[S.handle, { backgroundColor: colors.dividerStrong || colors.divider }]} />
 
              {/* Header */}
              <View style={S.header}>
                <Text style={[S.title, { color: colors.textPrimary }]}>
                  {initialLabel ? 'Edit Activity' : 'New Activity'}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
 
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
 
                {/* Label input */}
                <Text style={[S.fieldLabel, { color: colors.textDim }]}>NAME</Text>
                <TextInput
                  style={[S.input, {
                    backgroundColor: inputBg,
                    color: colors.textPrimary,
                    borderColor: colors.accent,
                  }]}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Activity name"
                  placeholderTextColor={colors.textDim}
                  autoFocus={!initialLabel}
                  maxLength={40}
                  returnKeyType="done"
                />
 
                {/* Icon grid */}
                <Text style={[S.fieldLabel, { color: colors.textDim }]}>ICON</Text>
                <View style={S.iconGrid}>
                  {ICONS.map(({ key, icon: iconName }) => {
                    const selected = icon === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setIcon(key)}
                        style={[
                          S.iconCell,
                          {
                            backgroundColor: selected
                              ? `${colors.accent}20`
                              : inputBg,
                            borderColor: selected
                              ? colors.accent
                              : 'transparent',
                            borderWidth: selected ? 1.5 : 1,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={iconName}
                          size={20}
                          color={selected ? colors.accent : colors.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
 
                {/* Notes input */}
                <Text style={[S.fieldLabel, { color: colors.textDim }]}>NOTES</Text>
                <TextInput
                  style={[S.input, S.notesInput, {
                    backgroundColor: inputBg,
                    color: colors.textPrimary,
                    borderColor: notes ? colors.accent : colors.dividerStrong || colors.divider,
                  }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes…"
                  placeholderTextColor={colors.textDim}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
 
                {/* Buttons */}
                <View style={S.btns}>
                  <TouchableOpacity
                    style={[S.btn, { backgroundColor: cancelBg }]}
                    onPress={onClose}
                  >
                    <Text style={[S.btnTxt, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
 
                  <TouchableOpacity
                    style={[S.btn, {
                      backgroundColor: label.trim() ? colors.accent : cancelBg,
                      opacity: label.trim() ? 1 : 0.5,
                    }]}
                    onPress={handleSave}
                    disabled={!label.trim()}
                  >
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={label.trim() ? '#fff' : colors.textDim}
                    />
                    <Text style={[S.btnTxt, { color: label.trim() ? '#fff' : colors.textDim }]}>
                      {initialLabel ? 'Save' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
 
                {/* Bottom padding for keyboard */}
                <View style={{ height: SPACING.xl }} />
              </ScrollView>
 
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  kbWrap:    { flex: 1 },
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { width: '100%' },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
 
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
 
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  title:  { fontSize: FONT.md + 2, fontWeight: '700' },
 
  fieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: SPACING.sm, marginTop: SPACING.md },
 
  input: {
    fontSize: FONT.sm,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
  },
  notesInput: { minHeight: 80, paddingTop: SPACING.sm + 2 },
 
  // Icon grid — 6 columns
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  iconCell: {
    width: 44, height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
 
  btns:   { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: RADIUS.lg },
  btnTxt: { fontSize: FONT.sm, fontWeight: '600' },
});
 