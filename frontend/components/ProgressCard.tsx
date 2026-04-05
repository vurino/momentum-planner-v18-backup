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

  // Pastel green from V2 theme
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

  // dateInfoOpacity drives how much the date row takes up space.
  // We animate paddingTop of the content so it slides down as date fades in.
  const contentPaddingTop = dateInfoOpacity
    ? dateInfoOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 8],
      })
    : new Animated.Value(0);

  return (
    <View style={styles.container}>

      {/* Day / Date row — fades in as card sticks to top */}
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

      {/* Progress content — slides down to make room for date */}
      <Animated.View style={[styles.progressContent, { paddingTop: contentPaddingTop }]}>

        {/* "x of x completed" */}
        <Text style={[styles.activityCount, { color: colors.textSecondary }]}>
          {completed} of {total} completed
        </Text>

        {/* Progress bar + percentage on same row */}
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
    paddingVertical: 14,
  },

  // Day · Date row at top of card
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

  // Content block that slides down
  progressContent: {
    justifyContent: 'center',
  },
  activityCount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },

  // Bar + % on same row
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
