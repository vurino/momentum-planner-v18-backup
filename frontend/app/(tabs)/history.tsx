import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';

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
};

const neumorphicShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 6, height: 6 },
  shadowOpacity: 0.6,
  shadowRadius: 14,
  elevation: 8,
};

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

// Calendar Day Component
const CalendarDay = ({
  day,
  isCurrentMonth,
  isSelected,
  progress,
  onPress,
}: {
  day: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  progress?: DayProgress;
  onPress: () => void;
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
        isSelected && styles.calendarDaySelected,
        { backgroundColor: isCurrentMonth ? bgColor : 'transparent' },
      ]}
      onPress={onPress}
      disabled={!isCurrentMonth}
    >
      <Text
        style={[
          styles.calendarDayText,
          !isCurrentMonth && styles.calendarDayTextInactive,
          isSelected && styles.calendarDayTextSelected,
          isToday(day) && styles.calendarDayTextToday,
        ]}
      >
        {dayNumber}
      </Text>
      {hasProgress && isCurrentMonth && (
        <View style={styles.progressDot}>
          <View
            style={[
              styles.progressDotInner,
              { backgroundColor: percentComplete === 100 ? COLORS.success : COLORS.accent },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Task Item Component
const HistoryTaskItem = ({ task }: { task: TaskWithSlot }) => {
  const isCompleted = task.completed;

  return (
    <View
      style={[
        styles.taskItem,
        isCompleted && styles.taskItemCompleted,
      ]}
    >
      <View style={[
        styles.checkbox,
        isCompleted && styles.checkboxCompleted,
      ]}>
        {isCompleted && (
          <Ionicons name="checkmark" size={14} color="#0f141a" />
        )}
      </View>
      
      <View style={[
        styles.taskIconContainer,
        isCompleted && styles.taskIconContainerCompleted,
      ]}>
        <Ionicons 
          name={getIconName(task.slot.icon)} 
          size={18} 
          color={isCompleted ? COLORS.success : COLORS.iconInactive} 
        />
      </View>
      
      <View style={styles.taskContent}>
        <Text style={[
          styles.taskLabel,
          isCompleted && styles.taskLabelCompleted,
        ]}>
          {task.slot.label}
        </Text>
        <Text style={styles.taskTime}>
          {task.slot.start_time} — {task.slot.end_time}
        </Text>
      </View>
    </View>
  );
};

export default function HistoryScreen() {
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
        return { ...task, slot: slot || { label: 'Unknown', icon: 'clock', start_time: '', end_time: '', group: '', order_index: 0 } };
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.bgGradient as any}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Review your progress</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavButton}>
              <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <Text style={styles.monthText}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            
            <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <View style={styles.calendarCard}>
            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <View key={day} style={styles.weekdayCell}>
                  <Text style={styles.weekdayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {loading ? (
              <View style={styles.calendarLoading}>
                <ActivityIndicator size="small" color={COLORS.accent} />
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
                  />
                ))}
              </View>
            )}
          </View>

          {/* Selected Day Details */}
          {selectedDate && (
            <View style={styles.selectedDaySection}>
              <View style={styles.selectedDayHeader}>
                <Text style={styles.selectedDayTitle}>
                  {format(selectedDate, 'EEEE, MMMM d')}
                </Text>
                {selectedProgress && selectedProgress.total > 0 && (
                  <View style={styles.progressBadge}>
                    <Text style={styles.progressBadgeText}>
                      {selectedProgress.completed}/{selectedProgress.total} done
                    </Text>
                  </View>
                )}
              </View>

              {loadingTasks ? (
                <View style={styles.tasksLoading}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                </View>
              ) : selectedDayTasks.length > 0 ? (
                <View style={styles.tasksList}>
                  {selectedDayTasks.map(task => (
                    <HistoryTaskItem key={task.id} task={task} />
                  ))}
                </View>
              ) : (
                <View style={styles.noTasksContainer}>
                  <Ionicons name="calendar-outline" size={48} color={COLORS.textInactive} />
                  <Text style={styles.noTasksText}>No tasks recorded for this day</Text>
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
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...neumorphicShadow,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  calendarCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    ...neumorphicShadow,
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
    color: COLORS.textSecondary,
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
  calendarDaySelected: {
    backgroundColor: COLORS.accent,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  calendarDayTextInactive: {
    color: COLORS.textInactive,
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: COLORS.accent,
    fontWeight: '700',
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
    color: COLORS.textPrimary,
  },
  progressBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
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
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    ...neumorphicShadow,
  },
  taskItemCompleted: {
    borderColor: COLORS.success,
    borderWidth: 1,
    shadowColor: COLORS.success,
    shadowOpacity: 0.2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.iconInactive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  taskIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskIconContainerCompleted: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  taskContent: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  taskLabelCompleted: {
    color: COLORS.success,
  },
  taskTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noTasksContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    ...neumorphicShadow,
  },
  noTasksText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
