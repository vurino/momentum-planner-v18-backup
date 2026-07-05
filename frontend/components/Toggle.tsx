import React, { useEffect, useRef } from "react";
import { TouchableOpacity, Animated, StyleSheet } from "react-native";
import { useSimpleTheme } from "../context/SimpleTheme";

interface Props {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ value, onValueChange, disabled = false }: Props) {
  const { T } = useSimpleTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const knobLeft  = anim.interpolate({ inputRange: [0, 1], outputRange: [3, 21] });
  const knobColor = anim.interpolate({ inputRange: [0, 1], outputRange: [T.t3, T.orange] });
  const bgColor   = anim.interpolate({ inputRange: [0, 1], outputRange: [T.border, "rgba(212,86,42,0.22)"] });
  const borderCol = anim.interpolate({ inputRange: [0, 1], outputRange: [T.border, "rgba(212,86,42,0.35)"] });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
    >
      <Animated.View style={[styles.track, { backgroundColor: bgColor, borderColor: borderCol }]}>
        <Animated.View
          style={[
            styles.knob,
            { left: knobLeft, backgroundColor: knobColor },
            value && styles.knobShadow,
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 40,
    height: 22,
    borderRadius: 99,
    borderWidth: 1,
    position: "relative",
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 99,
    top: 3,
  },
  knobShadow: {
    shadowColor: "#ff6b35",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});