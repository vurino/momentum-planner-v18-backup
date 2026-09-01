import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import { View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { SimpleThemeProvider, useSimpleTheme } from "../context/SimpleTheme";
import { ThemeProvider } from "../context/ThemeContext";

function RootLayoutInner() {
  const { T } = useSimpleTheme();

  return (
    // edgeToEdgeEnabled (app.json) makes Android draw the app under the
    // status bar and the system navigation bar. Only the top inset is
    // applied here — the bottom inset is handled by the tab bar itself in
    // (tabs)/_layout.tsx, since that's the component actually sitting at
    // the bottom edge.
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar style={T.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: T.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="focus"
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#090909" }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SimpleThemeProvider>
          <RootLayoutInner />
        </SimpleThemeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
