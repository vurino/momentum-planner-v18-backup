import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toggle from "../../components/Toggle";
import { useSimpleTheme } from "../../context/SimpleTheme";

const BASE = "";

interface Prefs {
  weekStartsMonday: boolean;
  taskReminders:    boolean;
  dailySummary:     boolean;
}

const DEFAULTS: Prefs = {
  weekStartsMonday: true,
  taskReminders:    true,
  dailySummary:     false,
};

export default function SettingsScreen() {
  const { isDark, T, toggleTheme } = useSimpleTheme();
  const [prefs, setPrefs]         = useState<Prefs>(DEFAULTS);
  const [loading, setLoading]     = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const keys = ["weekStartsMonday", "taskReminders", "dailySummary"];
        const stored = await AsyncStorage.multiGet(keys);
        const parsed: Partial<Prefs> = {};
        stored.forEach(([key, val]) => {
          if (val !== null) (parsed as any)[key] = JSON.parse(val);
        });
        setPrefs({ ...DEFAULTS, ...parsed });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setPref = async (key: keyof Prefs, val: boolean) => {
    setPrefs(p => ({ ...p, [key]: val }));
    try {
      await AsyncStorage.setItem(key, JSON.stringify(val));
    } catch (e) { console.error(e); }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset all data?",
      "This will wipe all tasks and history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setResetting(true);
            try {
              await fetch(`${BASE}/api/reset`, { method: "DELETE" });
              Alert.alert("Done", "All data has been wiped.");
            } catch (e) {
              Alert.alert("Error", "Could not reset. Check connection.");
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.orange} />
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={[s.eyebrow, { color: T.orange }]}>Preferences</Text>
          <Text style={[s.title, { color: T.t1 }]}>Settings</Text>
        </View>

        {/* Display */}
        <Text style={[s.sectionLabel, { color: T.t2 }]}>Display</Text>
        <View style={[s.row, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.t1 }]}>Dark mode</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>{isDark ? "On" : "Off"} · tap to switch</Text>
          </View>
          <Toggle value={isDark} onValueChange={toggleTheme} />
        </View>
        <View style={[s.row, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.t1 }]}>Week starts Monday</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>Calendar alignment</Text>
          </View>
          <Toggle
            value={prefs.weekStartsMonday}
            onValueChange={v => setPref("weekStartsMonday", v)}
          />
        </View>

        {/* Notifications */}
        <Text style={[s.sectionLabel, { color: T.t2, marginTop: 24 }]}>Notifications</Text>
        <View style={[s.row, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.t1 }]}>Task reminders</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>5 min before each task</Text>
          </View>
          <Toggle
            value={prefs.taskReminders}
            onValueChange={v => setPref("taskReminders", v)}
          />
        </View>
        <View style={[s.row, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.t1 }]}>Daily summary</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>Evening recap at 9 pm</Text>
          </View>
          <Toggle
            value={prefs.dailySummary}
            onValueChange={v => setPref("dailySummary", v)}
          />
        </View>

        {/* Data */}
        <Text style={[s.sectionLabel, { color: T.t2, marginTop: 24 }]}>Data</Text>
        <View style={[s.row, s.dangerRow, { backgroundColor: T.surface }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.danger }]}>Reset all data</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>Wipe tasks and history</Text>
          </View>
          <TouchableOpacity
            style={s.resetBtn}
            onPress={handleReset}
            disabled={resetting}
          >
            {resetting
              ? <ActivityIndicator size="small" color={T.danger} />
              : <Text style={[s.resetBtnText, { color: T.danger }]}>Reset</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={[s.version, { color: T.t3 }]}>Momentum · v6.0 · Build 22</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      <LinearGradient
        colors={["transparent", T.bg]}
        style={s.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },
  centered:      { flex: 1, alignItems: "center", justifyContent: "center" },

  header:        { paddingTop: 24, paddingBottom: 22 },
  eyebrow:       { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 },
  title:         { fontFamily: "Montserrat_700Bold", fontSize: 28, lineHeight: 34 },

  sectionLabel:  { fontFamily: "Montserrat_700Bold", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10, paddingLeft: 2 },

  row:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 8 },
  dangerRow:     { borderWidth: 1, borderColor: "rgba(192,64,64,0.25)" },
  rowInfo:       { flex: 1 },
  rowLabel:      { fontFamily: "Montserrat_600SemiBold", fontSize: 14 },
  rowSub:        { fontFamily: "Montserrat_500Medium", fontSize: 11, marginTop: 3 },

  resetBtn:      { borderWidth: 1, borderColor: "rgba(192,64,64,0.35)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 64, alignItems: "center" },
  resetBtnText:  { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },

  version:       { fontFamily: "Montserrat_500Medium", fontSize: 11, textAlign: "center", letterSpacing: 2, paddingTop: 20 },

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});