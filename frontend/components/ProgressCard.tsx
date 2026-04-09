import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

interface ProgressCardProps {
  completed: number;
  total: number;
  isDark: boolean;
  colors: any;
  showDateInfo?: boolean;
  dateInfoOpacity?: Animated.AnimatedInterpolation<number>;
  dayName?: string;
  dateText?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  completed,
  total,
  isDark,
  colors,
  showDateInfo = false,
  dateInfoOpacity,
  dayName = '',
  dateText = '',
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progressColor = colors.progressGreen;

  const barWidthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidthAnim, {
      toValue: percentage,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  // Centered text fades OUT as we scroll (opacity 1 → 0)
  const centeredOpacity = dateInfoOpacity
    ? dateInfoOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      })
    : new Animated.Value(1);

  // Left-aligned text fades IN as we scroll (opacity 0 → 1)
  const leftOpacity = dateInfoOpacity
    ? dateInfoOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      })
    : new Animated.Value(0);

  // Content slides down slightly to make room for date row
  const contentPaddingTop = dateInfoOpacity
    ? dateInfoOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 6],
      })
    : new Animated.Value(0);

  return (
    <View style={styles.container}>

      {/* Day · Date row — fades in as card sticks to top */}
      {showDateInfo && dateInfoOpacity && (
        <Animated.View style={[styles.dateRow, { opacity: dateInfoOpacity }]}>
          <Text style={[styles.dayName, { color: colors.textPrimary }]}>
            {dayName}
          </Text>
          <Text style={[styles.dateDivider, { color: colors.textInactive }]}>
            {'  ·  '}
          </Text>
          <Text style={[styles.dateText, { color: colors.textInactive }]}>
            {dateText}
          </Text>
        </Animated.View>
      )}

      {/* Progress content */}
      <Animated.View style={[styles.progressContent, { paddingTop: contentPaddingTop }]}>

        {/* Two overlapping texts that cross-fade:
            - centered when app opens
            - left-aligned when scrolled */}
        <View style={styles.activityCountWrapper}>
          <Animated.Text style={[
            styles.activityCountCentered,
            { color: colors.textSecondary, opacity: centeredOpacity }
          ]}>
            {completed} of {total} completed
          </Animated.Text>
          <Animated.Text style={[
            styles.activityCountLeft,
            { color: colors.textSecondary, opacity: leftOpacity }
          ]}>
            {completed} of {total} completed
          </Animated.Text>
        </View>

        {/* Progress bar + percentage */}
        <View style={styles.barRow}>
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
          <Text style={[styles.percentage, { color: progressColor }]}>
            {percentage}%
          </Text>
        </View>

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateDivider: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 14,
  },

  progressContent: {
    justifyContent: 'center',
  },

  // Wrapper holds both text versions overlapping
  activityCountWrapper: {
    height: 20,
    marginBottom: 8,
  },
  activityCountCentered: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityCountLeft: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'left',
  },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 38,
    textAlign: 'right',
  },
});
