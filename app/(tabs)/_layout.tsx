import { Tabs } from "expo-router";
import { View, Text, Pressable } from "react-native";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const PAPER      = "#FDFAF4";
const BLUSH      = "#F7E4DE";
const LINE       = "#E8DDD4";
const INK2       = "#5A4A54";
const ROSE_DEEP  = "#B84565";
const MUTED      = "#A89AA0";
const INK        = "#2A1F26";

function BrowseIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="9" rx="1.5" stroke={color} strokeWidth="1.7"/>
      <Rect x="14" y="3" width="7" height="5" rx="1.5" stroke={color} strokeWidth="1.7"/>
      <Rect x="3" y="15" width="7" height="6" rx="1.5" stroke={color} strokeWidth="1.7"/>
      <Rect x="14" y="11" width="7" height="10" rx="1.5" stroke={color} strokeWidth="1.7"/>
    </Svg>
  );
}

function PlusIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.7"/>
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
    </Svg>
  );
}

function LedgerIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 3h12a2 2 0 012 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
      <Path d="M9 8h7M9 12h7M9 16h4" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
    </Svg>
  );
}

function EnvIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.7"/>
      <Path d="M4 7l8 6 8-6" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
    </Svg>
  );
}

function PersonIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.7"/>
      <Path d="M4 21a8 8 0 0116 0" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
    </Svg>
  );
}

const TABS = [
  { label: "BROWSE",   Icon: BrowseIcon },
  { label: "LIST",     Icon: PlusIcon },
  { label: "RENTALS",  Icon: LedgerIcon },
  { label: "MESSAGES", Icon: EnvIcon },
  { label: "YOU",      Icon: PersonIcon },
];

function TwirlTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: insets.bottom,
      }}
    >
      <View
        style={{
          marginHorizontal: 10,
          marginBottom: 12,
          borderRadius: 24,
          backgroundColor: PAPER,
          borderWidth: 0.5,
          borderColor: LINE,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          paddingVertical: 8,
          shadowColor: INK,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.22,
          shadowRadius: 30,
          elevation: 8,
        }}
      >
        {state.routes.map((route, index) => {
          const active = state.index === index;
          const tab = TABS[index];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              onPress={() => navigation.navigate(route.name)}
              style={{ alignItems: "center", justifyContent: "center", minWidth: 52, minHeight: 44 }}
            >
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  backgroundColor: active ? BLUSH : "transparent",
                }}
              >
                <tab.Icon color={active ? ROSE_DEEP : INK2} size={22} />
              </View>
              <Text
                style={{
                  fontFamily: "JetBrainsMono_500Medium",
                  fontSize: 8,
                  letterSpacing: 1.2,
                  marginTop: 3,
                  color: active ? ROSE_DEEP : MUTED,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TwirlTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="list" />
      <Tabs.Screen name="rentals" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
