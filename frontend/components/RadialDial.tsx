import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
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

interface RadialDialProps {
  value: number;
  minValue: number;
  maxValue: number;
  step: number;
  size?: number;
  label?: string;
  unit?: string;
  onChange: (value: number) => void;
  isDark: boolean;
  colors: any;
  formatValue?: (value: number) => string;
}

export const RadialDial: React.FC<RadialDialProps> = ({
  value,
  minValue,
  maxValue,
  step,
  size = 120,
  label,
  unit = '',
  onChange,
  isDark,
  colors,
  formatValue,
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const panY = useRef(new Animated.Value(0)).current;
  const lastY = useRef(0);
  const velocity = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const totalSteps = Math.floor((maxValue - minValue) / step);
  const progress = (currentValue - minValue) / (maxValue - minValue);
  const arcAngle = 270; // Arc spans 270 degrees
  const startAngle = 135; // Start from bottom-left

  // Generate tick marks
  const tickMarks = [];
  const numTicks = 24;
  for (let i = 0; i <= numTicks; i++) {
    const angle = startAngle + (arcAngle * i) / numTicks;
    const radian = (angle * Math.PI) / 180;
    const innerRadius = size / 2 - 20;
    const outerRadius = size / 2 - 14;
    const isMajor = i % 4 === 0;
    
    tickMarks.push({
      x1: size / 2 + Math.cos(radian) * innerRadius,
      y1: size / 2 + Math.sin(radian) * innerRadius,
      x2: size / 2 + Math.cos(radian) * (isMajor ? outerRadius + 2 : outerRadius),
      y2: size / 2 + Math.sin(radian) * (isMajor ? outerRadius + 2 : outerRadius),
      isMajor,
    });
  }

  // Generate dotted grid
  const dotGrid = [];
  const gridRows = 8;
  const gridCols = 8;
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      const x = size / 2 + (j - gridCols / 2 + 0.5) * 6;
      const y = size / 2 + (i - gridRows / 2 + 0.5) * 6;
      const dist = Math.sqrt(Math.pow(x - size / 2, 2) + Math.pow(y - size / 2, 2));
      if (dist < size / 2 - 30 && dist > 10) {
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

  const inactiveArcPath = createArcPath(startAngle, startAngle + arcAngle, size / 2 - 8);
  const activeArcPath = createArcPath(startAngle, startAngle + arcAngle * progress, size / 2 - 8);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        lastY.current = 0;
        velocity.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const dy = gestureState.dy - lastY.current;
        lastY.current = gestureState.dy;
        velocity.current = dy;

        // Calculate new value based on drag
        const sensitivity = (maxValue - minValue) / 200;
        const deltaValue = -dy * sensitivity;
        const newValue = Math.max(
          minValue,
          Math.min(maxValue, currentValue + deltaValue)
        );
        const snappedValue = Math.round(newValue / step) * step;
        
        if (snappedValue !== currentValue) {
          setCurrentValue(snappedValue);
          onChange(snappedValue);
        }
      },
      onPanResponderRelease: () => {
        // Inertia animation
        const decay = 0.95;
        const minVelocity = 0.5;
        
        const animate = () => {
          velocity.current *= decay;
          
          if (Math.abs(velocity.current) > minVelocity) {
            const sensitivity = (maxValue - minValue) / 200;
            const deltaValue = -velocity.current * sensitivity;
            const newValue = Math.max(
              minValue,
              Math.min(maxValue, currentValue + deltaValue)
            );
            const snappedValue = Math.round(newValue / step) * step;
            
            if (snappedValue !== currentValue) {
              setCurrentValue(snappedValue);
              onChange(snappedValue);
            }
            
            animationRef.current = requestAnimationFrame(animate);
          }
        };
        
        if (Math.abs(velocity.current) > minVelocity) {
          animationRef.current = requestAnimationFrame(animate);
        }
      },
    })
  ).current;

  const displayValue = formatValue ? formatValue(currentValue) : currentValue.toString();

  return (
    <View style={styles.dialContainer}>
      {label && <Text style={[styles.dialLabel, { color: colors.textSecondary }]}>{label}</Text>}
      <View {...panResponder.panHandlers}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ff6a2e" />
              <Stop offset="100%" stopColor="#ff3c00" />
            </SvgGradient>
          </Defs>

          {/* Dotted grid background */}
          <G opacity={0.3}>
            {dotGrid.map((dot, i) => (
              <Circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r={1}
                fill={isDark ? '#3a4555' : '#b0b8c5'}
              />
            ))}
          </G>

          {/* Tick marks */}
          <G>
            {tickMarks.map((tick, i) => (
              <Line
                key={i}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={isDark ? '#3a4555' : '#b0b8c5'}
                strokeWidth={tick.isMajor ? 2 : 1}
                opacity={tick.isMajor ? 0.8 : 0.4}
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
          <Path
            d={activeArcPath}
            fill="none"
            stroke="url(#activeGradient)"
            strokeWidth={5}
            strokeLinecap="round"
            style={{
              shadowColor: '#ff6a2e',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
            } as any}
          />

          {/* Center circle background */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 35}
            fill={isDark ? '#1c2432' : '#e9edf3'}
          />
        </Svg>

        {/* Center value display */}
        <View style={[styles.dialValueContainer, { top: size / 2 - 20, left: 0, right: 0 }]}>
          <Text style={[styles.dialValue, { color: colors.accent }]}>
            {displayValue}
          </Text>
          {unit && <Text style={[styles.dialUnit, { color: colors.textSecondary }]}>{unit}</Text>}
        </View>
      </View>
    </View>
  );
};

// Time Dial Component - specifically for hours or minutes
interface TimeDialProps {
  value: number;
  type: 'hour' | 'minute';
  size?: number;
  label?: string;
  onChange: (value: number) => void;
  isDark: boolean;
  colors: any;
}

export const TimeDial: React.FC<TimeDialProps> = ({
  value,
  type,
  size = 100,
  label,
  onChange,
  isDark,
  colors,
}) => {
  const maxValue = type === 'hour' ? 23 : 55;
  const step = type === 'hour' ? 1 : 5;
  
  const formatValue = (val: number) => val.toString().padStart(2, '0');

  return (
    <RadialDial
      value={value}
      minValue={0}
      maxValue={maxValue}
      step={step}
      size={size}
      label={label}
      onChange={onChange}
      isDark={isDark}
      colors={colors}
      formatValue={formatValue}
    />
  );
};

// Duration Dial Component
interface DurationDialProps {
  value: number;
  size?: number;
  onChange: (value: number) => void;
  isDark: boolean;
  colors: any;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120];

export const DurationDial: React.FC<DurationDialProps> = ({
  value,
  size = 100,
  onChange,
  isDark,
  colors,
}) => {
  // Find closest duration option
  const closestDuration = DURATION_OPTIONS.reduce((prev, curr) => 
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );

  const formatValue = (val: number) => {
    if (val >= 60) {
      const hours = Math.floor(val / 60);
      const mins = val % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${val}m`;
  };

  return (
    <RadialDial
      value={closestDuration}
      minValue={15}
      maxValue={120}
      step={15}
      size={size}
      label="DURATION"
      onChange={onChange}
      isDark={isDark}
      colors={colors}
      formatValue={formatValue}
    />
  );
};

const styles = StyleSheet.create({
  dialContainer: {
    alignItems: 'center',
  },
  dialLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dialValueContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  dialUnit: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
