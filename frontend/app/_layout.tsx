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
import { SimpleThemeProvider, useSimpleTheme } from "../context/SimpleTheme";
import { ThemeProvider } from "../context/ThemeContext";

function RootLayoutInner() {
  const { T } = useSimpleTheme();

  return (
    <>
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
    </>
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
    <ThemeProvider>
      <SimpleThemeProvider>
        <RootLayoutInner />
      </SimpleThemeProvider>
    </ThemeProvider>
  );
}