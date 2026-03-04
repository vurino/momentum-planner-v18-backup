import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  G,
  Line,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MomentumDialProps {
  completed: number;
  total: number;
  size?: number;
  isDark: boolean;
  colors: any;
}

export const MomentumDial: React.FC<MomentumDialProps> = ({
  completed,
  total,
  size = 200,
  isDark,
  colors,
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed === total && total > 0;
  
  // Animation for progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Pulse animation when task is completed
    if (completed > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Continuous glow animation when complete
    if (isComplete) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [completed, total, percentage, isComplete]);

  const arcAngle = 300; // Arc spans 300 degrees
  const startAngle = 120; // Start from bottom-left
  const progress = percentage / 100;

  // Generate tick marks
  const tickMarks = [];
  const numTicks = 40;
  for (let i = 0; i <= numTicks; i++) {
    const angle = startAngle + (arcAngle * i) / numTicks;
    const radian = (angle * Math.PI) / 180;
    const innerRadius = size / 2 - 28;
    const outerRadius = size / 2 - 18;
    const isMajor = i % 5 === 0;
    
    tickMarks.push({
      x1: size / 2 + Math.cos(radian) * innerRadius,
      y1: size / 2 + Math.sin(radian) * innerRadius,
      x2: size / 2 + Math.cos(radian) * (isMajor ? outerRadius + 4 : outerRadius),
      y2: size / 2 + Math.sin(radian) * (isMajor ? outerRadius + 4 : outerRadius),
      isMajor,
      isActive: i / numTicks <= progress,
    });
  }

  // Generate dotted grid
  const dotGrid = [];
  const gridSize = 12;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = size / 2 + (j - gridSize / 2 + 0.5) * 8;
      const y = size / 2 + (i - gridSize / 2 + 0.5) * 8;
      const dist = Math.sqrt(Math.pow(x - size / 2, 2) + Math.pow(y - size / 2, 2));
      if (dist < size / 2 - 45 && dist > 15) {
        dotGrid.push({ x, y });
      }
    }
  }

  // Create arc path
  const createArcPath = (startDeg: number, endDeg: number, radius: number) => {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const inactiveArcPath = createArcPath(startAngle, startAngle + arcAngle, size / 2 - 12);
  const activeArcPath = progress > 0 
    ? createArcPath(startAngle, startAngle + arcAngle * Math.min(progress, 0.999), size / 2 - 12)
    : '';

  // Outer ring path
  const outerRingPath = createArcPath(startAngle, startAngle + arcAngle, size / 2 - 4);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Neumorphic base */}
      <View style={[
        styles.dialBase,
        {
          width: size + 20,
          height: size + 20,
          borderRadius: (size + 20) / 2,
          backgroundColor: isDark ? '#1c2432' : '#e9edf3',
          shadowColor: isDark ? '#000' : '#a0a8b8',
          shadowOffset: { width: 8, height: 8 },
          shadowOpacity: isDark ? 0.6 : 0.3,
          shadowRadius: 16,
        }
      ]} />
      
      {/* Inner neumorphic highlight */}
      <View style={[
        styles.dialInner,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDark ? '#1a2230' : '#f0f4f8',
          shadowColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
          shadowOffset: { width: -4, height: -4 },
          shadowOpacity: 1,
          shadowRadius: 8,
        }
      ]} />

      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <SvgGradient id="momentumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ff6a2e" />
            <Stop offset="100%" stopColor="#ff3c00" />
          </SvgGradient>
          <SvgGradient id="completeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4ade80" />
            <Stop offset="100%" stopColor="#22c55e" />
          </SvgGradient>
        </Defs>

        {/* Dotted grid background */}
        <G opacity={0.25}>
          {dotGrid.map((dot, i) => (
            <Circle
              key={i}
              cx={dot.x}
              cy={dot.y}
              r={1.5}
              fill={isDark ? '#3a4555' : '#b0b8c5'}
            />
          ))}
        </G>

        {/* Outer subtle ring */}
        <Path
          d={outerRingPath}
          fill="none"
          stroke={isDark ? '#252d3d' : '#d5dae2'}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.5}
        />

        {/* Tick marks */}
        <G>
          {tickMarks.map((tick, i) => (
            <Line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.isActive 
                ? (isComplete ? '#4ade80' : '#ff6a2e')
                : (isDark ? '#3a4555' : '#c0c8d5')
              }
              strokeWidth={tick.isMajor ? 2.5 : 1.5}
              opacity={tick.isActive ? 1 : (tick.isMajor ? 0.6 : 0.3)}
            />
          ))}
        </G>

        {/* Inactive arc */}
        <Path
          d={inactiveArcPath}
          fill="none"
          stroke={isDark ? '#2a3344' : '#d0d5dd'}
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* Active arc with glow */}
        {activeArcPath && (
          <Path
            d={activeArcPath}
            fill="none"
            stroke={isComplete ? 'url(#completeGradient)' : 'url(#momentumGradient)'}
            strokeWidth={5}
            strokeLinecap="round"
          />
        )}

        {/* Inner decorative circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 50}
          fill="none"
          stroke={isDark ? '#252d3d' : '#dde2e8'}
          strokeWidth={1}
          opacity={0.5}
        />
      </Svg>

      {/* Center content */}
      <View style={[styles.centerContent, { top: size / 2 - 35 + 10, left: 10, right: 10 }]}>
        {isComplete ? (
          <>
            <Text style={[styles.completeText, { color: '#4ade80' }]}>DAY</Text>
            <Text style={[styles.completeText, { color: '#4ade80' }]}>COMPLETE</Text>
          </>
        ) : (
          <>
            <Text style={[styles.percentageText, { color: colors.accent }]}>
              {percentage}%
            </Text>
            <Text style={[styles.labelText, { color: colors.textSecondary }]}>
              Momentum
            </Text>
            <Text style={[styles.progressText, { color: colors.textInactive }]}>
              {completed} / {total}
            </Text>
          </>
        )}
      </View>

      {/* Glow effect when complete */}
      {isComplete && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: size + 30,
              height: size + 30,
              borderRadius: (size + 30) / 2,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.5],
              }),
            },
          ]}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialBase: {
    position: 'absolute',
    elevation: 10,
  },
  dialInner: {
    position: 'absolute',
  },
  svg: {
    zIndex: 1,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  percentageText: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  completeText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
});
