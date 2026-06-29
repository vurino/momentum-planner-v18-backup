import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toggle from "../../components/Toggle";

const BASE = "http://localhost:8001";

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
      <View style={s.centered}>
        <ActivityIndicator color="#d4562a" />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={s.eyebrow}>Preferences</Text>
          <Text style={s.title}>Settings</Text>
        </View>

        {/* Display */}
        <Text style={s.sectionLabel}>Display</Text>
        <View style={s.row}>
          <View style={s.rowInfo}>
            <Text style={s.rowLabel}>Dark mode</Text>
            <Text style={s.rowSub}>Always on · coming soon</Text>
          </View>
          <View style={s.disabledToggle}>
            <View style={s.disabledKnob} />
          </View>
        </View>
        <View style={s.row}>
          <View style={s.rowInfo}>
            <Text style={s.rowLabel}>Week starts Monday</Text>
            <Text style={s.rowSub}>Calendar alignment</Text>
          </View>
          <Toggle
            value={prefs.weekStartsMonday}
            onValueChange={v => setPref("weekStartsMonday", v)}
          />
        </View>

        {/* Notifications */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Notifications</Text>
        <View style={s.row}>
          <View style={s.rowInfo}>
            <Text style={s.rowLabel}>Task reminders</Text>
            <Text style={s.rowSub}>5 min before each task</Text>
          </View>
          <Toggle
            value={prefs.taskReminders}
            onValueChange={v => setPref("taskReminders", v)}
          />
        </View>
        <View style={s.row}>
          <View style={s.rowInfo}>
            <Text style={s.rowLabel}>Daily summary</Text>
            <Text style={s.rowSub}>Evening recap at 9 pm</Text>
          </View>
          <Toggle
            value={prefs.dailySummary}
            onValueChange={v => setPref("dailySummary", v)}
          />
        </View>

        {/* Data */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Data</Text>
        <View style={[s.row, s.dangerRow]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, s.dangerLabel]}>Reset all data</Text>
            <Text style={s.rowSub}>Wipe tasks and history</Text>
          </View>
          <TouchableOpacity
            style={s.resetBtn}
            onPress={handleReset}
            disabled={resetting}
          >
            {resetting
              ? <ActivityIndicator size="small" color="#c04040" />
              : <Text style={s.resetBtnText}>Reset</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.version}>Momentum · v6.0 · Build 22</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      <LinearGradient
        colors={["transparent", "#090909"]}
        style={s.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: "#090909" },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },
  centered:      { flex: 1, backgroundColor: "#090909", alignItems: "center", justifyContent: "center" },

  header:        { paddingTop: 24, paddingBottom: 22 },
  eyebrow:       { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 4, color: "#d4562a", textTransform: "uppercase", marginBottom: 6 },
  title:         { fontFamily: "Montserrat_700Bold", fontSize: 28, color: "#ede9e1", lineHeight: 34 },

  sectionLabel:  { fontFamily: "Montserrat_700Bold", fontSize: 10, letterSpacing: 3, color: "#5a576a", textTransform: "uppercase", marginBottom: 10, paddingLeft: 2 },

  row:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: "#111116", borderWidth: 1, borderColor: "#1e1e28", borderRadius: 14, padding: 16, marginBottom: 8 },
  dangerRow:     { borderColor: "rgba(192,64,64,0.25)" },
  rowInfo:       { flex: 1 },
  rowLabel:      { fontFamily: "Montserrat_600SemiBold", fontSize: 14, color: "#ede9e1" },
  rowSub:        { fontFamily: "Montserrat_500Medium", fontSize: 11, color: "#5a576a", marginTop: 3 },
  dangerLabel:   { color: "#c04040" },

  disabledToggle: { width: 40, height: 22, borderRadius: 99, backgroundColor: "#1e1e28", borderWidth: 1, borderColor: "#1e1e28", justifyContent: "center", opacity: 0.4 },
  disabledKnob:   { width: 14, height: 14, borderRadius: 99, backgroundColor: "#d4562a", marginLeft: 21 },

  resetBtn:      { borderWidth: 1, borderColor: "rgba(192,64,64,0.35)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 64, alignItems: "center" },
  resetBtnText:  { fontFamily: "Montserrat_700Bold", fontSize: 11, color: "#c04040", letterSpacing: 1, textTransform: "uppercase" },

  version:       { fontFamily: "Montserrat_500Medium", fontSize: 11, color: "#2e2c3a", textAlign: "center", letterSpacing: 2, paddingTop: 20 },

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});