import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import Toggle from "../../components/Toggle";
import { useSimpleTheme, ThemeMode } from "../../context/SimpleTheme";
import {
  requestNotificationPermissions,
  scheduleDailySummary,
  cancelDailySummary,
  cancelTaskReminders,
} from "../../utils/notifications";
import { notify } from "../../utils/confirm";
import ConfirmModal from "../../components/ConfirmModal";

const BASE = "";

const APPEARANCE_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "light",  label: "Light" },
  { key: "dark",   label: "Dark" },
  { key: "system", label: "System" },
];

interface Prefs {
  taskReminders:    boolean;
  dailySummary:     boolean;
}

const DEFAULTS: Prefs = {
  taskReminders:    true,
  dailySummary:     false,
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Separate, correct local-date helper — todayStr() above uses toISOString(),
// which gives the UTC date, not the device's local date. That's harmless
// for its current use (an export filename) but would be a real bug for
// "clear today": near midnight, it could delete the wrong day's tasks for
// anyone not on UTC (the exact class of bug _heal_premature_skips was
// written to clean up on the backend.
function localTodayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function SettingsScreen() {
  const { T, themeMode, setThemeMode } = useSimpleTheme();
  const [prefs, setPrefs]         = useState<Prefs>(DEFAULTS);
  const [loading, setLoading]     = useState(true);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ slots: any[]; tasks: any[]; fileName: string } | null>(null);

  const [clearingToday, setClearingToday] = useState(false);
  const [clearingRoutine, setClearingRoutine] = useState(false);
  const [confirmClearToday, setConfirmClearToday] = useState(false);
  const [confirmClearRoutine, setConfirmClearRoutine] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const keys = ["taskReminders", "dailySummary"];
        const stored = await AsyncStorage.multiGet(keys);
        const parsed: Partial<Prefs> = {};
        stored.forEach(([key, val]) => {
          if (val !== null) (parsed as any)[key] = JSON.parse(val);
        });
        const merged = { ...DEFAULTS, ...parsed };
        setPrefs(merged);
        if (merged.dailySummary) {
          const granted = await requestNotificationPermissions();
          if (granted) scheduleDailySummary();
        }
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

    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        // Browsers (and the Emergent web preview in particular) often block
        // the notification permission prompt entirely. On web we keep the
        // toggle on and the preference saved rather than silently reverting
        // it — actual scheduling just gets skipped until permission is
        // available. Native keeps the old strict revert-on-denial behavior.
        if (Platform.OS !== "web") {
          setPrefs(p => ({ ...p, [key]: false }));
          await AsyncStorage.setItem(key, JSON.stringify(false));
          notify("Notifications blocked", "Enable notifications for this app in your device settings, then try again.");
        }
        return;
      }
    }

    if (key === "dailySummary") {
      if (val) await scheduleDailySummary();
      else await cancelDailySummary();
    }

    if (key === "taskReminders" && !val) {
      await cancelTaskReminders();
    }
  };

  const handleReset = () => {
    setConfirmReset(true);
  };

  const confirmResetNow = async () => {
    setConfirmReset(false);
    setResetting(true);
    try {
      const res = await fetch(`${BASE}/api/reset`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.detail || `Server returned ${res.status}`);
      }
      const tasksDeleted = body?.deleted_tasks ?? "?";
      const slotsDeleted = body?.deleted_slots ?? "?";
      notify("Done", `Wiped ${tasksDeleted} tasks and ${slotsDeleted} activities.`);
    } catch (e: any) {
      notify("Reset failed", e?.message || "Could not reset. Check connection.");
    } finally {
      setResetting(false);
    }
  };

  const confirmClearTodayNow = async () => {
    setConfirmClearToday(false);
    setClearingToday(true);
    try {
      const res = await fetch(`${BASE}/api/reset/today?client_today=${localTodayStr()}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.detail || `Server returned ${res.status}`);
      notify("Done", `Cleared ${body?.deleted_tasks ?? "?"} current/upcoming tasks. History is untouched.`);
    } catch (e: any) {
      notify("Clear failed", e?.message || "Could not clear today's tasks. Check connection.");
    } finally {
      setClearingToday(false);
    }
  };

  const confirmClearRoutineNow = async () => {
    setConfirmClearRoutine(false);
    setClearingRoutine(true);
    try {
      const res = await fetch(`${BASE}/api/reset/routine`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.detail || `Server returned ${res.status}`);
      notify("Done", `Cleared ${body?.deleted_slots ?? "?"} activities from Routine. History is untouched.`);
    } catch (e: any) {
      notify("Clear failed", e?.message || "Could not clear Routine. Check connection.");
    } finally {
      setClearingRoutine(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${BASE}/api/export`);
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);
      const fileName = `momentum-export-${todayStr()}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Native has no "Downloads folder" the app can just drop a file
        // into — write it to the app's own sandboxed storage, then hand it
        // to the OS share sheet so the user can save it wherever they like
        // (Drive, Files, email, etc.).
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/json",
            dialogTitle: "Save your Momentum Planner backup",
          });
        } else {
          notify("Saved", `Backup saved as ${fileName}, but sharing isn't available on this device to move it elsewhere.`);
        }
      }
    } catch (e: any) {
      notify("Export failed", e?.message || "Could not export your data. Check your connection.");
    } finally {
      setExporting(false);
    }
  };

  const parseBackupJson = (raw: string, fileName: string) => {
    // Strip a leading byte-order-mark — some transfer paths (email, cloud
    // storage, certain editors) silently prepend one to text files, and
    // JSON.parse rejects it outright even though the rest of the content
    // is otherwise valid JSON.
    const bomStripped = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
    const cleaned = bomStripped.trim();
    try {
      const parsed = JSON.parse(cleaned);
      const slots = Array.isArray(parsed.schedule_slots) ? parsed.schedule_slots : [];
      const tasks = Array.isArray(parsed.daily_tasks) ? parsed.daily_tasks : [];
      setPendingImport({ slots, tasks, fileName });
    } catch (err: any) {
      const preview = cleaned.slice(0, 80).replace(/\s+/g, " ");
      notify(
        "Invalid file",
        `That doesn't look like a Momentum Planner backup file.\n\n${err?.message || "Parse error"}\nFile starts with: ${preview || "(empty)"}`
      );
    }
  };

  const handleImportPress = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => parseBackupJson(String(reader.result), file.name);
        reader.readAsText(file);
      };
      input.click();
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri);
      parseBackupJson(content, asset.name || "backup.json");
    } catch (e) {
      notify("Invalid file", "That doesn't look like a Momentum Planner backup file.");
    }
  };

  const confirmImportNow = async () => {
    if (!pendingImport) return;
    const { slots, tasks } = pendingImport;
    setPendingImport(null);
    setImporting(true);
    try {
      const res = await fetch(`${BASE}/api/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_slots: slots, daily_tasks: tasks }),
      });
      if (!res.ok) throw new Error("import failed");
      notify("Done", "Your backup has been restored. Reopen Today, Routine, and History to see it.");
    } catch (e) {
      notify("Import failed", "Could not import your data. Make sure the file is a Momentum Planner export.");
    } finally {
      setImporting(false);
    }
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
        <View style={[s.appearanceCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[s.rowLabel, { color: T.t1 }]}>Appearance</Text>
          <Text style={[s.rowSub, { color: T.t2, marginBottom: 12 }]}>
            {themeMode === "system" ? "Matches your device" : themeMode === "dark" ? "Always dark" : "Always light"}
          </Text>
          <View style={s.appearanceRow}>
            {APPEARANCE_OPTIONS.map(opt => {
              const active = themeMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    s.appearanceBtn,
                    { borderColor: T.border },
                    active && { backgroundColor: T.orange, borderColor: T.orange },
                  ]}
                  onPress={() => setThemeMode(opt.key)}
                >
                  <Text style={[s.appearanceBtnText, { color: active ? "#fff" : T.t2 }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
        <View style={[s.row, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.t1 }]}>Export data</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>Download a backup file</Text>
          </View>
          <TouchableOpacity
            style={[s.exportBtn, { borderColor: T.border }]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator size="small" color={T.t1} />
              : <Text style={[s.exportBtnText, { color: T.t1 }]}>Export</Text>
            }
          </TouchableOpacity>
        </View>
        <View style={[s.row, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.t1 }]}>Import data</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>Restore from a backup file</Text>
          </View>
          <TouchableOpacity
            style={[s.exportBtn, { borderColor: T.border }]}
            onPress={handleImportPress}
            disabled={importing}
          >
            {importing
              ? <ActivityIndicator size="small" color={T.t1} />
              : <Text style={[s.exportBtnText, { color: T.t1 }]}>Import</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={[s.row, s.dangerRow, { backgroundColor: T.surface }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.danger }]}>Clear today's tasks</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>Wipe current/upcoming tasks only — history stays</Text>
          </View>
          <TouchableOpacity
            style={s.resetBtn}
            onPress={() => setConfirmClearToday(true)}
            disabled={clearingToday}
          >
            {clearingToday
              ? <ActivityIndicator size="small" color={T.danger} />
              : <Text style={[s.resetBtnText, { color: T.danger }]}>Clear</Text>
            }
          </TouchableOpacity>
        </View>
        <View style={[s.row, s.dangerRow, { backgroundColor: T.surface }]}>
          <View style={s.rowInfo}>
            <Text style={[s.rowLabel, { color: T.danger }]}>Clear Routine</Text>
            <Text style={[s.rowSub, { color: T.t2 }]}>Wipe the activity template only — history stays</Text>
          </View>
          <TouchableOpacity
            style={s.resetBtn}
            onPress={() => setConfirmClearRoutine(true)}
            disabled={clearingRoutine}
          >
            {clearingRoutine
              ? <ActivityIndicator size="small" color={T.danger} />
              : <Text style={[s.resetBtnText, { color: T.danger }]}>Clear</Text>
            }
          </TouchableOpacity>
        </View>
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

        <Text style={[s.version, { color: T.t3 }]}>Momentum Planner</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      <LinearGradient
        colors={["transparent", T.bg]}
        style={s.fade}
        pointerEvents="none"
      />

      <ConfirmModal
        visible={confirmReset}
        title="Reset all data?"
        message="This will wipe all tasks and history. This cannot be undone."
        confirmLabel="Reset"
        T={T}
        onCancel={() => setConfirmReset(false)}
        onConfirm={confirmResetNow}
      />

      <ConfirmModal
        visible={confirmClearToday}
        title="Clear today's tasks?"
        message="This deletes today's (and any already-created upcoming) tasks so Today starts fresh from your current Routine. Past history and Trends are not affected."
        confirmLabel="Clear"
        T={T}
        onCancel={() => setConfirmClearToday(false)}
        onConfirm={confirmClearTodayNow}
      />

      <ConfirmModal
        visible={confirmClearRoutine}
        title="Clear Routine?"
        message="This removes all activities from your Routine template. Today's already-generated tasks and all past history are not affected."
        confirmLabel="Clear"
        T={T}
        onCancel={() => setConfirmClearRoutine(false)}
        onConfirm={confirmClearRoutineNow}
      />

      <ConfirmModal
        visible={!!pendingImport}
        title="Import data?"
        message={pendingImport
          ? `This replaces all current activities and tasks with "${pendingImport.fileName}" (${pendingImport.slots.length} activities, ${pendingImport.tasks.length} tasks). This cannot be undone.`
          : ""}
        confirmLabel="Import"
        T={T}
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmImportNow}
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

  appearanceCard:   { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 8 },
  appearanceRow:    { flexDirection: "row", gap: 8 },
  appearanceBtn:    { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  appearanceBtnText: { fontFamily: "Montserrat_600SemiBold", fontSize: 12 },

  exportBtn:      { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 64, alignItems: "center" },
  exportBtnText:  { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },

  resetBtn:      { borderWidth: 1, borderColor: "rgba(192,64,64,0.35)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 64, alignItems: "center" },
  resetBtnText:  { fontFamily: "Montserrat_700Bold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },

  version:       { fontFamily: "Montserrat_500Medium", fontSize: 11, textAlign: "center", letterSpacing: 2, paddingTop: 20 },

  fade:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 } as any,
});
