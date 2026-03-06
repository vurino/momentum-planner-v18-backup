import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isDark: boolean;
  colors: any;
  width?: number;
  allowManualInput?: boolean;
  onManualInput?: (value: string) => void;
}

// Individual Wheel Picker Component
const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedIndex,
  onSelect,
  isDark,
  colors,
  width = 70,
  allowManualInput = false,
  onManualInput,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [manualValue, setManualValue] = useState('');

  useEffect(() => {
    // Scroll to selected item
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < items.length && index !== selectedIndex) {
      onSelect(index);
    }
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    // Snap to nearest item
    scrollViewRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated: true,
    });
    if (index >= 0 && index < items.length) {
      onSelect(index);
    }
  };

  const handleManualSubmit = () => {
    if (onManualInput && manualValue) {
      onManualInput(manualValue);
    }
    setIsEditing(false);
    setManualValue('');
  };

  const handleItemPress = (index: number) => {
    if (index === selectedIndex && allowManualInput) {
      setIsEditing(true);
      setManualValue(items[index]);
    } else {
      scrollViewRef.current?.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: true,
      });
      onSelect(index);
    }
  };

  return (
    <View style={[styles.wheelContainer, { width }]}>
      {/* Selection indicator */}
      <View style={[
        styles.selectionIndicator,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          top: ITEM_HEIGHT * 2,
        }
      ]} />
      
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25;
          const scale = distance === 0 ? 1 : 0.85;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
              onPress={() => handleItemPress(index)}
              activeOpacity={0.7}
            >
              {isEditing && isSelected ? (
                <TextInput
                  style={[
                    styles.manualInput,
                    { 
                      color: colors.accent,
                      borderBottomColor: colors.accent,
                    }
                  ]}
                  value={manualValue}
                  onChangeText={setManualValue}
                  onBlur={handleManualSubmit}
                  onSubmitEditing={handleManualSubmit}
                  keyboardType="number-pad"
                  maxLength={2}
                  autoFocus
                />
              ) : (
                <Text
                  style={[
                    styles.wheelItemText,
                    {
                      color: isSelected ? colors.accent : colors.textSecondary,
                      opacity,
                      transform: [{ scale }],
                      fontWeight: isSelected ? '700' : '400',
                    },
                  ]}
                >
                  {item}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Time Wheel Group (Hour : Minute AM/PM)
interface TimeWheelGroupProps {
  label: string;
  hour: number;
  minute: number;
  isPM: boolean;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  onPeriodChange: (isPM: boolean) => void;
  isDark: boolean;
  colors: any;
}

const TimeWheelGroup: React.FC<TimeWheelGroupProps> = ({
  label,
  hour,
  minute,
  isPM,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
  isDark,
  colors,
}) => {
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];

  // Convert to 12-hour format for display
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const hourIndex = displayHour - 1;
  const minuteIndex = Math.floor(minute / 5);
  const periodIndex = isPM ? 1 : 0;

  return (
    <View style={styles.timeWheelGroup}>
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.wheelsRow}>
        <WheelPicker
          items={hours}
          selectedIndex={hourIndex}
          onSelect={(index) => {
            const newHour = index + 1;
            onHourChange(isPM && newHour !== 12 ? newHour + 12 : (!isPM && newHour === 12 ? 0 : newHour));
          }}
          isDark={isDark}
          colors={colors}
          width={60}
          allowManualInput
          onManualInput={(val) => {
            const h = parseInt(val);
            if (h >= 1 && h <= 12) {
              onHourChange(isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h));
            }
          }}
        />
        <Text style={[styles.timeSeparator, { color: colors.textPrimary }]}>:</Text>
        <WheelPicker
          items={minutes}
          selectedIndex={minuteIndex}
          onSelect={(index) => onMinuteChange(index * 5)}
          isDark={isDark}
          colors={colors}
          width={60}
          allowManualInput
          onManualInput={(val) => {
            const m = parseInt(val);
            if (m >= 0 && m < 60) {
              onMinuteChange(Math.floor(m / 5) * 5);
            }
          }}
        />
        <WheelPicker
          items={periods}
          selectedIndex={periodIndex}
          onSelect={(index) => {
            const newIsPM = index === 1;
            if (newIsPM !== isPM) {
              onPeriodChange(newIsPM);
            }
          }}
          isDark={isDark}
          colors={colors}
          width={50}
        />
      </View>
    </View>
  );
};

// Duration Wheel Group (Hours : Minutes)
interface DurationWheelGroupProps {
  durationMins: number;
  onDurationChange: (mins: number) => void;
  isDark: boolean;
  colors: any;
}

const DurationWheelGroup: React.FC<DurationWheelGroupProps> = ({
  durationMins,
  onDurationChange,
  isDark,
  colors,
}) => {
  const durationHours = Array.from({ length: 13 }, (_, i) => i.toString()); // 0-12 hours
  const durationMinutes = ['00', '15', '30', '45'];

  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const hourIndex = Math.min(hours, 12);
  const minIndex = Math.floor(mins / 15);

  return (
    <View style={styles.timeWheelGroup}>
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>DURATION</Text>
      <View style={styles.wheelsRow}>
        <WheelPicker
          items={durationHours}
          selectedIndex={hourIndex}
          onSelect={(index) => onDurationChange(index * 60 + (minIndex * 15))}
          isDark={isDark}
          colors={colors}
          width={50}
        />
        <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>hr</Text>
        <WheelPicker
          items={durationMinutes}
          selectedIndex={minIndex}
          onSelect={(index) => onDurationChange(hourIndex * 60 + (index * 15))}
          isDark={isDark}
          colors={colors}
          width={50}
        />
        <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>min</Text>
      </View>
    </View>
  );
};

