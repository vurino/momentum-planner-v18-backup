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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, subDays } from 'date-fns';
import { useTheme, getCardShadow, SPACING } from '../../context/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DayProgress {
  date: string;
  day: number;
  total: number;
  completed: number;
  percentage: number;
}

interface WeeklyData {
  date: string;
  day_abbr: string;
  total: number;
  completed: number;
  percentage: number;
}

interface WeeklySummary {
  days: WeeklyData[];
  average_percentage: number;
  total_completed: number;
  total_tasks: number;
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
  notes?: string;
}

interface DailyTask {
  id: string;
  date: string;
  slot_id: string;
  completed: boolean;
  notes?: string;
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

// Get color based on completion percentage
const getCompletionColor = (percentage: number, colors: any) => {
  if (percentage >= 80) return colors.success; // Green
  if (percentage >= 40) return colors.accent;   // Orange
  if (percentage > 0) return colors.danger;     // Red
  return 'transparent';
};

const getCompletionBgColor = (percentage: number, colors: any, isDark: boolean) => {
  if (percentage >= 80) return isDark ? 'rgba(74, 222, 128, 0.25)' : 'rgba(34, 197, 94, 0.2)';
  if (percentage >= 40) return isDark ? 'rgba(255, 106, 46, 0.25)' : 'rgba(255, 106, 46, 0.2)';
  if (percentage > 0) return isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.2)';
  return 'transparent';
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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.embossedButton,
        { backgroundColor: colors.card },
        getCardShadow(isDark),
        isPressed && styles.embossedButtonPressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

// Calendar Day Component with color-coded backgrounds
const CalendarDay = ({
  day,
  isCurrentMonth,
  isSelected,
  progress,
  onPress,
  colors,
  isDark,
}: {
  day: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  progress?: DayProgress;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) => {
  const dayNumber = format(day, 'd');
  const hasProgress = progress && progress.total > 0;
  const percentComplete = progress?.percentage || 0;

  const bgColor = hasProgress && isCurrentMonth 
    ? getCompletionBgColor(percentComplete, colors, isDark) 
    : 'transparent';
  
  const borderColor = hasProgress && isCurrentMonth 
    ? getCompletionColor(percentComplete, colors)
    : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.calendarDay,
        { 
          backgroundColor: isSelected ? colors.accent : bgColor,
          borderWidth: hasProgress && isCurrentMonth && !isSelected ? 1.5 : 0,
          borderColor: isSelected ? colors.accent : borderColor,
        },
      ]}
      onPress={onPress}
      disabled={!isCurrentMonth}
    >
      <Text
        style={[
          styles.calendarDayText,
          { color: colors.textPrimary },
          !isCurrentMonth && { color: colors.textInactive, opacity: 0.4 },
          isSelected && { color: '#fff', fontWeight: '700' },
          isToday(day) && !isSelected && { color: colors.accent, fontWeight: '700' },
        ]}
      >
        {dayNumber}
      </Text>
    </TouchableOpacity>
  );
};

