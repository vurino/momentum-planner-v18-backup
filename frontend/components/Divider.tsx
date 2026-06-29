import React from "react";
import { LinearGradient } from "expo-linear-gradient";

export default function Divider() {
  return (
    <LinearGradient
      colors={["transparent", "#d4562a88", "#ff6b3566", "#d4562a88", "transparent"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ height: 1, width: "100%", marginVertical: 4 }}
    />
  );
}