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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { format, addDays, subDays } from 'date-fns';

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
  successGlow: 'rgba(74, 222, 128, 0.3)',
};

// Neumorphic shadow styles
const neumorphicShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 6, height: 6 },
  shadowOpacity: 0.6,
  shadowRadius: 14,
  elevation: 8,
};

const neumorphicInset = {
  shadowColor: '#000',
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.7,
  shadowRadius: 10,
};

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

interface ProgressData {
  total: number;
  completed: number;
  percentage: number;
}

// Progress Ring Component
const ProgressRing = ({ progress, size = 140, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) => {
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
          stroke="#232c3d"
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
        <Text style={styles.progressPercent}>{progress}%</Text>
        <Text style={styles.progressLabel}>DONE</Text>
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

// Task Item Component
const TaskItem = ({ 
  task, 
  onToggle 
}: { 
  task: TaskWithSlot; 
  onToggle: (taskId: string, completed: boolean) => void;
}) => {
  const isCompleted = task.completed;

  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        isCompleted && styles.taskItemCompleted,
      ]}
      onPress={() => onToggle(task.id, !task.completed)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.checkbox,
        isCompleted && styles.checkboxCompleted,
      ]}>
        {isCompleted && (
          <Ionicons name="checkmark" size={16} color="#0f141a" />
        )}
      </View>
      
      <View style={[
        styles.taskIconContainer,
        isCompleted && styles.taskIconContainerCompleted,
      ]}>
        <Ionicons 
          name={getIconName(task.slot.icon)} 
          size={20} 
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
    </TouchableOpacity>
  );
};

export default function TodayScreen() {
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
        return { ...task, slot: slot || { label: 'Unknown', icon: 'clock', start_time: '', end_time: '', group: '', order_index: 0 } };
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.bgGradient as any}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Momentum Planner</Text>
          <Text style={styles.appSubtitle}>Stay consistent, stay focused</Text>
        </View>

        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={goToPrevDay} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.dateCenter}>
            <Text style={styles.dateLabel}>{isToday ? 'Today' : format(currentDate, 'EEEE')}</Text>
            <Text style={styles.dateText}>{format(currentDate, 'MMMM d, yyyy')}</Text>
          </View>
          
          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
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
                tintColor={COLORS.accent}
              />
            }
          >
            {/* Progress Card */}
            <View style={styles.progressCard}>
              <ProgressRing progress={progress.percentage} />
              <Text style={styles.progressSummary}>
                {progress.completed} of {progress.total} activities completed
              </Text>
            </View>

            {/* Tasks List */}
            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>Schedule</Text>
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...neumorphicShadow,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...neumorphicShadow,
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
    color: COLORS.accent,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  progressSummary: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  tasksSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...neumorphicShadow,
  },
  taskItemCompleted: {
    borderColor: COLORS.success,
    borderWidth: 1,
    shadowColor: COLORS.success,
    shadowOpacity: 0.3,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.iconInactive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskIconContainerCompleted: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  taskContent: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  taskLabelCompleted: {
    color: COLORS.success,
  },
  taskTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