// Weekly Summary Bar Chart
const WeeklySummaryChart = ({ 
  data, 
  colors, 
  isDark 
}: { 
  data: WeeklySummary | null; 
  colors: any; 
  isDark: boolean;
}) => {
  if (!data) return null;

  const maxBarHeight = 60;

  return (
    <View style={[styles.weeklyCard, { backgroundColor: colors.card }, getCardShadow(isDark)]}>
      <View style={styles.weeklyHeader}>
        <Text style={[styles.weeklyTitle, { color: colors.textPrimary }]}>Weekly Overview</Text>
        <View style={[styles.avgBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.avgText, { color: colors.success }]}>
            {data.average_percentage}% avg
          </Text>
        </View>
      </View>
      
      <View style={styles.barsContainer}>
        {data.days.map((day, index) => {
          const barHeight = (day.percentage / 100) * maxBarHeight;
          const barColor = getCompletionColor(day.percentage, colors);
          
          return (
            <View key={index} style={styles.barColumn}>
              <View style={[styles.barWrapper, { height: maxBarHeight }]}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: barHeight || 2,
                      backgroundColor: barColor || colors.textInactive,
                      opacity: day.total === 0 ? 0.3 : 1,
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                {day.day_abbr}
              </Text>
              <Text style={[styles.barPercent, { color: day.total > 0 ? barColor : colors.textInactive }]}>
                {day.total > 0 ? `${day.percentage}%` : '-'}
              </Text>
            </View>
          );
        })}
      </View>
      
      <View style={[styles.weeklyStats, { borderTopColor: colors.divider }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>{data.total_completed}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{data.total_tasks}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Tasks</Text>
        </View>
      </View>
    </View>
  );
};

// Task Item Component
const HistoryTaskItem = ({ task, isDark, colors }: { task: TaskWithSlot; isDark: boolean; colors: any }) => {
  const isCompleted = task.completed;
  const hasNotes = task.slot.notes || task.notes;

  return (
    <View
      style={[
        styles.taskItem,
        { backgroundColor: colors.card },
        getCardShadow(isDark),
        isCompleted && {
          borderColor: colors.success,
          borderWidth: 1,
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
        isCompleted && { backgroundColor: colors.successGlow },
      ]}>
        <Ionicons 
          name={getIconName(task.slot.icon)} 
          size={18} 
          color={isCompleted ? colors.success : colors.iconInactive} 
        />
      </View>
      
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={[
            styles.taskLabel,
            { color: colors.textPrimary },
            isCompleted && { color: colors.success },
          ]} numberOfLines={1}>
            {task.slot.label}
          </Text>
          {hasNotes && (
            <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          )}
        </View>
        <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
          {task.slot.start_time} — {task.slot.end_time}
        </Text>
        {hasNotes && (
          <Text style={[styles.notePreview, { color: colors.textInactive }]} numberOfLines={1}>
            {task.notes || task.slot.notes}
          </Text>
        )}
      </View>
    </View>
  );
};

// Legend Component
const Legend = ({ colors }: { colors: any }) => (
  <View style={styles.legendContainer}>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>80%+</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>40-79%</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>&lt;40%</Text>
    </View>
  </View>
);

export default function HistoryScreen() {
  const { isDark, colors, weekStartsOnMonday } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [monthProgress, setMonthProgress] = useState<DayProgress[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
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

  // Add padding days for alignment - adjust for week start
  const rawStartDayOfWeek = monthStart.getDay();
  const startDayOfWeek = weekStartsOnMonday 
    ? (rawStartDayOfWeek === 0 ? 6 : rawStartDayOfWeek - 1) 
    : rawStartDayOfWeek;
  const paddingDays = Array(startDayOfWeek).fill(null);
  
  // Weekday headers based on setting
  const weekdayHeaders = weekStartsOnMonday 
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] 
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const fetchMonthProgress = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const [progressRes, slotsRes, weeklyRes] = await Promise.all([
        fetch(`${API_URL}/api/monthly-progress/${year}/${month}`),
        fetch(`${API_URL}/api/schedule-slots`),
        fetch(`${API_URL}/api/weekly-summary/${todayStr}?week_starts_monday=${weekStartsOnMonday}`),
      ]);
      
      const progressData = await progressRes.json();
      const slotsData = await slotsRes.json();
      const weeklyData = await weeklyRes.json();
      
      setMonthProgress(progressData);
      setSlots(slotsData);
      setWeeklySummary(weeklyData);
    } catch (error) {
      console.error('Error fetching month progress:', error);
    } finally {
      setLoading(false);
    }
  }, [year, month, weekStartsOnMonday]);

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
        return { 
          ...task, 
          slot: slot || { 
            label: 'Unknown', 
            icon: 'clock', 
            start_time: '', 
            end_time: '', 
            group: '', 
            order_index: 0, 
            days: [] 
          } 
        };
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
          {/* Weekly Summary Chart */}
          <WeeklySummaryChart data={weeklySummary} colors={colors} isDark={isDark} />

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <EmbossedButton onPress={goToPrevMonth} isDark={isDark} colors={colors}>
              <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
            </EmbossedButton>
            
            <Text style={[styles.monthText, { color: colors.textPrimary }]}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            
            <EmbossedButton onPress={goToNextMonth} isDark={isDark} colors={colors}>
              <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
            </EmbossedButton>
          </View>

          {/* Legend */}
          <Legend colors={colors} />

          {/* Calendar */}
          <View style={[styles.calendarCard, { backgroundColor: colors.card }, getCardShadow(isDark)]}>
            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {weekdayHeaders.map((day, idx) => (
                <View key={`${day}-${idx}`} style={styles.weekdayCell}>
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
                    isDark={isDark}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Selected Day Details */}
          {selectedDate && (
            <View style={styles.selectedDaySection}>
              <View style={styles.selectedDayHeader}>
                <View>
                  <Text style={[styles.selectedDayTitle, { color: colors.textPrimary }]}>
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </Text>
                  {selectedProgress && selectedProgress.total > 0 && (
                    <Text style={[styles.selectedDayPercent, { color: getCompletionColor(selectedProgress.percentage, colors) }]}>
                      {selectedProgress.percentage}% completed
                    </Text>
                  )}
                </View>
                {selectedProgress && selectedProgress.total > 0 && (
                  <View style={[
                    styles.progressBadge, 
                    { backgroundColor: getCompletionBgColor(selectedProgress.percentage, colors, isDark) }
                  ]}>
                    <Text style={[styles.progressBadgeText, { color: getCompletionColor(selectedProgress.percentage, colors) }]}>
                      {selectedProgress.completed}/{selectedProgress.total}
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
                <View style={[styles.noTasksContainer, { backgroundColor: colors.card }, getCardShadow(isDark)]}>
                  <Ionicons name="calendar-outline" size={40} color={colors.textInactive} />
                  <Text style={[styles.noTasksText, { color: colors.textSecondary }]}>No tasks recorded</Text>
                </View>
              )}
            </View>
          )}
          
          <View style={{ height: 40 }} />
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
    paddingHorizontal: SPACING.lg,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  
  // Weekly Summary
  weeklyCard: {
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  weeklyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  avgBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  avgText: {
    fontSize: 12,
    fontWeight: '700',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    justifyContent: 'flex-end',
    width: 20,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '500',
  },
  barPercent: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  
  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  embossedButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  embossedButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Legend
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
  },
  
  // Calendar
  calendarCard: {
    borderRadius: 18,
    padding: SPACING.md,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 11,
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
    borderRadius: 10,
    marginVertical: 2,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  calendarLoading: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Selected day
  selectedDaySection: {
    marginTop: SPACING.lg,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  selectedDayTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  selectedDayPercent: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  progressBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tasksLoading: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  tasksList: {
    gap: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  taskTime: {
    fontSize: 11,
    marginTop: 2,
  },
  notePreview: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  noTasksContainer: {
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
  },
  noTasksText: {
    fontSize: 13,
    marginTop: 10,
  },
});
