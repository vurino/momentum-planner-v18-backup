import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { getProgressColor } from '../context/ThemeContext';

interface ProgressCardProps {
  completed: number;
  total: number;
  dayName: string;
  dayType: string; // 'Weekday' or 'Weekend'
  isDark: boolean;
  colors: any;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  completed,
  total,
  dayName,
  dayType,
  isDark,
  colors,
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progressColor = getProgressColor(percentage, colors);
  
  // Animation for progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  const barWidthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: percentage,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(barWidthAnim, {
        toValue: percentage,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [percentage]);

  // SVG progress ring
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: isDark ? 0.5 : 0.1,
    shadowRadius: 10,
    elevation: 6,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, cardShadow]}>
      {/* Left: Progress Circle */}
      <View style={styles.circleContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id={`progressGrad-${percentage}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={progressColor} />
              <Stop offset="100%" stopColor={progressColor} stopOpacity={0.8} />
            </SvgGradient>
          </Defs>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.progressEmpty}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#progressGrad-${percentage})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.circleText}>
          <Text style={[styles.percentageText, { color: progressColor }]}>
            {percentage}%
          </Text>
          <Text style={[styles.doneText, { color: colors.textSecondary }]}>
            DONE
          </Text>
        </View>
      </View>

      {/* Right: Info & Progress Bar */}
      <View style={styles.infoContainer}>
        <Text style={[styles.dayTitle, { color: colors.textPrimary }]}>
          {dayName} — {dayType}
        </Text>
        <Text style={[styles.activityCount, { color: colors.textSecondary }]}>
          {completed} of {total} activities completed
        </Text>
        
        {/* Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: colors.progressEmpty }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  circleContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  circleText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '800',
  },
  doneText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 1,
  },
  infoContainer: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  activityCount: {
    fontSize: 13,
    marginBottom: 10,
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
});
