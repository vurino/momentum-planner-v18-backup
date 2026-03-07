import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient';
import { format, addDays, subDays, getDay } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { ProgressCard } from '../../components/ProgressCard';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout constants
const LOGO_SECTION_HEIGHT = 90;
const DATE_SECTION_HEIGHT = 60;
const PROGRESS_CARD_HEIGHT = 110;
const HEADER_TOTAL_HEIGHT = LOGO_SECTION_HEIGHT + DATE_SECTION_HEIGHT;

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

// Logo Component
const Logo = ({ isDark, colors }: { isDark: boolean; colors: any }) => {
  return (
    <View style={[styles.logoContainer, { backgroundColor: colors.titleBg }]}>
      <Text style={[styles.logoText, { color: colors.logoText }]}>
        Momentum Planner
      </Text>
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
    'bed': 'bed-outline',
    'moon': 'moon-outline',
    'desktop': 'desktop-outline',
    'code-slash': 'code-slash-outline',
    'game-controller': 'game-controller-outline',
    'musical-notes': 'musical-notes-outline',
    'walk': 'walk-outline',
    'water': 'water-outline',
    'leaf': 'leaf-outline',
    'heart': 'heart-outline',
    'medkit': 'medkit-outline',
    'school': 'school-outline',
    'library': 'library-outline',
    'pencil': 'pencil-outline',
    'chatbubbles': 'chatbubbles-outline',
    'call': 'call-outline',
    'mail': 'mail-outline',
    'cart': 'cart-outline',
    'car': 'car-outline',
    'bicycle': 'bicycle-outline',
    'airplane': 'airplane-outline',
    'home': 'home-outline',
    'construct': 'construct-outline',
    'hammer': 'hammer-outline',
    'brush': 'brush-outline',
    'camera': 'camera-outline',
    'film': 'film-outline',
    'tv': 'tv-outline',
    'wifi': 'wifi-outline',
    'cloud': 'cloud-outline',
    'cash': 'cash-outline',
    'card': 'card-outline',
    'gift': 'gift-outline',
    'pizza': 'pizza-outline',
    'beer': 'beer-outline',
    'wine': 'wine-outline',
    'nutrition': 'nutrition-outline',
    'barbell': 'barbell-outline',
    'football': 'football-outline',
    'basketball': 'basketball-outline',
    'tennisball': 'tennisball-outline',
    'golf': 'golf-outline',
    'clock': 'time-outline',
  };
  return iconMap[iconName] || 'time-outline';
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
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: isDark ? 0.4 : 0.1,
    shadowRadius: 2,
  } : {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: isDark ? 0.4 : 0.1,
    shadowRadius: 8,
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

// Task Item Component with ROUND checkbox
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
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    elevation: 4,
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
          shadowOpacity: isDark ? 0.2 : 0.15,
        },
      ]}
      onPress={() => onToggle(task.id, !task.completed)}
      activeOpacity={0.7}
    >
      {/* ROUND Checkbox */}
      <View style={[
        styles.checkbox,
        { borderColor: colors.iconInactive },
        isCompleted && { backgroundColor: colors.success, borderColor: colors.success },
      ]}>
        {isCompleted && (
          <Ionicons name="checkmark" size={14} color={isDark ? '#0a0e12' : '#fff'} />
        )}
      </View>
      
      <View style={[
        styles.taskIconContainer,
        { backgroundColor: colors.surface },
        isCompleted && { backgroundColor: `${colors.success}20` },
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

// Get day type based on day of week
const getDayType = (date: Date): string => {
  const day = getDay(date);
  return day === 0 || day === 6 ? 'Weekend' : 'Weekday';
};

export default function TodayScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskWithSlot[]>([]);
  const [progress, setProgress] = useState<ProgressData>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayName = format(currentDate, 'EEEE');
  const dayType = getDayType(currentDate);

  const fetchData = useCallback(async () => {
    try {
      const slotsRes = await fetch(`${API_URL}/api/schedule-slots`);
      const slotsData = await slotsRes.json();
      setSlots(slotsData);

      const tasksRes = await fetch(`${API_URL}/api/daily-tasks/${dateStr}`);
      const tasksData = await tasksRes.json();

      const tasksWithSlots: TaskWithSlot[] = tasksData.map((task: DailyTask) => {
        const slot = slotsData.find((s: ScheduleSlot) => s.id === task.slot_id);
        return { ...task, slot: slot || { label: 'Unknown', icon: 'clock', start_time: '', end_time: '', group: '', order_index: 0, days: [] } };
      }).sort((a: TaskWithSlot, b: TaskWithSlot) => a.slot.order_index - b.slot.order_index);

      setTasks(tasksWithSlots);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

  // Animation interpolations
  // Header (logo + subtitle) fades out as progress card moves up
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_TOTAL_HEIGHT / 2, HEADER_TOTAL_HEIGHT],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  // Date section fades out
  const dateOpacity = scrollY.interpolate({
    inputRange: [0, DATE_SECTION_HEIGHT, HEADER_TOTAL_HEIGHT],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Progress card moves up and becomes sticky
  const progressTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_TOTAL_HEIGHT, HEADER_TOTAL_HEIGHT + 1],
    outputRange: [0, -HEADER_TOTAL_HEIGHT, -HEADER_TOTAL_HEIGHT],
    extrapolate: 'clamp',
  });

  // Day/Date info fades IN inside progress card as we scroll
  const progressDateOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_TOTAL_HEIGHT / 2, HEADER_TOTAL_HEIGHT],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.bgGradient as any}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Fixed Background Header - Logo and Subtitle */}
        <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
          <Logo isDark={isDark} colors={colors} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Stay consistent, stay focused
          </Text>
        </Animated.View>

        {/* Fixed Date Navigation */}
        <Animated.View style={[
          styles.dateNav, 
          { top: insets.top + LOGO_SECTION_HEIGHT, opacity: dateOpacity }
        ]}>
          <EmbossedButton onPress={goToPrevDay} isDark={isDark} colors={colors}>
            <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          </EmbossedButton>
          
          <View style={styles.dateCenter}>
            <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
              {isToday ? 'Today' : dayName}
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {format(currentDate, 'MMMM d, yyyy')}
            </Text>
          </View>
          
          <EmbossedButton onPress={goToNextDay} isDark={isDark} colors={colors}>
            <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
          </EmbossedButton>
        </Animated.View>

        {/* Progress Card - Moves up and becomes sticky */}
        <Animated.View style={[
          styles.progressCardWrapper,
          { 
            top: insets.top + HEADER_TOTAL_HEIGHT,
            transform: [{ translateY: progressTranslateY }],
            zIndex: 100,
          }
        ]}>
          <View style={[styles.progressCard, { backgroundColor: colors.card }, cardShadow]}>
            {/* Left: Progress Circle */}
            <ProgressCard
              completed={progress.completed}
              total={progress.total}
              isDark={isDark}
              colors={colors}
              showDateInfo={true}
              dateInfoOpacity={progressDateOpacity}
              dayName={isToday ? 'Today' : dayName}
              dateText={format(currentDate, 'MMMM d, yyyy')}
            />
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent, 
              { paddingTop: HEADER_TOTAL_HEIGHT + PROGRESS_CARD_HEIGHT + 20 }
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
                progressViewOffset={HEADER_TOTAL_HEIGHT + PROGRESS_CARD_HEIGHT}
              />
            }
          >
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
          </Animated.ScrollView>
        )}
      </View>
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
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  logoContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 8,
  },
  dateNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 2,
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
  dateCenter: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    marginTop: 2,
  },
  progressCardWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  progressCard: {
    borderRadius: 14,
    overflow: 'hidden',
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
    paddingBottom: 20,
  },
  tasksSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 14,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  // ROUND checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12, // Fully round
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  taskTime: {
    fontSize: 12,
  },
});
