import React, { useRef, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Dimensions, NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { NowPanel } from '../../components/NowPanel';
import { TimelinePanel } from '../../components/TimelinePanel';
import { RoutinePanel } from '../../components/RoutinePanel';
 
const { width: SW } = Dimensions.get('window');
 
// Panel order: Routine (0) | Now (1) | Timeline (2)
// Default open: Now (index 1)
const PANEL_ROUTINE  = 0;
const PANEL_NOW      = 1;
const PANEL_TIMELINE = 2;
 
export default function TodayScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
 
  // Open on Now panel on mount
  const onLayout = useCallback(() => {
    scrollRef.current?.scrollTo({ x: SW * PANEL_NOW, animated: false });
  }, []);
 
  const [activeDot, setActiveDot] = React.useState(PANEL_NOW);
 
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SW);
    setActiveDot(idx);
  }, []);
 
  return (
    <View style={[styles.screen, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={onLayout}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {/* Panel 0 — Routine (swipe right) */}
        <View style={[styles.panel, { width: SW }]}>
          <RoutinePanel insets={insets} />
        </View>
 
        {/* Panel 1 — Now (default center) */}
        <View style={[styles.panel, { width: SW }]}>
          <NowPanel insets={insets} />
        </View>
 
        {/* Panel 2 — Timeline (swipe left) */}
        <View style={[styles.panel, { width: SW }]}>
          <TimelinePanel insets={insets} />
        </View>
      </ScrollView>
 
      {/* Swipe dots */}
      <View style={[styles.dots, { bottom: insets.bottom + 70 }]}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeDot
                ? { backgroundColor: colors.accent, width: 16 }
                : { backgroundColor: colors.textDim, width: 6 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1 },
  panel:  { flex: 1 },
  dots: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
 