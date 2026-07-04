import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#111116",
          borderTopColor: "#1e1e28",
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#ff6b35",
        tabBarInactiveTintColor: "#2e2c3a",
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