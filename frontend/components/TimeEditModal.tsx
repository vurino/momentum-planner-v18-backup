import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Modal, Pressable, TouchableOpacity, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SPACING, RADIUS, FONT } from '../context/ThemeContext';
 
const { width: SW } = Dimensions.get('window');
const ITEM_H  = 48;
const WHEEL_W = 58;
const SEP_W   = 18;
 
// ─────────────────────────────────────────────────────────────────────────────
// WHEEL PICKER
// ─────────────────────────────────────────────────────────────────────────────
interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isDark: boolean;
  colors: any;
}
 
const WheelPicker: React.FC<WheelPickerProps> = ({
  items, selectedIndex, onSelect, isDark, colors,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [displayIdx, setDisplayIdx] = useState(selectedIndex);
  const lastFired  = useRef(selectedIndex);
  const snapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  // Scroll to index when it changes externally
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
      setDisplayIdx(selectedIndex);
      lastFired.current = selectedIndex;
    }, 60);
  }, [selectedIndex]);
 
  const doSnap = useCallback((y: number) => {
    const idx = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
    scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: false });
    setDisplayIdx(idx);
    if (idx !== lastFired.current) {
      lastFired.current = idx;
      onSelect(idx);
    }
  }, [items.length, onSelect]);
 
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setDisplayIdx(Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1)));
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => doSnap(y), 80);
  }, [items.length, doSnap]);
 
  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    doSnap(e.nativeEvent.contentOffset.y);
  }, [doSnap]);
 
  // Sunken center cell using new palette
  const cellBg = isDark
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0.05)';
 
  return (
    <View style={{ width: WHEEL_W, height: ITEM_H * 3, overflow: 'hidden' }}>
      {/* Highlighted center cell */}
      <View style={{
        position: 'absolute', top: ITEM_H, left: 2, right: 2,
        height: ITEM_H, borderRadius: RADIUS.md,
        backgroundColor: cellBg,
      }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate={0.9}
        scrollEventThrottle={16}
        disableIntervalMomentum
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H }}
      >
        {items.map((item, i) => {
          const sel  = i === displayIdx;
          const dist = Math.abs(i - displayIdx);
          return (
            <View key={i} style={{ height: ITEM_H, width: WHEEL_W, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{
                // Selected item uses accent color; others use body/muted
                color:      sel ? colors.accent : colors.textMuted,
                opacity:    dist === 0 ? 1 : dist === 1 ? 0.45 : 0.15,
                fontSize:   sel ? 22 : 17,
                fontWeight: sel ? '700' : '400',
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
 
// ─────────────────────────────────────────────────────────────────────────────
// TIME EDIT MODAL
// ─────────────────────────────────────────────────────────────────────────────
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
  // ── Helpers ───────────────────────────────────────────────────────────────
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return { hour: h || 0, minute: m || 0 };
  };
  const fmt = (h: number, m: number) =>
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const calcDur = (sH: number, sM: number, eH: number, eM: number) => {
    let s = sH * 60 + sM, e = eH * 60 + eM;
    if (e < s) e += 1440;
    return Math.max(5, e - s);
  };
  const calcEnd = (sH: number, sM: number, dur: number) => {
    let e = sH * 60 + sM + dur;
    if (e >= 1440) e -= 1440;
    return { hour: Math.floor(e / 60), minute: e % 60 };
  };
 
  // ── State ─────────────────────────────────────────────────────────────────
  const [startHour,   setStartHour]   = useState(0);
  const [startMinute, setStartMinute] = useState(0);
  const [durH,        setDurH]        = useState(1);
  const [durM,        setDurM]        = useState(0);
  const [hasChanged,  setHasChanged]  = useState(false);
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
 
  // Live end time
  const endTime = calcEnd(startHour, startMinute, durH * 60 + durM);
 
  const checkChanged = (sH: number, sM: number, dH: number, dM: number) => {
    const { sH: iH, sM: iM, dur: iD } = initRef.current;
    setHasChanged(sH !== iH || sM !== iM || (dH * 60 + dM) !== iD);
  };
 
  // ── Wheel data ────────────────────────────────────────────────────────────
  const hrs12   = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const mins60  = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const ampm    = ['AM', 'PM'];
  const dHrs    = Array.from({ length: 13 }, (_, i) => i.toString());
  const dMins60 = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
 
  const dispH = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
  const hIdx  = dispH - 1;
  const mIdx  = startMinute;
  const pIdx  = startHour >= 12 ? 1 : 0;
  const dHIdx = Math.min(durH, 12);
  const dMIdx = durM;
 
  const endH12 = endTime.hour === 0 ? 12 : endTime.hour > 12 ? endTime.hour - 12 : endTime.hour;
  const endMStr = endTime.minute.toString().padStart(2, '0');
  const endPer  = endTime.hour >= 12 ? 'PM' : 'AM';
 
  // ── Colors using new tokens ───────────────────────────────────────────────
  // Card background: bgSurface for dark, bgSurface for light
  const cardBg    = isDark ? (colors.bgSurface || '#212530') : (colors.bgSurface || '#e8e2d8');
  const cancelBg  = isDark ? colors.bgBase : (colors.bgSurface || '#e8e2d8');
  const divColor  = colors.divider;
  const labelColor = colors.textDim;
  const endValColor = colors.textMuted;
 
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={[S.overlay, { backgroundColor: colors.modalOverlay }]}
        onPress={onClose}
      >
        <Pressable style={S.modal} onPress={e => e.stopPropagation()}>
          <View style={[S.card, { backgroundColor: cardBg }]}>
 
            {/* Title */}
            <Text style={[S.title, { color: colors.textPrimary }]}>Edit Time</Text>
            {taskLabel && (
              <Text style={[S.sub, { color: colors.textMuted }]}>{taskLabel}</Text>
            )}
            <View style={[S.div, { backgroundColor: divColor }]} />
 
            {/* START */}
            <View style={S.row}>
              <Text style={[S.lbl, { color: labelColor }]}>START</Text>
              <View style={S.wheels}>
                {/* Hours */}
                <WheelPicker
                  items={hrs12} selectedIndex={hIdx}
                  isDark={isDark} colors={colors}
                  onSelect={i => {
                    const h12 = i + 1;
                    const newH = startHour >= 12
                      ? (h12 === 12 ? 12 : h12 + 12)
                      : (h12 === 12 ? 0  : h12);
                    setStartHour(newH);
                    checkChanged(newH, startMinute, durH, durM);
                  }}
                />
                <View style={{ width: SEP_W, alignItems: 'center' }}>
                  <Text style={[S.sep, { color: colors.textBody }]}>:</Text>
                </View>
                {/* Minutes */}
                <WheelPicker
                  items={mins60} selectedIndex={mIdx}
                  isDark={isDark} colors={colors}
                  onSelect={i => { setStartMinute(i); checkChanged(startHour, i, durH, durM); }}
                />
                <View style={{ width: SEP_W }} />
                {/* AM/PM */}
                <WheelPicker
                  items={ampm} selectedIndex={pIdx}
                  isDark={isDark} colors={colors}
                  onSelect={i => {
                    const isPM = i === 1;
                    const newH = isPM
                      ? (startHour < 12 ? startHour + 12 : startHour)
                      : (startHour >= 12 ? startHour - 12 : startHour);
                    setStartHour(newH);
                    checkChanged(newH, startMinute, durH, durM);
                  }}
                />
              </View>
            </View>
 
            {/* DURATION */}
            <View style={S.row}>
              <Text style={[S.lbl, { color: labelColor }]}>DURATION</Text>
              <View style={S.wheels}>
                <WheelPicker
                  items={dHrs} selectedIndex={dHIdx}
                  isDark={isDark} colors={colors}
                  onSelect={i => { setDurH(i); checkChanged(startHour, startMinute, i, durM); }}
                />
                <View style={{ width: SEP_W, alignItems: 'center' }}>
                  <Text style={[S.sepSm, { color: colors.textMuted }]}>h</Text>
                </View>
                <WheelPicker
                  items={dMins60} selectedIndex={dMIdx}
                  isDark={isDark} colors={colors}
                  onSelect={i => { setDurM(i); checkChanged(startHour, startMinute, durH, i); }}
                />
                <View style={{ width: SEP_W, alignItems: 'center' }}>
                  <Text style={[S.sepSm, { color: colors.textMuted }]}>m</Text>
                </View>
                <View style={{ width: WHEEL_W }} />
              </View>
            </View>
 
            <View style={[S.div, { backgroundColor: divColor }]} />
 
            {/* END — read-only, auto-calculated */}
            <View style={S.row}>
              <Text style={[S.lbl, { color: colors.textInvisible || colors.textDim }]}>END</Text>
              <View style={S.wheels}>
                <View style={{ width: WHEEL_W, height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[S.endVal, { color: endValColor }]}>{endH12}</Text>
                </View>
                <View style={{ width: SEP_W, alignItems: 'center' }}>
                  <Text style={[S.sep, { color: endValColor }]}>:</Text>
                </View>
                <View style={{ width: WHEEL_W, height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[S.endVal, { color: endValColor }]}>{endMStr}</Text>
                </View>
                <View style={{ width: SEP_W }} />
                <View style={{ width: WHEEL_W, height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[S.endVal, { color: endValColor }]}>{endPer}</Text>
                </View>
              </View>
            </View>
 
            {/* Auto-calculated badge */}
            <View style={{ alignItems: 'center', marginTop: -4, marginBottom: 6 }}>
              <View style={[S.badge, {
                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
              }]}>
                <Text style={[S.badgeTxt, { color: colors.textDim }]}>AUTO-CALCULATED</Text>
              </View>
            </View>
 
            {/* Buttons */}
            <View style={S.btns}>
              <TouchableOpacity
                style={[S.btn, { backgroundColor: cancelBg }]}
                onPress={onClose}
              >
                <Text style={[S.btnTxt, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
 
              <TouchableOpacity
                style={[S.btn, {
                  backgroundColor: hasChanged ? colors.accent : cancelBg,
                  opacity: hasChanged ? 1 : 0.6,
                }]}
                onPress={hasChanged
                  ? () => {
                      onSave(
                        fmt(startHour, startMinute),
                        fmt(endTime.hour, endTime.minute),
                      );
                      onClose();
                    }
                  : undefined}
                activeOpacity={hasChanged ? 0.8 : 1}
              >
                <Text style={[S.btnTxt, { color: hasChanged ? '#fff' : colors.textDim }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
 
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modal:   { width: SW - 32, maxWidth: 360 },
  card:    { borderRadius: RADIUS.xxl, paddingHorizontal: 20, paddingVertical: 18 },
 
  title:   { fontSize: FONT.md + 2, fontWeight: '700', textAlign: 'center', marginBottom: 3 },
  sub:     { fontSize: FONT.sm - 1, textAlign: 'center', marginBottom: 12 },
  div:     { height: 1, marginVertical: 8 },
 
  row:     { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  lbl:     { fontSize: 10, fontWeight: '700', letterSpacing: 1, width: 72 },
  wheels:  { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
 
  sep:    { fontSize: 22, fontWeight: '600' },
  sepSm:  { fontSize: 15, fontWeight: '500' },
  endVal: { fontSize: 22, fontWeight: '500' },
 
  badge:    { borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
 
  btns:   { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn:    { flex: 1, paddingVertical: 13, borderRadius: RADIUS.lg, alignItems: 'center' },
  btnTxt: { fontSize: FONT.sm, fontWeight: '600' },
});
 