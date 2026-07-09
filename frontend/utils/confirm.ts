// frontend/utils/confirm.ts — this is a NEW file, create it
import { Alert, Platform } from "react-native";

// RN's Alert.alert with custom buttons does not render on react-native-web
// (no dialog is shown and button callbacks never fire), so confirmations
// route through window.confirm on web and Alert.alert everywhere else.
export function confirmAsync(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(
      typeof window !== "undefined" ? window.confirm(`${title}\n\n${message}`) : false
    );
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirm", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}