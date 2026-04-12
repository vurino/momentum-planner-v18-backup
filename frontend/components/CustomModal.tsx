import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SPACING, RADIUS, FONT } from '../context/ThemeContext';
 
interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isDark: boolean;
  colors: any;
}
 
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible, onClose, onConfirm,
  title, message, confirmText = 'Confirm', cancelText = 'Cancel',
  isDanger = false, isDark, colors,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <Pressable style={[styles.overlay, { backgroundColor: colors.modalOverlay }]} onPress={onClose}>
      <Pressable style={[styles.card, { backgroundColor: isDark ? colors.bgSurface || '#212530' : colors.bgSurface }]}
        onPress={e => e.stopPropagation()}>
 
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
 
        <View style={styles.btns}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: isDark ? colors.bgBase : '#e8e2d8', borderWidth: 0.5, borderColor: colors.dividerStrong }]}
            onPress={onClose}
          >
            <Text style={[styles.btnText, { color: colors.textMuted }]}>{cancelText}</Text>
          </TouchableOpacity>
 
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: isDanger ? '#ef4444' : colors.accent }]}
            onPress={onConfirm}
          >
            <Text style={[styles.btnText, { color: '#fff' }]}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);
 
const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 340,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  title:   { fontSize: FONT.md, fontWeight: '700', marginBottom: SPACING.sm },
  message: { fontSize: FONT.sm, lineHeight: 20, marginBottom: SPACING.lg },
  btns:    { flexDirection: 'row', gap: SPACING.sm },
  btn:     { flex: 1, paddingVertical: 13, borderRadius: RADIUS.md, alignItems: 'center' },
  btnText: { fontSize: FONT.sm, fontWeight: '600' },
});
 