// Main Time Edit Modal
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
  // Parse time string to hours/minutes
  const parseTime = (time: string): { hour: number; minute: number } => {
    const [h, m] = time.split(':').map(Number);
    return { hour: h || 0, minute: m || 0 };
  };

  // Format time to string (24-hour format)
  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const calcDuration = (startH: number, startM: number, endH: number, endM: number): number => {
    let startMins = startH * 60 + startM;
    let endMins = endH * 60 + endM;
    if (endMins < startMins) endMins += 24 * 60;
    return Math.max(15, endMins - startMins);
  };

  const calcEndTime = (startH: number, startM: number, duration: number): { hour: number; minute: number } => {
    let endMins = startH * 60 + startM + duration;
    if (endMins >= 24 * 60) endMins -= 24 * 60;
    return { hour: Math.floor(endMins / 60), minute: endMins % 60 };
  };

  const initial = {
    start: parseTime(initialStartTime),
    end: parseTime(initialEndTime),
  };

  const [startHour, setStartHour] = useState(initial.start.hour);
  const [startMinute, setStartMinute] = useState(initial.start.minute);
  const [endHour, setEndHour] = useState(initial.end.hour);
  const [endMinute, setEndMinute] = useState(initial.end.minute);
  const [duration, setDuration] = useState(calcDuration(initial.start.hour, initial.start.minute, initial.end.hour, initial.end.minute));
  const [lastEdited, setLastEdited] = useState<'start' | 'end' | 'duration'>('start');

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      const start = parseTime(initialStartTime);
      const end = parseTime(initialEndTime);
      setStartHour(start.hour);
      setStartMinute(start.minute);
      setEndHour(end.hour);
      setEndMinute(end.minute);
      setDuration(calcDuration(start.hour, start.minute, end.hour, end.minute));
    }
  }, [visible, initialStartTime, initialEndTime]);

  // Auto-calculate based on last edited
  useEffect(() => {
    if (lastEdited === 'start' || lastEdited === 'duration') {
      // Calculate end time
      const newEnd = calcEndTime(startHour, startMinute, duration);
      setEndHour(newEnd.hour);
      setEndMinute(newEnd.minute);
    } else if (lastEdited === 'end') {
      // Calculate duration
      const newDuration = calcDuration(startHour, startMinute, endHour, endMinute);
      setDuration(newDuration);
    }
  }, [startHour, startMinute, endHour, endMinute, duration, lastEdited]);

  const handleStartChange = (hour: number, minute: number) => {
    setStartHour(hour);
    setStartMinute(minute);
    setLastEdited('start');
  };

  const handleEndChange = (hour: number, minute: number) => {
    setEndHour(hour);
    setEndMinute(minute);
    setLastEdited('end');
  };

  const handleDurationChange = (mins: number) => {
    setDuration(mins);
    setLastEdited('duration');
  };

  const handleSave = () => {
    onSave(formatTime(startHour, startMinute), formatTime(endHour, endMinute));
    onClose();
  };

  const startIsPM = startHour >= 12;
  const endIsPM = endHour >= 12;

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: isDark ? 0.6 : 0.15,
    shadowRadius: 16,
    elevation: 10,
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.card, { backgroundColor: colors.card }, cardShadow]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Time</Text>
              {taskLabel && (
                <Text style={[styles.taskLabel, { color: colors.textSecondary }]}>{taskLabel}</Text>
              )}
            </View>

            {/* Start Time */}
            <TimeWheelGroup
              label="START"
              hour={startHour}
              minute={startMinute}
              isPM={startIsPM}
              onHourChange={(h) => handleStartChange(h, startMinute)}
              onMinuteChange={(m) => handleStartChange(startHour, m)}
              onPeriodChange={(isPM) => {
                const newHour = isPM
                  ? (startHour < 12 ? startHour + 12 : startHour)
                  : (startHour >= 12 ? startHour - 12 : startHour);
                handleStartChange(newHour, startMinute);
              }}
              isDark={isDark}
              colors={colors}
            />

            {/* End Time */}
            <TimeWheelGroup
              label="END"
              hour={endHour}
              minute={endMinute}
              isPM={endIsPM}
              onHourChange={(h) => handleEndChange(h, endMinute)}
              onMinuteChange={(m) => handleEndChange(endHour, m)}
              onPeriodChange={(isPM) => {
                const newHour = isPM
                  ? (endHour < 12 ? endHour + 12 : endHour)
                  : (endHour >= 12 ? endHour - 12 : endHour);
                handleEndChange(newHour, endMinute);
              }}
              isDark={isDark}
              colors={colors}
            />

            {/* Duration */}
            <DurationWheelGroup
              durationMins={duration}
              onDurationChange={handleDurationChange}
              isDark={isDark}
              colors={colors}
            />

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: isDark ? '#1a2230' : '#e8e2d8' }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }]}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>Save</Text>
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
    maxWidth: 380,
  },
  card: {
    borderRadius: 20,
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
  timeWheelGroup: {
    marginBottom: 20,
    alignItems: 'center',
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  wheelContainer: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    zIndex: -1,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 24,
  },
  manualInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 2,
    padding: 0,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  durationLabel: {
    fontSize: 14,
    marginLeft: 4,
    marginRight: 12,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
