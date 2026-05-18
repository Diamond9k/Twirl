import { Tabs } from "expo-router";
import { View, Text } from "react-native";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text className={`text-[10px] mt-0.5 uppercase tracking-[1px] ${focused ? "text-twirl-text font-semibold" : "text-twirl-muted"}`}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FDFAF4",
          borderTopColor: "#E8DDD4",
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👗" label="browse" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="✨" label="list" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rentals"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" label="rentals" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
