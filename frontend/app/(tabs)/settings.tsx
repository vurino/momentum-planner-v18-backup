import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, SPACING, RADIUS, FONT } from '../../context/ThemeContext';
import { ConfirmModal } from '../../components/CustomModal';
 
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
 
const Switch = ({ value, onValueChange, colors }: {
  value: boolean; onValueChange: (v: boolean) => void; colors: any;
}) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    style={[S.switch, { backgroundColor: value ? colors.accent : colors.bgBase }]}
  >
    <View style={[S.switchThumb, { marginLeft: value ? 24 : 2 }]} />
  </Pressable>
);
 
const PrefRow = ({ icon, label, control, colors }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; control: React.ReactNode; colors: any;
}) => (
  <View style={S.prefRow}>
    <View style={S.prefLeft}>
      <Ionicons name={icon} size={16} color={colors.accent} />
      <Text style={[S.prefLabel, { color: colors.textBody }]}>{label}</Text>
    </View>
    {control}
  </View>
);
 
const Section = ({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) => (
  <View style={[S.section, { backgroundColor: colors.bgSurface || '#212530' }]}>
    <Text style={[S.sectionTitle, { color: colors.textDim }]}>{title}</Text>
    {children}
  </View>
);
 
export default function SettingsScreen() {
  const { isDark, colors, toggleTheme, weekStartsOnMonday, setWeekStartsOnMonday } = useTheme();
  const insets = useSafeAreaInsets();
  const [resetModal, setResetModal] = useState(false);
 
  const handleResetAll = async () => {
    setResetModal(false);
    try {
      await fetch(`${API_URL}/api/schedule-slots/reset`, { method: 'POST' });
    } catch (e) { console.error(e); }
  };
 
  return (
    <View style={[S.screen, { backgroundColor: colors.bgBase }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFillObject} />
 
      <View style={[S.safe, { paddingTop: insets.top }]}>
        <View style={S.header}>
          <Text style={[S.title, { color: colors.textPrimary }]}>Settings</Text>
        </View>
 
        <View style={S.content}>
 
          {/* Appearance */}
          <Section title="APPEARANCE" colors={colors}>
            <PrefRow
              icon={isDark ? 'moon-outline' : 'sunny-outline'}
              label="Dark mode"
              colors={colors}
              control={<Switch value={isDark} onValueChange={toggleTheme} colors={colors} />}
            />
          </Section>
 
          {/* Calendar */}
          <Section title="CALENDAR" colors={colors}>
            <PrefRow
              icon="calendar-outline"
              label="Week starts on Monday"
              colors={colors}
              control={<Switch value={weekStartsOnMonday} onValueChange={setWeekStartsOnMonday} colors={colors} />}
            />
          </Section>
 
          {/* Data */}
          <Section title="DATA" colors={colors}>
            <TouchableOpacity style={S.dangerRow} onPress={() => setResetModal(true)}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[S.dangerLabel, { color: colors.danger }]}>Reset all data</Text>
            </TouchableOpacity>
          </Section>
 
          {/* About */}
          <View style={S.about}>
            <Text style={[S.aboutTxt, { color: colors.textDim }]}>Momentum Planner</Text>
            <Text style={[S.aboutVersion, { color: colors.textInvisible }]}>v1.0.0</Text>
          </View>
 
        </View>
      </View>
 
      <ConfirmModal
        visible={resetModal}
        onClose={() => setResetModal(false)}
        onConfirm={handleResetAll}
        title="Reset all data"
        message="This will restore the default schedule and clear all task history. This cannot be undone."
        confirmText="Reset"
        isDanger
        isDark={isDark}
        colors={colors}
      />
    </View>
  );
}
 
const S = StyleSheet.create({
  screen: { flex: 1 },
  safe:   { flex: 1 },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
 
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title:  { fontSize: FONT.xl, fontWeight: '700', letterSpacing: -0.5 },
 
  section: { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: SPACING.md },
 
  prefRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  prefLabel: { fontSize: FONT.sm, fontWeight: '500' },
 
  switch: { width: 46, height: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
 
  dangerRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 4 },
  dangerLabel: { fontSize: FONT.sm, fontWeight: '500' },
 
  about:        { alignItems: 'center', marginTop: SPACING.xl },
  aboutTxt:     { fontSize: FONT.xs },
  aboutVersion: { fontSize: FONT.xs, marginTop: 2 },
});
 