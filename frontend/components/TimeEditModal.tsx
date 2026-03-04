import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import { TimeDial, DurationDial } from './RadialDial';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TimeEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (startTime: string, endTime: string) => void;
  initialStartTime: string;
  initialEndTime: string;
  taskLabel?: string;
  isDark: boolean;
  colors: any;
}

export const TimeEditModal: React.FC<TimeEditModalProps> = ({
  visible,
  onClose,
  onSave,
  initialStartTime,
  initialEndTime,
  taskLabel,
  isDark,
  colors,
}) => {
  // Parse initial times
  const parseTime = (time: string): { hour: number; minute: number } => {
    const [h, m] = time.split(':').map(Number);
    return { hour: h || 0, minute: m || 0 };
  };

  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const calculateDuration = (start: { hour: number; minute: number }, end: { hour: number; minute: number }): number => {
    const startMins = start.hour * 60 + start.minute;
    const endMins = end.hour * 60 + end.minute;
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60; // Handle overnight
    return Math.max(15, Math.min(120, diff));
  };

  const calculateEndTime = (start: { hour: number; minute: number }, duration: number): { hour: number; minute: number } => {
    const startMins = start.hour * 60 + start.minute;
    let endMins = startMins + duration;
    if (endMins >= 24 * 60) endMins -= 24 * 60;
    return {
      hour: Math.floor(endMins / 60),
      minute: endMins % 60,
    };
  };

  const initialStart = parseTime(initialStartTime);
  const initialEnd = parseTime(initialEndTime);
  const initialDuration = calculateDuration(initialStart, initialEnd);

  const [startHour, setStartHour] = useState(initialStart.hour);
  const [startMinute, setStartMinute] = useState(Math.floor(initialStart.minute / 5) * 5);
  const [endHour, setEndHour] = useState(initialEnd.hour);
  const [endMinute, setEndMinute] = useState(Math.floor(initialEnd.minute / 5) * 5);
  const [duration, setDuration] = useState(initialDuration);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      const start = parseTime(initialStartTime);
      const end = parseTime(initialEndTime);
      setStartHour(start.hour);
      setStartMinute(Math.floor(start.minute / 5) * 5);
      setEndHour(end.hour);
      setEndMinute(Math.floor(end.minute / 5) * 5);
      setDuration(calculateDuration(start, end));
    }
  }, [visible, initialStartTime, initialEndTime]);

  // Update end time when start time or duration changes
  const handleStartChange = (hour: number, minute: number) => {
    setStartHour(hour);
    setStartMinute(minute);
    const newEnd = calculateEndTime({ hour, minute }, duration);
    setEndHour(newEnd.hour);
    setEndMinute(newEnd.minute);
  };

  // Update duration when end time changes
  const handleEndChange = (hour: number, minute: number) => {
    setEndHour(hour);
    setEndMinute(minute);
    const newDuration = calculateDuration(
      { hour: startHour, minute: startMinute },
      { hour, minute }
    );
    setDuration(newDuration);
  };

  // Update end time when duration changes
  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    const newEnd = calculateEndTime({ hour: startHour, minute: startMinute }, newDuration);
    setEndHour(newEnd.hour);
    setEndMinute(newEnd.minute);
  };

  const handleSave = () => {
    const startTime = formatTime(startHour, startMinute);
    const endTime = formatTime(endHour, endMinute);
    onSave(startTime, endTime);
    onClose();
  };

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: isDark ? 0.6 : 0.15,
    shadowRadius: 20,
    elevation: 12,
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={[
            styles.card,
            { backgroundColor: isDark ? '#1c2432' : '#f4f6fa' },
            cardShadow,
          ]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Edit Time
              </Text>
              {taskLabel && (
                <Text style={[styles.taskLabel, { color: colors.textSecondary }]}>
                  {taskLabel}
                </Text>
              )}
            </View>

            {/* Time Dials Row */}
            <View style={styles.dialsContainer}>
              {/* Start Time */}
              <View style={styles.timeDialGroup}>
                <Text style={[styles.dialGroupLabel, { color: colors.textSecondary }]}>
                  START
                </Text>
                <View style={styles.timeDialRow}>
                  <TimeDial
                    value={startHour}
                    type="hour"
                    size={90}
                    onChange={(h) => handleStartChange(h, startMinute)}
                    isDark={isDark}
                    colors={colors}
                  />
                  <Text style={[styles.timeSeparator, { color: colors.accent }]}>:</Text>
                  <TimeDial
                    value={startMinute}
                    type="minute"
                    size={90}
                    onChange={(m) => handleStartChange(startHour, m)}
                    isDark={isDark}
                    colors={colors}
                  />
                </View>
                <Text style={[styles.timeDisplay, { color: colors.textPrimary }]}>
                  {formatTime(startHour, startMinute)}
                </Text>
              </View>
            </View>

            {/* Duration Dial */}
            <View style={styles.durationContainer}>
              <DurationDial
                value={duration}
                size={100}
                onChange={handleDurationChange}
                isDark={isDark}
                colors={colors}
              />
            </View>

            {/* End Time */}
            <View style={styles.dialsContainer}>
              <View style={styles.timeDialGroup}>
                <Text style={[styles.dialGroupLabel, { color: colors.textSecondary }]}>
                  END
                </Text>
                <View style={styles.timeDialRow}>
                  <TimeDial
                    value={endHour}
                    type="hour"
                    size={90}
                    onChange={(h) => handleEndChange(h, endMinute)}
                    isDark={isDark}
                    colors={colors}
                  />
                  <Text style={[styles.timeSeparator, { color: colors.accent }]}>:</Text>
                  <TimeDial
                    value={endMinute}
                    type="minute"
                    size={90}
                    onChange={(m) => handleEndChange(endHour, m)}
                    isDark={isDark}
                    colors={colors}
                  />
                </View>
                <Text style={[styles.timeDisplay, { color: colors.textPrimary }]}>
                  {formatTime(endHour, endMinute)}
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: isDark ? '#2a3344' : '#e0e5ec' },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: colors.accent },
                ]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  taskLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  dialsContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  timeDialGroup: {
    alignItems: 'center',
  },
  dialGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  timeDialRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  timeDisplay: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  durationContainer: {
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    shadowColor: '#ff6a2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
