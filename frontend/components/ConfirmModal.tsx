// frontend/components/ConfirmModal.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ThemeTokens } from "../context/SimpleTheme";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  T: ThemeTokens;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  T,
  onCancel,
  onConfirm,
}: Props) {
  if (!visible) return null;

  return (
    <View style={s.overlay}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onCancel} />
      <View style={[s.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[s.title, { color: T.t1 }]}>{title}</Text>
        <Text style={[s.message, { color: T.t2 }]}>{message}</Text>
        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, { backgroundColor: T.border }]} onPress={onCancel}>
            <Text style={[s.btnText, { color: T.t2 }]}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: destructive ? T.danger : T.orange }]}
            onPress={onConfirm}
          >
            <Text style={[s.btnText, { color: "#fff" }]}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    zIndex: 1000, elevation: 1000,
  },
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  card: { width: "84%", maxWidth: 340, borderWidth: 1, borderRadius: 16, padding: 20 },
  title: { fontFamily: "Montserrat_700Bold", fontSize: 16, marginBottom: 8 },
  message: { fontFamily: "Montserrat_500Medium", fontSize: 13, lineHeight: 19, marginBottom: 20 },
  actions: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnText: { fontFamily: "Montserrat_700Bold", fontSize: 13 },
});