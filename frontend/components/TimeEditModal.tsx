import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Modal, Pressable, TouchableOpacity, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
 
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 48;
const WHEEL_W = 58;
const SEP_W = 18;
 
interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isDark: boolean;
  colors: any;
}
 
const WheelPicker: React.FC<WheelPickerProps> = ({ items, selectedIndex, onSelect, isDark, colors }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [displayIdx, setDisplayIdx] = useState(selectedIndex);
  const lastFiredIdx = useRef(selectedIndex);
  const snapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  // Scroll to selectedIndex when it changes externally
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
      setDisplayIdx(selectedIndex);
      lastFiredIdx.current = selectedIndex;
    }, 60);
  }, [selectedIndex]);
 
  const doSnap = useCallback((y: number) => {
    const idx = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
    scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
    setDisplayIdx(idx);
    if (idx !== lastFiredIdx.current) {
      lastFiredIdx.current = idx;
      onSelect(idx);
    }
  }, [items.length, onSelect]);
 
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
    // Update display live as wheel spins
    setDisplayIdx(idx);
    // Schedule snap
    if (snapTimeout.current) clearTimeout(snapTimeout.current);
    snapTimeout.current = setTimeout(() => doSnap(y), 80);
  }, [items.length, doSnap]);
 
  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (snapTimeout.current) clearTimeout(snapTimeout.current);
    doSnap(e.nativeEvent.contentOffset.y);
  }, [doSnap]);
 
  const cellBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
 
  return (
    <View style={{ width: WHEEL_W, height: ITEM_HEIGHT * 3, overflow: 'hidden' }}>
      {/* Grey center cell - static */}
      <View style={{
        position: 'absolute', top: ITEM_HEIGHT, left: 2, right: 2,
        height: ITEM_HEIGHT, borderRadius: 10, backgroundColor: cellBg,
      }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate={0.9}
        scrollEventThrottle={16}
        disableIntervalMomentum={true}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
      >
        {items.map((item, index) => {
          const isSel = index === displayIdx;
          const dist = Math.abs(index - displayIdx);
          return (
            <View key={index} style={{ height: ITEM_HEIGHT, width: WHEEL_W, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{
                color: isSel ? colors.accent : colors.textSecondary,
                opacity: dist === 0 ? 1 : dist === 1 ? 0.45 : 0.15,
                fontSize: isSel ? 22 : 17,
                fontWeight: isSel ? '700' : '400',
              }}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
 
interface TimeEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (startTime: string, endTime: string) => void;
  initialStartTime: string;
  initialEndTime: string;
  taskLabel?: string;
  isDark: boolean;
  colors: any;
}
 
export const TimeEditModal: React.FC<TimeEditModalProps> = ({
  visible, onClose, onSave,
  initialStartTime, initialEndTime,
  taskLabel, isDark, colors,
}) => {
  const parseTime = (t: string) => { const [h, m] = t.split(':').map(Number); return { hour: h || 0, minute: m || 0 }; };
  const fmt = (h: number, m: number) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const calcDur = (sH: number, sM: number, eH: number, eM: number) => { let s = sH*60+sM, e = eH*60+eM; if (e < s) e += 1440; return Math.max(5, e-s); };
  const calcEnd = (sH: number, sM: number, dur: number) => { let e = sH*60+sM+dur; if (e >= 1440) e -= 1440; return { hour: Math.floor(e/60), minute: e%60 }; };
 
  const [startHour, setStartHour] = useState(0);
  const [startMinute, setStartMinute] = useState(0);
  const [durH, setDurH] = useState(1);
  const [durM, setDurM] = useState(0);
  const [hasChanged, setHasChanged] = useState(false);
  const initRef = useRef({ sH: 0, sM: 0, dur: 60 });
 
  useEffect(() => {
    if (visible) {
      const s = parseTime(initialStartTime);
      const e = parseTime(initialEndTime);
      const d = calcDur(s.hour, s.minute, e.hour, e.minute);
      const dur = d >= 5 && d <= 720 ? d : 60;
      setStartHour(s.hour); setStartMinute(s.minute);
      setDurH(Math.floor(dur / 60)); setDurM(dur % 60);
      setHasChanged(false);
      initRef.current = { sH: s.hour, sM: s.minute, dur };
    }
  }, [visible, initialStartTime, initialEndTime]);
 
  // Live end time — recalculates on every state change
  const endTime = calcEnd(startHour, startMinute, durH * 60 + durM);
 
  const check = (sH: number, sM: number, dH: number, dM: number) => {
    const { sH: iH, sM: iM, dur: iD } = initRef.current;
    setHasChanged(sH !== iH || sM !== iM || (dH*60+dM) !== iD);
  };
 
  const hrs12   = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const mins60  = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const ampm    = ['AM', 'PM'];
  const dHrs    = Array.from({ length: 13 }, (_, i) => i.toString());
  const dMins60 = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
 
  const dispH  = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
  const hIdx   = dispH - 1;
  const mIdx   = startMinute;
  const pIdx   = startHour >= 12 ? 1 : 0;
  const dHIdx  = Math.min(durH, 12);
  const dMIdx  = durM;
 
  const endH12  = endTime.hour === 0 ? 12 : endTime.hour > 12 ? endTime.hour - 12 : endTime.hour;
  const endMStr = endTime.minute.toString().padStart(2, '0');
  const endPer  = endTime.hour >= 12 ? 'PM' : 'AM';
 
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={S.overlay} onPress={onClose}>
        <Pressable style={S.modal} onPress={e => e.stopPropagation()}>
          <View style={[S.card, { backgroundColor: colors.card }]}>
            <Text style={[S.title, { color: colors.textPrimary }]}>Edit Time</Text>
            {taskLabel && <Text style={[S.sub, { color: colors.textSecondary }]}>{taskLabel}</Text>}
            <View style={[S.div, { backgroundColor: colors.divider }]} />
 
            {/* START */}
            <View style={S.row}>
              <Text style={[S.lbl, { color: colors.textSecondary }]}>START</Text>
              <View style={S.wheels}>
                <WheelPicker items={hrs12} selectedIndex={hIdx} isDark={isDark} colors={colors}
                  onSelect={i => { const h12=i+1; const newH=startHour>=12?(h12===12?12:h12+12):(h12===12?0:h12); setStartHour(newH); check(newH,startMinute,durH,durM); }} />
                <View style={{ width: SEP_W, alignItems: 'center' }}>
                  <Text style={[S.sep, { color: colors.textPrimary }]}>:</Text>
                </View>
                <WheelPicker items={mins60} selectedIndex={mIdx} isDark={isDark} colors={colors}
                  onSelect={i => { setStartMinute(i); check(startHour,i,durH,durM); }} />
                <View style={{ width: SEP_W }} />
                <WheelPicker items={ampm} selectedIndex={pIdx} isDark={isDark} colors={colors}
                  onSelect={i => { const isPM=i===1; const newH=isPM?(startHour<12?startHour+12:startHour):(startHour>=12?startHour-12:startHour); setStartHour(newH); check(newH,startMinute,durH,durM); }} />
              </View>
            </View>
 
            {/* DURATION */}
            <View style={S.row}>
              <Text style={[S.lbl, { color: colors.textSecondary }]}>DURATION</Text>
              <View style={S.wheels}>
                <WheelPicker items={dHrs} selectedIndex={dHIdx} isDark={isDark} colors={colors}
                  onSelect={i => { setDurH(i); check(startHour,startMinute,i,durM); }} />
                <View style={{ width: SEP_W, alignItems: 'center' }}>
                  <Text style={[S.sepSm, { color: colors.textSecondary }]}>h</Text>
                </View>
                <WheelPicker items={dMins60} selectedIndex={dMIdx} isDark={isDark} colors={colors}
                  onSelect={i => { setDurM(i); check(startHour,startMinute,durH,i); }} />
                <View style={{ width: SEP_W, alignItems: 'center' }}>
                  <Text style={[S.sepSm, { color: colors.textSecondary }]}>m</Text>
                </View>
                <View style={{ width: WHEEL_W }} />
              </View>
            </View>
 
            <View style={[S.div, { backgroundColor: colors.divider }]} />
 
            {/* END — aligned, live */}
            <View style={S.row}>
              <Text style={[S.lbl, { color: colors.textInactive }]}>END</Text>
              <View style={S.wheels}>
                <View style={{ width: WHEEL_W, height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[S.endVal, { color: colors.textInactive }]}>{endH12}</Text>
                </View>
                <View style={{ width: SEP_W, alignItems: 'center' }}>
                  <Text style={[S.sep, { color: colors.textInactive }]}>:</Text>
                </View>
                <View style={{ width: WHEEL_W, height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[S.endVal, { color: colors.textInactive }]}>{endMStr}</Text>
                </View>
                <View style={{ width: SEP_W }} />
                <View style={{ width: WHEEL_W, height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[S.endVal, { color: colors.textInactive }]}>{endPer}</Text>
                </View>
              </View>
            </View>
 
            <View style={{ alignItems: 'center', marginTop: -4, marginBottom: 6 }}>
              <View style={[S.badge, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }]}>
                <Text style={[S.badgeTxt, { color: colors.textInactive }]}>AUTO-CALCULATED</Text>
              </View>
            </View>
 
            {/* Buttons */}
            <View style={S.btns}>
              <TouchableOpacity style={[S.btn, { backgroundColor: isDark ? '#1a2230' : '#e8e2d8' }]} onPress={onClose}>
                <Text style={[S.btnTxt, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.btn, { backgroundColor: hasChanged ? colors.accent : (isDark ? '#1a2230' : '#e8e2d8') }]}
                onPress={hasChanged ? () => { onSave(fmt(startHour,startMinute), fmt(endTime.hour,endTime.minute)); onClose(); } : undefined}
                activeOpacity={hasChanged ? 0.8 : 1}
              >
                <Text style={[S.btnTxt, { color: hasChanged ? '#fff' : colors.textInactive }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
 
const S = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center' },
  modal:    { width: SCREEN_WIDTH - 32, maxWidth: 360 },
  card:     { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18 },
  title:    { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 3 },
  sub:      { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  div:      { height: 1, marginVertical: 8 },
  row:      { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  lbl:      { fontSize: 10, fontWeight: '700', letterSpacing: 1, width: 68 },
  wheels:   { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  sep:      { fontSize: 22, fontWeight: '600' },
  sepSm:    { fontSize: 15, fontWeight: '500' },
  endVal:   { fontSize: 22, fontWeight: '500' },
  badge:    { borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  btns:     { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn:      { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnTxt:   { fontSize: 15, fontWeight: '600' },
});
 