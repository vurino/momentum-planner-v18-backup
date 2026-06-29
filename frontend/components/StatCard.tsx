import React from "react";
import { View, Text, StyleSheet } from "react-native";

const surface  = "#111116";
const border   = "#1e1e28";
const t3       = "#2e2c3a";
const orange   = "#d4562a";

const bold     = "Montserrat_700Bold";
const semibold = "Montserrat_600SemiBold";

interface Props {
  value: string;
  label: string;
  valueColor?: string;
}

export default function StatCard({ value, label, valueColor = orange }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  value: {
    fontFamily: bold,
    fontSize: 20,
  },
  label: {
    fontFamily: semibold,
    fontSize: 8,
    color: t3,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 3,
  },
});