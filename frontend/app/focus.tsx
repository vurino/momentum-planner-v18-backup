import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme, getCardShadow, SPACING } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Icon mapping
const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'restaurant': 'restaurant-outline', 'sunny': 'sunny-outline', 'briefcase': 'briefcase-outline',
    'cafe': 'cafe-outline', 'trending-up': 'trending-up-outline', 'book': 'book-outline',
    'fitness': 'fitness-outline', 'fast-food': 'fast-food-outline', 'analytics': 'analytics-outline',
    'code': 'code-outline', 'moon': 'moon-outline', 'bed': 'bed-outline', 'time': 'time-outline',
    'heart': 'heart-outline', 'musical-notes': 'musical-notes-outline', 
    'game-controller': 'game-controller-outline', 'car': 'car-outline', 'home': 'home-outline',
    'pencil': 'pencil-outline', 'school': 'school-outline', 'walk': 'walk-outline',
    'water': 'water-outline', 'leaf': 'leaf-outline', 'medkit': 'medkit-outline',
  };
  return iconMap[iconName] || 'time-outline';
};

// Parse time string to Date object for today
const parseTimeToDate = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Format remaining time
const formatRemainingTime = (ms: number): { hours: number; minutes: number; seconds: number } => {
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
};

export default function FocusScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const taskLabel = params.label as string || 'Focus Time';
  const taskIcon = params.icon as string || 'time';
  const startTime = params.start_time as string || '09:00';
  const endTime = params.end_time as string || '10:00';
  
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Calculate time remaining until task ends
  useEffect(() => {
    const endDate = parseTimeToDate(endTime);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    setTimeRemaining(Math.max(0, diff));
    setIsActive(diff > 0);
  }, [endTime]);

  // Timer countdown
  useEffect(() => {
    if (!isActive || isPaused) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newValue = prev - 1000;
        if (newValue <= 0) {
          setIsActive(false);
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  // Pulse animation for the icon
  useEffect(() => {
    if (!isActive || isPaused) return;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: false }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [isActive, isPaused]);

  const { hours, minutes, seconds } = formatRemainingTime(timeRemaining);
  const progressPercent = isActive ? (timeRemaining / (parseTimeToDate(endTime).getTime() - parseTimeToDate(startTime).getTime())) * 100 : 0;

  const handleClose = () => {
    router.back();
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0a0e12', '#0f141a', '#141a22']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={[styles.content, { paddingTop: insets.top + SPACING.lg }]}>
        {/* Close button */}
        <TouchableOpacity 
          style={[styles.closeButton, { backgroundColor: colors.surface }]}
          onPress={handleClose}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Main focus area */}
        <View style={styles.focusArea}>
          {/* Glowing icon */}
          <Animated.View style={[
            styles.iconContainer,
            { 
              transform: [{ scale: pulseAnim }],
              shadowOpacity: glowAnim,
            }
          ]}>
            <View style={[styles.iconInner, { backgroundColor: colors.accentGlowStrong }]}>
              <Ionicons name={getIconName(taskIcon)} size={60} color={colors.accent} />
            </View>
          </Animated.View>

          {/* Task name */}
          <Text style={[styles.taskName, { color: colors.textPrimary }]}>{taskLabel}</Text>
          
          {/* Time range */}
          <Text style={[styles.timeRange, { color: colors.textSecondary }]}>
            {startTime} — {endTime}
          </Text>

          {/* Timer display */}
          <View style={styles.timerContainer}>
            {isActive ? (
              <>
                <Text style={[styles.timerLabel, { color: colors.textInactive }]}>TIME REMAINING</Text>
                <View style={styles.timerDisplay}>
                  {hours > 0 && (
                    <>
                      <View style={styles.timerBlock}>
                        <Text style={[styles.timerNumber, { color: colors.accent }]}>{hours.toString().padStart(2, '0')}</Text>
                        <Text style={[styles.timerUnit, { color: colors.textInactive }]}>HR</Text>
                      </View>
                      <Text style={[styles.timerSeparator, { color: colors.textInactive }]}>:</Text>
                    </>
                  )}
                  <View style={styles.timerBlock}>
                    <Text style={[styles.timerNumber, { color: colors.accent }]}>{minutes.toString().padStart(2, '0')}</Text>
                    <Text style={[styles.timerUnit, { color: colors.textInactive }]}>MIN</Text>
                  </View>
                  <Text style={[styles.timerSeparator, { color: colors.textInactive }]}>:</Text>
                  <View style={styles.timerBlock}>
                    <Text style={[styles.timerNumber, { color: colors.accent }]}>{seconds.toString().padStart(2, '0')}</Text>
                    <Text style={[styles.timerUnit, { color: colors.textInactive }]}>SEC</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.completedContainer}>
                <Ionicons name="checkmark-circle" size={60} color={colors.success} />
                <Text style={[styles.completedText, { color: colors.success }]}>Task Complete!</Text>
              </View>
            )}
          </View>

          {/* Progress bar */}
          {isActive && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: colors.accent,
                      width: `${100 - progressPercent}%`,
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>

        {/* Bottom actions */}
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + SPACING.lg }]}>
          {isActive && (
            <TouchableOpacity 
              style={[styles.pauseButton, { backgroundColor: isPaused ? colors.accent : colors.surface }]}
              onPress={handlePauseResume}
            >
              <Ionicons 
                name={isPaused ? 'play' : 'pause'} 
                size={24} 
                color={isPaused ? '#fff' : colors.textSecondary} 
              />
              <Text style={[styles.pauseText, { color: isPaused ? '#fff' : colors.textSecondary }]}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.exitButton, { backgroundColor: colors.surface }]}
            onPress={handleClose}
          >
            <Text style={[styles.exitText, { color: colors.textSecondary }]}>Exit Focus Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: SPACING.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  focusArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  iconContainer: {
    shadowColor: '#ff6a2e',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    marginBottom: SPACING.xl,
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  timeRange: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: SPACING.xxl,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  timerBlock: {
    alignItems: 'center',
    minWidth: 70,
  },
  timerNumber: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -2,
  },
  timerUnit: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: -4,
  },
  timerSeparator: {
    fontSize: 36,
    fontWeight: '200',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  completedContainer: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  completedText: {
    fontSize: 24,
    fontWeight: '600',
  },
  progressContainer: {
    width: '80%',
    marginTop: SPACING.xxl,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomActions: {
    gap: SPACING.md,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: 14,
    gap: SPACING.sm,
  },
  pauseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  exitText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
