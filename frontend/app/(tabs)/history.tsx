import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface DayProgress {
  date: string;
  day: number;
  total: number;
  completed: number;
  percentage: number;
}

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

interface DailyTask {
  id: string;
  date: string;
  slot_id: string;
  completed: boolean;
}

interface TaskWithSlot extends DailyTask {
  slot: ScheduleSlot;
}

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

// Embossed Button Component
const EmbossedButton = ({ 
  onPress, 
  children, 
  style,
  isDark,
  colors,
}: { 
  onPress: () => void; 
  children: React.ReactNode; 
  style?: any;
  isDark: boolean;
  colors: any;
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const buttonShadow = isPressed ? {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: isDark ? 0.6 : 0.15,
    shadowRadius: 4,
  } : {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: isDark ? 0.55 : 0.12,
    shadowRadius: 12,
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.embossedButton,
        { backgroundColor: colors.card },
        buttonShadow,
        isPressed && styles.embossedButtonPressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

// Calendar Day Component
const CalendarDay = ({
  day,
  isCurrentMonth,
  isSelected,
  progress,
  onPress,
  colors,
}: {
  day: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  progress?: DayProgress;
  onPress: () => void;
  colors: any;
}) => {
  const dayNumber = format(day, 'd');
  const hasProgress = progress && progress.total > 0;
  const percentComplete = progress?.percentage || 0;

  let bgColor = 'transparent';
  if (percentComplete === 100) {
    bgColor = 'rgba(74, 222, 128, 0.3)';
  } else if (percentComplete >= 50) {
    bgColor = 'rgba(255, 106, 46, 0.3)';
  } else if (percentComplete > 0) {
    bgColor = 'rgba(255, 106, 46, 0.15)';
  }

  return (
    <TouchableOpacity
      style={[
        styles.calendarDay,
        isSelected && { backgroundColor: colors.accent },
        { backgroundColor: isCurrentMonth && !isSelected ? bgColor : isSelected ? colors.accent : 'transparent' },
      ]}
      onPress={onPress}
      disabled={!isCurrentMonth}
    >
      <Text
        style={[
          styles.calendarDayText,
          { color: colors.textPrimary },
          !isCurrentMonth && { color: colors.textInactive },
          isSelected && { color: '#fff', fontWeight: '700' },
          isToday(day) && !isSelected && { color: colors.accent, fontWeight: '700' },
        ]}
      >
        {dayNumber}
      </Text>
      {hasProgress && isCurrentMonth && (
        <View style={styles.progressDot}>
          <View
            style={[
              styles.progressDotInner,
              { backgroundColor: percentComplete === 100 ? colors.success : colors.accent },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Task Item Component
const HistoryTaskItem = ({ task, isDark, colors }: { task: TaskWithSlot; isDark: boolean; colors: any }) => {
  const isCompleted = task.completed;

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: isDark ? 0.55 : 0.12,
    shadowRadius: 12,
    elevation: 8,
  };

  return (
    <View
      style={[
        styles.taskItem,
        { backgroundColor: colors.card },
        cardShadow,
        isCompleted && {
          borderColor: colors.success,
          borderWidth: 1,
          shadowColor: colors.success,
          shadowOpacity: isDark ? 0.2 : 0.15,
        },
      ]}
    >
      <View style={[
        styles.checkbox,
        { borderColor: colors.iconInactive },
        isCompleted && { backgroundColor: colors.success, borderColor: colors.success },
      ]}>
        {isCompleted && (
          <Ionicons name="checkmark" size={14} color={isDark ? '#0f141a' : '#fff'} />
        )}
      </View>
      
      <View style={[
        styles.taskIconContainer,
        { backgroundColor: colors.surface },
        isCompleted && { backgroundColor: `${colors.success}25` },
      ]}>
        <Ionicons 
          name={getIconName(task.slot.icon)} 
          size={18} 
          color={isCompleted ? colors.success : colors.iconInactive} 
        />
      </View>
      
      <View style={styles.taskContent}>
        <Text style={[
          styles.taskLabel,
          { color: colors.textPrimary },
          isCompleted && { color: colors.success },
        ]}>
          {task.slot.label}
        </Text>
        <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
          {task.slot.start_time} — {task.slot.end_time}
        </Text>
      </View>
    </View>
  );
};

export default function HistoryScreen() {
  const { isDark, colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [monthProgress, setMonthProgress] = useState<DayProgress[]>([]);
  const [selectedDayTasks, setSelectedDayTasks] = useState<TaskWithSlot[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for alignment
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const fetchMonthProgress = useCallback(async () => {
    setLoading(true);
    try {
      const [progressRes, slotsRes] = await Promise.all([
        fetch(`${API_URL}/api/monthly-progress/${year}/${month}`),
        fetch(`${API_URL}/api/schedule-slots`),
      ]);
      
      const progressData = await progressRes.json();
      const slotsData = await slotsRes.json();
      
      setMonthProgress(progressData);
      setSlots(slotsData);
    } catch (error) {
      console.error('Error fetching month progress:', error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMonthProgress();
  }, [fetchMonthProgress]);

  const fetchDayTasks = async (dateStr: string) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`${API_URL}/api/daily-tasks/${dateStr}`);
      const tasks = await res.json();

      const tasksWithSlots: TaskWithSlot[] = tasks.map((task: DailyTask) => {
        const slot = slots.find(s => s.id === task.slot_id);
        return { ...task, slot: slot || { label: 'Unknown', icon: 'clock', start_time: '', end_time: '', group: '', order_index: 0, days: [] } };
      }).sort((a: TaskWithSlot, b: TaskWithSlot) => a.slot.order_index - b.slot.order_index);

      setSelectedDayTasks(tasksWithSlots);
    } catch (error) {
      console.error('Error fetching day tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleDayPress = (day: Date) => {
    setSelectedDate(day);
    const dateStr = format(day, 'yyyy-MM-dd');
    fetchDayTasks(dateStr);
  };

  const goToPrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
    setSelectedDate(null);
    setSelectedDayTasks([]);
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
    setSelectedDate(null);
    setSelectedDayTasks([]);
  };

  const getProgressForDay = (day: Date): DayProgress | undefined => {
    const dayNum = parseInt(format(day, 'd'));
    return monthProgress.find(p => p.day === dayNum);
  };

  const selectedProgress = selectedDate ? getProgressForDay(selectedDate) : null;

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: isDark ? 0.55 : 0.12,
    shadowRadius: 12,
    elevation: 8,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.bgGradient as any}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>History</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Review your progress</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <EmbossedButton onPress={goToPrevMonth} isDark={isDark} colors={colors}>
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </EmbossedButton>
            
            <Text style={[styles.monthText, { color: colors.textPrimary }]}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            
            <EmbossedButton onPress={goToNextMonth} isDark={isDark} colors={colors}>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </EmbossedButton>
          </View>

          {/* Calendar */}
          <View style={[styles.calendarCard, { backgroundColor: colors.card }, cardShadow]}>
            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <View key={day} style={styles.weekdayCell}>
                  <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {loading ? (
              <View style={styles.calendarLoading}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : (
              <View style={styles.calendarGrid}>
                {paddingDays.map((_, index) => (
                  <View key={`padding-${index}`} style={styles.calendarDay} />
                ))}
                {calendarDays.map(day => (
                  <CalendarDay
                    key={day.toISOString()}
                    day={day}
                    isCurrentMonth={isSameMonth(day, currentMonth)}
                    isSelected={selectedDate ? format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') : false}
                    progress={getProgressForDay(day)}
                    onPress={() => handleDayPress(day)}
                    colors={colors}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Selected Day Details */}
          {selectedDate && (
            <View style={styles.selectedDaySection}>
              <View style={styles.selectedDayHeader}>
                <Text style={[styles.selectedDayTitle, { color: colors.textPrimary }]}>
                  {format(selectedDate, 'EEEE, MMMM d')}
                </Text>
                {selectedProgress && selectedProgress.total > 0 && (
                  <View style={[styles.progressBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.progressBadgeText, { color: colors.accent }]}>
                      {selectedProgress.completed}/{selectedProgress.total} done
                    </Text>
                  </View>
                )}
              </View>

              {loadingTasks ? (
                <View style={styles.tasksLoading}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : selectedDayTasks.length > 0 ? (
                <View style={styles.tasksList}>
                  {selectedDayTasks.map(task => (
                    <HistoryTaskItem key={task.id} task={task} isDark={isDark} colors={colors} />
                  ))}
                </View>
              ) : (
                <View style={[styles.noTasksContainer, { backgroundColor: colors.card }, cardShadow]}>
                  <Ionicons name="calendar-outline" size={48} color={colors.textInactive} />
                  <Text style={[styles.noTasksText, { color: colors.textSecondary }]}>No tasks recorded for this day</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  embossedButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  embossedButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
  },
  calendarCard: {
    borderRadius: 20,
    padding: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressDot: {
    position: 'absolute',
    bottom: 4,
  },
  progressDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDaySection: {
    marginTop: 20,
    marginBottom: 20,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedDayTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tasksLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  tasksList: {
    gap: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskContent: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskTime: {
    fontSize: 12,
  },
  noTasksContainer: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  noTasksText: {
    fontSize: 14,
    marginTop: 12,
  },
});
