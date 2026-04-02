import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addDays, subDays, getDay, parse, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { useRouter } from 'expo-router';
import { useTheme, getCardShadow, getActiveGlow, getSuccessGlow, SPACING } from '../../context/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout constants
const PROGRESS_CARD_HEIGHT = 100;
const HEADER_HEIGHT = 140; // Logo + subtitle + date nav

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
  isCurrentTask?: boolean;
  overlappingWith?: string;
}

interface ProgressData {
  total: number;
  completed: number;
  percentage: number;
}

// Icon mapping
const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'restaurant': 'restaurant-outline', 'sunny': 'sunny-outline', 'briefcase': 'briefcase-outline',
    'cafe': 'cafe-outline', 'trending-up': 'trending-up-outline', 'book': 'book-outline',
    'fitness': 'fitness-outline', 'fast-food': 'fast-food-outline', 'analytics': 'analytics-outline',
    'code': 'code-outline', 'moon': 'moon-outline', 'bed': 'bed-outline', 'time': 'time-outline',
    'heart': 'heart-outline', 'musical-notes': 'musical-notes-outline', 'clock': 'time-outline',
    'game-controller': 'game-controller-outline', 'car': 'car-outline', 'home': 'home-outline',
    'pencil': 'pencil-outline', 'school': 'school-outline', 'walk': 'walk-outline',
    'water': 'water-outline', 'leaf': 'leaf-outline', 'medkit': 'medkit-outline',
  };
  return iconMap[iconName] || 'time-outline';
};

// Parse time string to minutes since midnight
const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if current time is within task time range
const isCurrentTask = (startTime: string, endTime: string): boolean => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(startTime);
  let endMinutes = parseTimeToMinutes(endTime);
  
  // Handle overnight tasks
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
    if (currentMinutes < startMinutes) {
      return currentMinutes + 24 * 60 >= startMinutes && currentMinutes + 24 * 60 <= endMinutes;
    }
  }
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// Check for overlapping tasks
const findOverlappingTasks = (tasks: TaskWithSlot[]): TaskWithSlot[] => {
  return tasks.map((task, index) => {
    const taskStart = parseTimeToMinutes(task.slot.start_time);
    const taskEnd = parseTimeToMinutes(task.slot.end_time);
    
    for (let i = 0; i < tasks.length; i++) {
      if (i === index) continue;
      const otherStart = parseTimeToMinutes(tasks[i].slot.start_time);
      const otherEnd = parseTimeToMinutes(tasks[i].slot.end_time);
      
      // Check overlap
      if ((taskStart < otherEnd && taskEnd > otherStart) || 
          (otherStart < taskEnd && otherEnd > taskStart)) {
        return { ...task, overlappingWith: tasks[i].slot.label };
      }
    }
    return task;
  });
};

// Get day type
const getDayType = (date: Date): string => {
  const day = getDay(date);
  return day === 0 || day === 6 ? 'Weekend' : 'Weekday';
};

// =============================================================================
// LOGO COMPONENT
// =============================================================================
const Logo = ({ isDark, colors }: { isDark: boolean; colors: any }) => (
  <View style={[styles.logoContainer, { backgroundColor: colors.titleBg }]}>
    <Text style={[styles.logoText, { color: colors.logoText }]}>Momentum Planner</Text>
  </View>
);

// =============================================================================
// EMBOSSED BUTTON
// =============================================================================
const EmbossedButton = ({ onPress, children, isDark, colors }: { 
  onPress: () => void; children: React.ReactNode; isDark: boolean; colors: any;
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
        isPressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      {children}
    </Pressable>
  );
};

