import React from "react";
import { View, StyleSheet } from "react-native";
import { T } from "../context/tokens";

interface Props {
  pct: number;
  color?: string;
  height?: number;
}

export default function ProgressBar({ pct, color = T.orange, height = 2 }: Props) {
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(Math.max(pct, 0), 100)}%`,
            backgroundColor: color,
            height,
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: T.border,
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 99,
  },
});