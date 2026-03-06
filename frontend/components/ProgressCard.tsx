import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

interface ProgressCardProps {
  completed: number;
  total: number;
  isDark: boolean;
  colors: any;
}

// Get progress color - progressive gradient from gray to orange
const getProgressColor = (percentage: number, isDark: boolean): string => {
  if (percentage === 0) return isDark ? '#3a4555' : '#c5c0b5';
  // Progressive gradient from gray to orange based on percentage
  // At 0% = gray, at 100% = full orange
  const grayR = isDark ? 58 : 197;
  const grayG = isDark ? 69 : 192;
  const grayB = isDark ? 85 : 181;
  
  const orangeR = 255;
  const orangeG = 106;
  const orangeB = 46;
  
  const ratio = percentage / 100;
  const r = Math.round(grayR + (orangeR - grayR) * ratio);
  const g = Math.round(grayG + (orangeG - grayG) * ratio);
  const b = Math.round(grayB + (orangeB - grayB) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
};

export const ProgressCard: React.FC<ProgressCardProps> = ({
  completed,
  total,
  isDark,
  colors,
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progressColor = getProgressColor(percentage, isDark);
  
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

  const size = 70;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const cardShadow = {
    shadowColor: isDark ? '#000' : '#999',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, cardShadow]}>
      {/* Left: Progress Circle */}
      <View style={styles.circleContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={progressColor} />
              <Stop offset="100%" stopColor={progressColor} stopOpacity={0.9} />
            </SvgGradient>
          </Defs>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? '#2a3344' : '#d5d0c5'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGrad)"
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
        <Text style={[styles.activityCount, { color: colors.textSecondary }]}>
          {completed} of {total} activities completed
        </Text>
        
        {/* Progress Bar */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  circleContainer: {
    position: 'relative',
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  circleText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '800',
  },
  doneText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  activityCount: {
    fontSize: 14,
    fontWeight: '600',
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
