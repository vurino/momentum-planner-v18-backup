import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSimpleTheme } from "../../context/SimpleTheme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: {
  name: string;
  label: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
}[] = [
  { name: "index",    label: "Today",    icon: "ellipse-outline",   iconActive: "ellipse"    },
  { name: "routine",  label: "Routine",  icon: "repeat-outline",    iconActive: "repeat"     },
  { name: "history",  label: "History",  icon: "bar-chart-outline", iconActive: "bar-chart"  },
  { name: "settings", label: "Settings", icon: "settings-outline",  iconActive: "settings"   },
];

export default function TabsLayout() {
  const { T } = useSimpleTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.surface,
          borderTopColor: T.border,
          borderTopWidth: 1,
          // insets.bottom pushes the actual tab icons/labels up above
          // Android's system navigation bar (gesture pill or 3-button
          // nav) instead of letting it overlap them, while the bar's own
          // background still extends all the way down to the true screen
          // edge so there's no color gap underneath.
          height: 64 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: T.orangeHi,
        tabBarInactiveTintColor: T.t2,
        tabBarLabelStyle: {
          fontFamily: "Montserrat_600SemiBold",
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
