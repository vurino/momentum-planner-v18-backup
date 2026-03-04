import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { format, addDays, subDays } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

interface ProgressData {
  total: number;
  completed: number;
  percentage: number;
}

// Chrome Title Component
const ChromeTitle = ({ isDark, colors }: { isDark: boolean; colors: any }) => {
  return (
    <View style={[styles.chromeTitleContainer, { backgroundColor: isDark ? '#161b22' : '#dfe5ed' }]}>
      <Text style={[
        styles.chromeTitle,
        {
          color: isDark ? '#f5f7fa' : '#5a6472',
          textShadowColor: 'rgba(0,0,0,0.45)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
        }
      ]}>
        Momentum Planner
      </Text>
      {/* Glossy highlight effect */}
      <View style={styles.chromeHighlight} />
    </View>
  );
};

// Progress Ring Component
const ProgressRing = ({ 
  progress, 
  size = 140, 
  strokeWidth = 6,
  colors,
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  colors: any;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.progressRingContainer}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ff6a2e" />
            <Stop offset="100%" stopColor="#ff3c00" />
          </SvgGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.progressTextContainer}>
        <Text style={[styles.progressPercent, { color: colors.accent }]}>{progress}%</Text>
        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>DONE</Text>
      </View>
    </View>
  );
};

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
  isActive = false,
  isDark,
  colors,
}: { 
  onPress: () => void; 
  children: React.ReactNode; 
  style?: any;
  isActive?: boolean;
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
        isActive && { 
          shadowColor: colors.accent,
          shadowOpacity: 0.4,
        },
        isPressed && styles.embossedButtonPressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

// Task Item Component
const TaskItem = ({ 
  task, 
  onToggle,
  isDark,
  colors,
}: { 
  task: TaskWithSlot; 
  onToggle: (taskId: string, completed: boolean) => void;
  isDark: boolean;
  colors: any;
}) => {
  const isCompleted = task.completed;

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: isDark ? 0.55 : 0.12,
    shadowRadius: 12,
    elevation: 8,
  };

  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        { backgroundColor: colors.card },
        cardShadow,
        isCompleted && {
          borderColor: colors.success,
          borderWidth: 1,
          shadowColor: colors.success,
          shadowOpacity: isDark ? 0.3 : 0.2,
        },
      ]}
      onPress={() => onToggle(task.id, !task.completed)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.checkbox,
        { borderColor: colors.iconInactive },
        isCompleted && { backgroundColor: colors.success, borderColor: colors.success },
      ]}>
        {isCompleted && (
          <Ionicons name="checkmark" size={16} color={isDark ? '#0f141a' : '#fff'} />
        )}
      </View>
      
      <View style={[
        styles.taskIconContainer,
        { backgroundColor: colors.surface },
        isCompleted && { backgroundColor: `${colors.success}25` },
      ]}>
        <Ionicons 
          name={getIconName(task.slot.icon)} 
          size={20} 
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
    </TouchableOpacity>
  );
};

export default function TodayScreen() {
  const { isDark, colors } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskWithSlot[]>([]);
  const [progress, setProgress] = useState<ProgressData>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);

  const dateStr = format(currentDate, 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    try {
      // Fetch schedule slots
      const slotsRes = await fetch(`${API_URL}/api/schedule-slots`);
      const slotsData = await slotsRes.json();
      setSlots(slotsData);

      // Fetch daily tasks
      const tasksRes = await fetch(`${API_URL}/api/daily-tasks/${dateStr}`);
      const tasksData = await tasksRes.json();

      // Combine tasks with their slot data
      const tasksWithSlots: TaskWithSlot[] = tasksData.map((task: DailyTask) => {
        const slot = slotsData.find((s: ScheduleSlot) => s.id === task.slot_id);
        return { ...task, slot: slot || { label: 'Unknown', icon: 'clock', start_time: '', end_time: '', group: '', order_index: 0, days: [] } };
      }).sort((a: TaskWithSlot, b: TaskWithSlot) => a.slot.order_index - b.slot.order_index);

      setTasks(tasksWithSlots);

      // Calculate progress
      const total = tasksWithSlots.length;
      const completed = tasksWithSlots.filter((t: TaskWithSlot) => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      setProgress({ total, completed, percentage });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateStr]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`${API_URL}/api/daily-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      // Update local state
      setTasks(prev => {
        const updated = prev.map(t => t.id === taskId ? { ...t, completed } : t);
        const total = updated.length;
        const completedCount = updated.filter(t => t.completed).length;
        const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        setProgress({ total, completed: completedCount, percentage });
        return updated;
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const goToPrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const goToNextDay = () => setCurrentDate(prev => addDays(prev, 1));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

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
        {/* Chrome Title Header */}
        <ChromeTitle isDark={isDark} colors={colors} />
        <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>
          Stay consistent, stay focused
        </Text>

        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <EmbossedButton onPress={goToPrevDay} isDark={isDark} colors={colors}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </EmbossedButton>
          
          <View style={styles.dateCenter}>
            <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
              {isToday ? 'Today' : format(currentDate, 'EEEE')}
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {format(currentDate, 'MMMM d, yyyy')}
            </Text>
          </View>
          
          <EmbossedButton onPress={goToNextDay} isDark={isDark} colors={colors}>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </EmbossedButton>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
          >
            {/* Progress Card */}
            <View style={[
              styles.progressCard,
              { backgroundColor: colors.card },
              cardShadow,
            ]}>
              <ProgressRing progress={progress.percentage} colors={colors} />
              <Text style={[styles.progressSummary, { color: colors.textSecondary }]}>
                {progress.completed} of {progress.total} activities completed
              </Text>
            </View>

            {/* Tasks List */}
            <View style={styles.tasksSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Schedule</Text>
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
                  isDark={isDark}
                  colors={colors}
                />
              ))}
            </View>
          </ScrollView>
        )}
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
  chromeTitleContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  chromeTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  chromeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  appSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 8,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  dateCenter: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  progressRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 32,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
  },
  progressSummary: {
    fontSize: 14,
    marginTop: 16,
  },
  tasksSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 13,
  },
});