// =============================================================================
// ANIMATED CHECKBOX - Scale + glow pulse + fade-in check
// =============================================================================
const AnimatedCheckbox = ({ 
  isCompleted, 
  onToggle, 
  colors, 
  isDark 
}: { 
  isCompleted: boolean; 
  onToggle: () => void; 
  colors: any; 
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkOpacity = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCompleted) {
      // Scale up + glow pulse + fade in check
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]),
        Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      checkOpacity.setValue(0);
      glowAnim.setValue(0);
    }
  }, [isCompleted]);

  const handlePress = () => {
    // Quick feedback animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  const glowStyle = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[
        styles.checkbox,
        { 
          borderColor: isCompleted ? colors.success : colors.iconInactive,
          backgroundColor: isCompleted ? colors.success : 'transparent',
          transform: [{ scale: scaleAnim }],
        },
      ]}>
        <Animated.View style={{ opacity: checkOpacity }}>
          <Ionicons name="checkmark" size={14} color={isDark ? '#0a0e12' : '#fff'} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// =============================================================================
// TASK ITEM - With overlapping warning and current task highlight
// =============================================================================
const TaskItem = ({ 
  task, 
  onToggle,
  onFocus,
  onNotesPress,
  isDark,
  colors,
  fadeOpacity,
}: { 
  task: TaskWithSlot; 
  onToggle: (taskId: string, completed: boolean) => void;
  onFocus: (task: TaskWithSlot) => void;
  onNotesPress?: (task: TaskWithSlot) => void;
  isDark: boolean;
  colors: any;
  fadeOpacity?: Animated.AnimatedInterpolation<number>;
}) => {
  const isCompleted = task.completed;
  const isCurrent = task.isCurrentTask;
  const hasNotes = task.slot.notes;

  // Only highlight the checkbox icon when completed, not the whole card
  const cardStyle = [
    styles.taskItem,
    { backgroundColor: colors.card },
    getCardShadow(isDark),
    isCurrent && !isCompleted && getActiveGlow(colors), // Orange glow for current task
  ];

  // Handle tap anywhere on task to toggle
  const handleTaskPress = () => {
    onToggle(task.id, !task.completed);
  };

  return (
    <Animated.View style={[{ opacity: fadeOpacity || 1 }]}>
      <TouchableOpacity 
        style={cardStyle} 
        onPress={handleTaskPress}
        activeOpacity={0.7}
      >
        {/* Animated Checkbox - only this turns green */}
        <AnimatedCheckbox
          isCompleted={isCompleted}
          onToggle={handleTaskPress}
          colors={colors}
          isDark={isDark}
        />
        
        {/* Icon - stays neutral color */}
        <View style={[
          styles.taskIconContainer,
          { backgroundColor: colors.surface },
        ]}>
          <Ionicons 
            name={getIconName(task.slot.icon)} 
            size={20} 
            color={isCurrent && !isCompleted ? colors.accent : colors.iconInactive} 
          />
        </View>
        
        {/* Content */}
        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text style={[
              styles.taskLabel,
              { color: colors.textPrimary },
              isCompleted && styles.taskLabelCompleted,
            ]} numberOfLines={1}>
              {task.slot.label}
            </Text>
            {isCurrent && !isCompleted && (
              <View style={[styles.currentBadge, { backgroundColor: colors.accentGlow }]}>
                <Text style={[styles.currentBadgeText, { color: colors.accent }]}>NOW</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.taskTime, { color: colors.textInactive }]}>
            {task.slot.start_time} — {task.slot.end_time}
          </Text>
          
          {/* Overlapping warning */}
          {task.overlappingWith && !isCompleted && (
            <View style={styles.warningRow}>
              <Ionicons name="warning-outline" size={12} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Overlaps with {task.overlappingWith}
              </Text>
            </View>
          )}
        </View>

        {/* Right side icons */}
        <View style={styles.taskActions}>
          {/* Notes icon */}
          {hasNotes && (
            <TouchableOpacity 
              style={[styles.notesButton, { backgroundColor: colors.surface }]}
              onPress={(e) => {
                e.stopPropagation();
                onNotesPress?.(task);
              }}
            >
              <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          
          {/* Focus button for current task */}
          {isCurrent && !isCompleted && (
            <TouchableOpacity 
              style={[styles.focusButton, { backgroundColor: colors.accentGlow }]}
              onPress={(e) => {
                e.stopPropagation();
                onFocus(task);
              }}
            >
              <Ionicons name="eye-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// =============================================================================
// PROGRESS CARD - Pastel green color
// =============================================================================
const ProgressCard = ({ 
  completed, 
  total, 
  dayName, 
  dateText,
  showDateInfo,
  dateInfoOpacity,
  barPosition,
  isDark, 
  colors 
}: { 
  completed: number; 
  total: number; 
  dayName: string;
  dateText: string;
  showDateInfo: boolean;
  dateInfoOpacity: Animated.AnimatedInterpolation<number>;
  barPosition: Animated.AnimatedInterpolation<number>;
  isDark: boolean; 
  colors: any;
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  // Pastel green color for progress
  const progressColor = colors.progressGreen;
  
  const barWidthAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(barWidthAnim, {
      toValue: percentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Import SVG components
  const Svg = require('react-native-svg').default;
  const { Circle } = require('react-native-svg');

  return (
    <View style={[styles.progressCard, { backgroundColor: colors.card }, getCardShadow(isDark)]}>
      {/* Day/Date info - fades in on scroll */}
      <Animated.View style={[styles.progressDateInfo, { opacity: dateInfoOpacity }]}>
        <Text style={[styles.progressDayName, { color: colors.textPrimary }]}>{dayName}</Text>
        <Text style={[styles.progressDateText, { color: colors.textInactive }]}>{dateText}</Text>
      </Animated.View>
      
      {/* Main progress content */}
      <Animated.View style={[styles.progressContent, { marginTop: barPosition }]}>
        {/* Progress Circle */}
        <View style={styles.progressCircleContainer}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isDark ? '#2a3344' : '#d5d0c5'}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.progressCircleText}>
            <Text style={[styles.progressPercentage, { color: progressColor }]}>{percentage}%</Text>
          </View>
        </View>
        
        {/* Info */}
        <View style={styles.progressInfo}>
          <Text style={[styles.progressActivityCount, { color: colors.textSecondary }]}>
            {completed} of {total} completed
          </Text>
          
          {/* Progress Bar - centered */}
          <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#2a3344' : '#d5d0c5' }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: progressColor,
                  width: barWidthAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

// =============================================================================
// MAIN TODAY SCREEN
// =============================================================================
export default function TodayScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskWithSlot[]>([]);
  const [progress, setProgress] = useState<ProgressData>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const currentTaskIndex = useRef<number>(-1);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayName = format(currentDate, 'EEEE');
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

  const fetchData = useCallback(async () => {
    try {
      const [slotsRes, tasksRes] = await Promise.all([
        fetch(`${API_URL}/api/schedule-slots`),
        fetch(`${API_URL}/api/daily-tasks/${dateStr}`),
      ]);
      
      const slotsData = await slotsRes.json();
      const tasksData = await tasksRes.json();

      let tasksWithSlots: TaskWithSlot[] = tasksData
        .map((task: DailyTask) => {
          const slot = slotsData.find((s: ScheduleSlot) => s.id === task.slot_id);
          if (!slot) return null;
          return { 
            ...task, 
            slot,
            isCurrentTask: isToday && isCurrentTask(slot.start_time, slot.end_time),
          };
        })
        .filter(Boolean)
        .sort((a: TaskWithSlot, b: TaskWithSlot) => a.slot.order_index - b.slot.order_index);

      // Find overlapping tasks
      tasksWithSlots = findOverlappingTasks(tasksWithSlots);
      
      // Find current task index for auto-scroll
      currentTaskIndex.current = tasksWithSlots.findIndex(t => t.isCurrentTask);

      setTasks(tasksWithSlots);
      
      const total = tasksWithSlots.length;
      const completed = tasksWithSlots.filter((t: TaskWithSlot) => t.completed).length;
      setProgress({ total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateStr, isToday]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-scroll to current task on load
  useEffect(() => {
    if (!loading && currentTaskIndex.current >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: currentTaskIndex.current,
          animated: true,
          viewPosition: 0.3,
        });
      }, 500);
    }
  }, [loading]);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`${API_URL}/api/daily-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } : t));
      setProgress(prev => {
        const newCompleted = completed ? prev.completed + 1 : prev.completed - 1;
        return {
          ...prev,
          completed: newCompleted,
          percentage: prev.total > 0 ? Math.round((newCompleted / prev.total) * 100) : 0,
        };
      });
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const goToPrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const goToNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleFocusMode = (task: TaskWithSlot) => {
    router.push({
      pathname: '/focus',
      params: {
        label: task.slot.label,
        icon: task.slot.icon,
        start_time: task.slot.start_time,
        end_time: task.slot.end_time,
      },
    });
  };

  // Scroll animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const progressTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  const dateInfoOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const barPosition = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, 10],
    extrapolate: 'clamp',
  });

  // Task fade as it scrolls under progress card
  const getTaskFadeOpacity = (index: number) => {
    return scrollY.interpolate({
      inputRange: [0, HEADER_HEIGHT + (index * 80), HEADER_HEIGHT + (index * 80) + 40],
      outputRange: [1, 1, 0.3],
      extrapolate: 'clamp',
    });
  };

  const renderTask = useCallback(({ item, index }: { item: TaskWithSlot; index: number }) => (
    <TaskItem
      task={item}
      onToggle={handleToggleTask}
      onFocus={handleFocusMode}
      onNotesPress={(task) => {
        // TODO: Open notes modal
        console.log('Notes pressed for:', task.slot.label);
      }}
      isDark={isDark}
      colors={colors}
      fadeOpacity={getTaskFadeOpacity(index)}
    />
  ), [isDark, colors, scrollY]);

  const ListHeader = () => (
    <View style={{ height: PROGRESS_CARD_HEIGHT + SPACING.md }} />
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
      
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Fixed Header - Logo, Subtitle, Date Nav */}
        <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
          <Logo isDark={isDark} colors={colors} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Stay consistent, stay focused
          </Text>
          
          {/* Date Navigation */}
          <View style={styles.dateNav}>
            <EmbossedButton onPress={goToPrevDay} isDark={isDark} colors={colors}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </EmbossedButton>
            
            <View style={styles.dateCenter}>
              <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
                {isToday ? 'Today' : dayName}
              </Text>
              <Text style={[styles.dateText, { color: colors.textInactive }]}>
                {format(currentDate, 'MMMM d, yyyy')}
              </Text>
            </View>
            
            <EmbossedButton onPress={goToNextDay} isDark={isDark} colors={colors}>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </EmbossedButton>
          </View>
        </Animated.View>

        {/* Progress Card - Sticky on scroll */}
        <Animated.View style={[
          styles.progressCardWrapper,
          { 
            top: insets.top + HEADER_HEIGHT,
            transform: [{ translateY: progressTranslateY }],
          }
        ]}>
          <ProgressCard
            completed={progress.completed}
            total={progress.total}
            dayName={isToday ? 'Today' : dayName}
            dateText={format(currentDate, 'MMMM d, yyyy')}
            showDateInfo={true}
            dateInfoOpacity={dateInfoOpacity}
            barPosition={barPosition}
            isDark={isDark}
            colors={colors}
          />
        </Animated.View>

        {/* Tasks List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <Animated.FlatList
            ref={flatListRef}
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={renderTask}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={[
              styles.listContent, 
              { paddingTop: HEADER_HEIGHT + SPACING.md }
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                progressViewOffset={HEADER_HEIGHT + PROGRESS_CARD_HEIGHT}
              />
            }
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
              }, 100);
            }}
          />
        )}
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 44,
  },
  logoContainer: {
    marginHorizontal: SPACING.lg,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  embossedButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  
  progressCardWrapper: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 10,
  },
  progressCard: {
    borderRadius: 14,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  progressDateInfo: {
    marginBottom: SPACING.xs,
  },
  progressDayName: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressDateText: {
    fontSize: 11,
    marginTop: 1,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircleContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  progressCircleText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressInfo: {
    flex: 1,
  },
  progressActivityCount: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  taskIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: SPACING.sm,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  taskTime: {
    fontSize: 11,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  warningText: {
    fontSize: 10,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLabelCompleted: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.7,
  },
});
