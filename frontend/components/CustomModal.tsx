import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCardShadow, SPACING, CARD_PADDING } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isDark: boolean;
  colors: any;
  showCloseButton?: boolean;
  maxWidth?: number;
}

// Reusable dark modal component
export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  isDark,
  colors,
  showCloseButton = true,
  maxWidth = 340,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlayTouch} onPress={onClose}>
          <Pressable 
            style={[
              styles.modalContent, 
              { maxWidth },
              { backgroundColor: colors.card },
              getCardShadow(isDark),
            ]} 
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                )}
              </View>
              {showCloseButton && (
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            
            {/* Content */}
            <View style={styles.content}>
              {children}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Confirmation modal for delete/reset actions
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
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  isDark,
  colors,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={[
            styles.confirmModal, 
            { backgroundColor: colors.card },
            getCardShadow(isDark),
          ]} 
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <View style={[
            styles.iconContainer, 
            { backgroundColor: isDanger ? colors.dangerGlow : colors.accentGlow }
          ]}>
            <Ionicons 
              name={isDanger ? 'warning' : 'help-circle'} 
              size={28} 
              color={isDanger ? colors.danger : colors.accent} 
            />
          </View>
          
          {/* Text */}
          <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>{message}</Text>
          
          {/* Buttons */}
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.surface }]}
              onPress={onClose}
            >
              <Text style={[styles.confirmButtonText, { color: colors.textSecondary }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton, 
                { backgroundColor: isDanger ? colors.danger : colors.accent }
              ]}
              onPress={() => { onConfirm(); onClose(); }}
            >
              <Text style={[styles.confirmButtonText, { color: '#fff' }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Button component for modals
interface ModalButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  colors: any;
}

export const ModalButton: React.FC<ModalButtonProps> = ({
  label,
  onPress,
  variant = 'secondary',
  icon,
  disabled = false,
  colors,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.accent };
      case 'danger':
        return { backgroundColor: colors.danger };
      default:
        return { backgroundColor: colors.surface };
    }
  };

  const getTextColor = () => {
    return variant === 'secondary' ? colors.textSecondary : '#fff';
  };

  return (
    <TouchableOpacity
      style={[styles.modalButton, getButtonStyle(), disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon && (
        <Ionicons name={icon} size={16} color={getTextColor()} style={styles.buttonIcon} />
      )}
      <Text style={[styles.modalButtonText, { color: getTextColor() }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  divider: {
    height: 1,
    marginHorizontal: SPACING.lg,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  
  // Confirm modal
  confirmModal: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 320,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  confirmMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal button
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 10,
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
