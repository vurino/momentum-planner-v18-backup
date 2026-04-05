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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addDays, subDays, getDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { useTheme, getCardShadow, getActiveGlow, getSuccessGlow, SPACING } from '../../context/ThemeContext';
import { ProgressCard } from '../../components/ProgressCard';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout constants
const LOGO_SECTION_HEIGHT = 90;
const DATE_SECTION_HEIGHT = 60;
const PROGRESS_CARD_HEIGHT = 100;
const HEADER_HEIGHT = LOGO_SECTION_HEIGHT + DATE_SECTION_HEIGHT; // 150

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
// ANIMATED CHECKBOX
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
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

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
// TASK ITEM
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
  onNotesPress: (task: TaskWithSlot) => void;
  isDark: boolean;
  colors: any;
  fadeOpacity?: Animated.AnimatedInterpolation<number>;
}) => {
  const isCompleted = task.completed;
  const isCurrent = task.isCurrentTask;
  const hasNotes = task.slot.notes;

  const cardStyle = [
    styles.taskItem,
    { backgroundColor: colors.card },
    getCardShadow(isDark),
    isCurrent && !isCompleted && getActiveGlow(colors),
  ];

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
        <AnimatedCheckbox
          isCompleted={isCompleted}
          onToggle={handleTaskPress}
          colors={colors}
          isDark={isDark}
        />

        <View style={[styles.taskIconContainer, { backgroundColor: colors.surface }]}>
          <Ionicons
            name={getIconName(task.slot.icon)}
            size={20}
            color={isCurrent && !isCompleted ? colors.accent : colors.iconInactive}
          />
        </View>

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

          {task.overlappingWith && !isCompleted && (
            <View style={styles.warningRow}>
              <Ionicons name="warning-outline" size={12} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Overlaps with {task.overlappingWith}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.taskActions}>
          <TouchableOpacity
            style={[styles.notesButton, { backgroundColor: colors.surface }]}
            onPress={(e) => {
              e.stopPropagation();
              onNotesPress(task);
            }}
          >
            <Ionicons
              name={hasNotes ? "document-text" : "document-text-outline"}
              size={16}
              color={hasNotes ? colors.accent : colors.textInactive}
            />
          </TouchableOpacity>

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
// NOTES EDIT MODAL
// =============================================================================
const NotesEditModal = ({
  visible,
  task,
  onClose,
  onSave,
  isDark,
  colors,
}: {
  visible: boolean;
  task: TaskWithSlot | null;
  onClose: () => void;
  onSave: (slotId: string, notes: string) => void;
  isDark: boolean;
  colors: any;
}) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (task) {
      setNotes(task.slot.notes || '');
    }
  }, [task]);

  const handleSave = () => {
    if (task) {
      onSave(task.slot.id, notes);
    }
    onClose();
  };

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable
            style={[styles.notesModal, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.notesModalHeader}>
              <View style={styles.notesModalTitleRow}>
                <Ionicons name={getIconName(task.slot.icon)} size={20} color={colors.accent} />
                <Text style={[styles.notesModalTitle, { color: colors.textPrimary }]}>
                  {task.slot.label}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.notesModalDivider, { backgroundColor: colors.divider }]} />

            <Text style={[styles.notesModalLabel, { color: colors.textInactive }]}>NOTES</Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  borderColor: colors.accent,
                }
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes for this task..."
              placeholderTextColor={colors.textInactive}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.notesModalButtons}>
              <TouchableOpacity
                style={[styles.notesModalBtn, { backgroundColor: colors.surface }]}
                onPress={onClose}
              >
                <Text style={[styles.notesModalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notesModalBtn, { backgroundColor: colors.accent }]}
                onPress={handleSave}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={[styles.notesModalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [selectedTaskForNotes, setSelectedTaskForNotes] = useState<TaskWithSlot | null>(null);

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

      tasksWithSlots = findOverlappingTasks(tasksWithSlots);
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

  const handleNotesPress = (task: TaskWithSlot) => {
    setSelectedTaskForNotes(task);
    setNotesModalVisible(true);
  };

  const handleSaveNotes = async (slotId: string, notes: string) => {
    try {
      await fetch(`${API_URL}/api/schedule-slots/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      setTasks(prev => prev.map(t =>
        t.slot.id === slotId
          ? { ...t, slot: { ...t.slot, notes } }
          : t
      ));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  // =============================================================================
  // SCROLL ANIMATIONS (from V1)
  // =============================================================================

  // Logo + subtitle fade out as user scrolls
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  // Date nav fades out slightly earlier
  const dateOpacity = scrollY.interpolate({
    inputRange: [0, DATE_SECTION_HEIGHT, HEADER_HEIGHT],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Progress card slides up to stick at top
  const progressTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT, HEADER_HEIGHT + 1],
    outputRange: [0, -HEADER_HEIGHT, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  // Day/Date fades IN inside the progress card as we scroll
  const progressDateOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

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
      onNotesPress={handleNotesPress}
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

        {/* ── Fixed Header: Logo + Subtitle (fades out on scroll) ── */}
        <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
          <Logo isDark={isDark} colors={colors} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Stay consistent, stay focused
          </Text>
        </Animated.View>

        {/* ── Date Navigation (fades out on scroll) ── */}
        <Animated.View style={[
          styles.dateNav,
          { top: insets.top + LOGO_SECTION_HEIGHT, opacity: dateOpacity }
        ]}>
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
        </Animated.View>

        {/* ── Progress Card: slides up and sticks, date fades in ── */}
        <Animated.View style={[
          styles.progressCardWrapper,
          {
            top: insets.top + HEADER_HEIGHT,
            transform: [{ translateY: progressTranslateY }],
            zIndex: 100,
          }
        ]}>
          <View style={[styles.progressCardInner, { backgroundColor: colors.card }, getCardShadow(isDark)]}>
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

        {/* ── Task List ── */}
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

      {/* Notes Modal */}
      <NotesEditModal
        visible={notesModalVisible}
        task={selectedTaskForNotes}
        onClose={() => {
          setNotesModalVisible(false);
          setSelectedTaskForNotes(null);
        }}
        onSave={handleSaveNotes}
        isDark={isDark}
        colors={colors}
      />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // Fixed header: logo + subtitle
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  logoContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: 14,
  },
  logoText: {
    fontSize: 24,
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

  // Date navigation row
  dateNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
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

  // Progress card wrapper
  progressCardWrapper: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
  },
  progressCardInner: {
    borderRadius: 14,
    overflow: 'hidden',
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

  // Task styles
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
  taskLabelCompleted: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.7,
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

  // Notes Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notesModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  notesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notesModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notesModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  notesModalDivider: {
    height: 1,
    marginBottom: 16,
  },
  notesModalLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  notesInput: {
    fontSize: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
    borderWidth: 2,
    marginBottom: 16,
  },
  notesModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  notesModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  notesModalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
