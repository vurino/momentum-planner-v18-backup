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
  Keyboard,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;

interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isDark: boolean;
  colors: any;
  width?: number;
  allowManualInput?: boolean;
  manualInputRange?: { min: number; max: number };
  onManualInput?: (value: number) => void;
}

// Wheel Picker with center selection (no tap needed) and manual input
const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedIndex,
  onSelect,
  isDark,
  colors,
  width = 50,
  allowManualInput = false,
  manualInputRange,
  onManualInput,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [manualValue, setManualValue] = useState('');

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
  }, []);

  // Auto-select on scroll end (center selection - no tap needed)
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < items.length && index !== selectedIndex) {
      onSelect(index);
    }
    scrollViewRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated: true,
    });
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < items.length) {
      // Snap to closest item
      scrollViewRef.current?.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: true,
      });
      if (index !== selectedIndex) {
        onSelect(index);
      }
    }
  };

  const handleManualSubmit = () => {
    if (onManualInput && manualValue && manualInputRange) {
      const val = parseInt(manualValue);
      if (!isNaN(val) && val >= manualInputRange.min && val <= manualInputRange.max) {
        onManualInput(val);
      }
    }
    setIsEditing(false);
    setManualValue('');
    Keyboard.dismiss();
  };

  // Tap on selected item opens manual input
  const handleCenterTap = () => {
    if (allowManualInput) {
      setIsEditing(true);
      setManualValue(items[selectedIndex]);
    }
  };

  return (
    <View style={[styles.wheelContainer, { width, height: ITEM_HEIGHT * VISIBLE_ITEMS }]}>
      <View style={[
        styles.selectionIndicator,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          top: ITEM_HEIGHT,
        }
      ]} />
      
      {isEditing ? (
        <View style={[styles.manualInputContainer, { top: ITEM_HEIGHT }]}>
          <TextInput
            style={[styles.manualInput, { color: colors.accent }]}
            value={manualValue}
            onChangeText={setManualValue}
            onBlur={handleManualSubmit}
            onSubmitEditing={handleManualSubmit}
            keyboardType="number-pad"
            maxLength={2}
            autoFocus
            selectTextOnFocus
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollEndDrag={handleScrollEndDrag}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        >
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.2;

            return (
              <TouchableOpacity
                key={index}
                style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
                onPress={isSelected ? handleCenterTap : undefined}
                activeOpacity={isSelected ? 0.7 : 1}
              >
                <Text
                  style={[
                    styles.wheelItemText,
                    {
                      color: isSelected ? colors.accent : colors.textSecondary,
                      opacity,
                      fontWeight: isSelected ? '700' : '400',
                      fontSize: isSelected ? 22 : 16,
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

// Time Wheel Row with Label on Left
interface TimeWheelRowProps {
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

const TimeWheelRow: React.FC<TimeWheelRowProps> = ({
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
  // Hours 1-12
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  // Minutes in 5-minute increments for wheel display
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];

  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const hourIndex = displayHour - 1;
  // Find closest 5-minute increment for display
  const minuteIndex = Math.round(minute / 5) % 12;
  const periodIndex = isPM ? 1 : 0;

  return (
    <View style={styles.timeWheelRow}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.wheelsGroup}>
        <WheelPicker
          items={hours}
          selectedIndex={hourIndex}
          onSelect={(index) => {
            const newHour = index + 1;
            onHourChange(isPM && newHour !== 12 ? newHour + 12 : (!isPM && newHour === 12 ? 0 : newHour));
          }}
          isDark={isDark}
          colors={colors}
          width={48}
          allowManualInput
          manualInputRange={{ min: 1, max: 12 }}
          onManualInput={(val) => {
            if (val >= 1 && val <= 12) {
              onHourChange(isPM && val !== 12 ? val + 12 : (!isPM && val === 12 ? 0 : val));
            }
          }}
        />
        <Text style={[styles.colonSeparator, { color: colors.textPrimary }]}>:</Text>
        <WheelPicker
          items={minutes}
          selectedIndex={minuteIndex}
          onSelect={(index) => onMinuteChange(index * 5)}
          isDark={isDark}
          colors={colors}
          width={48}
          allowManualInput
          manualInputRange={{ min: 0, max: 59 }}
          onManualInput={(val) => {
            // Allow any minute 0-59 via manual input
            if (val >= 0 && val <= 59) {
              onMinuteChange(val);
            }
          }}
        />
        <WheelPicker
          items={periods}
          selectedIndex={periodIndex}
          onSelect={(index) => onPeriodChange(index === 1)}
          isDark={isDark}
          colors={colors}
          width={44}
        />
      </View>
    </View>
  );
};

// Duration Wheel Row with manual input
interface DurationWheelRowProps {
  durationMins: number;
  onDurationChange: (mins: number) => void;
  isDark: boolean;
  colors: any;
}

const DurationWheelRow: React.FC<DurationWheelRowProps> = ({
  durationMins,
  onDurationChange,
  isDark,
  colors,
}) => {
  // Hours 0-12
  const durationHours = Array.from({ length: 13 }, (_, i) => i.toString());
  // Minutes in 5-minute increments
  const durationMinutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const hourIndex = Math.min(hours, 12);
  const minIndex = Math.round(mins / 5) % 12;

  return (
    <View style={styles.durationRow}>
      <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>DURATION</Text>
      <View style={styles.durationWheels}>
        <WheelPicker
          items={durationHours}
          selectedIndex={hourIndex}
          onSelect={(index) => onDurationChange(index * 60 + (minIndex * 5))}
          isDark={isDark}
          colors={colors}
          width={44}
          allowManualInput
          manualInputRange={{ min: 0, max: 12 }}
          onManualInput={(val) => {
            if (val >= 0 && val <= 12) {
              onDurationChange(val * 60 + (minIndex * 5));
            }
          }}
        />
        <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>h</Text>
        <WheelPicker
          items={durationMinutes}
          selectedIndex={minIndex}
          onSelect={(index) => onDurationChange(hourIndex * 60 + (index * 5))}
          isDark={isDark}
          colors={colors}
          width={44}
          allowManualInput
          manualInputRange={{ min: 0, max: 59 }}
          onManualInput={(val) => {
            // Allow any minute 0-59 via manual input
            if (val >= 0 && val <= 59) {
              onDurationChange(hourIndex * 60 + val);
            }
          }}
        />
        <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>m</Text>
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
  const parseTime = (time: string): { hour: number; minute: number } => {
    const [h, m] = time.split(':').map(Number);
    return { hour: h || 0, minute: m || 0 };
  };

  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const calcDuration = (startH: number, startM: number, endH: number, endM: number): number => {
    let startMins = startH * 60 + startM;
    let endMins = endH * 60 + endM;
    if (endMins < startMins) endMins += 24 * 60;
    return Math.max(5, endMins - startMins);
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

  useEffect(() => {
    if (lastEdited === 'start' || lastEdited === 'duration') {
      const newEnd = calcEndTime(startHour, startMinute, duration);
      setEndHour(newEnd.hour);
      setEndMinute(newEnd.minute);
    } else if (lastEdited === 'end') {
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
    setDuration(Math.max(5, mins));
    setLastEdited('duration');
  };

  const handleSave = () => {
    onSave(formatTime(startHour, startMinute), formatTime(endHour, endMinute));
    onClose();
  };

  const startIsPM = startHour >= 12;
  const endIsPM = endHour >= 12;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Header */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Time</Text>
            {taskLabel && (
              <Text style={[styles.taskLabel, { color: colors.textSecondary }]}>{taskLabel}</Text>
            )}

            {/* Start Time Row */}
            <TimeWheelRow
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

            {/* End Time Row */}
            <TimeWheelRow
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

            {/* Duration Row */}
            <DurationWheelRow
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
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }]}
                onPress={handleSave}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>Save</Text>
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
    width: SCREEN_WIDTH - 32,
    maxWidth: 360,
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  taskLabel: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  timeWheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    width: 50,
  },
  wheelsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  wheelContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    zIndex: -1,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {},
  manualInputContainer: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualInput: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  colonSeparator: {
    fontSize: 22,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  durationRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  durationWheels: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitLabel: {
    fontSize: 14,
    marginLeft: 2,
    marginRight: 10,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
