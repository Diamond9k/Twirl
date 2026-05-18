import { AccessibilityInfo, Text, View } from "react-native";
import { useEffect, useState } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

type Props = {
  size?: number;
  color?: string;
  animated?: boolean;
};

const LETTERS = ["t", "w", "i", "r", "l"];
const DELAYS = [150, 450, 780, 1130, 1450];

export function Wordmark({ size = 140, color = "#B84565", animated = false }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [widths, setWidths] = useState<number[]>([]);
  const ready = widths.length === LETTERS.length;
  const p0 = useSharedValue(animated ? 0 : 1);
  const p1 = useSharedValue(animated ? 0 : 1);
  const p2 = useSharedValue(animated ? 0 : 1);
  const p3 = useSharedValue(animated ? 0 : 1);
  const p4 = useSharedValue(animated ? 0 : 1);
  const progresses = [p0, p1, p2, p3, p4];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (!animated || !ready) return;
    progresses.forEach((progress, index) => {
      progress.value = withDelay(
        DELAYS[index],
        withTiming(1, {
          duration: reduceMotion ? 200 : 420,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })
      );
    });
  }, [animated, ready, reduceMotion]);

  return (
    <View accessibilityRole="image" accessibilityLabel="Twirl">
      {!ready ? (
        <View className="flex-row absolute opacity-0">
          {LETTERS.map((letter, index) => (
            <Text
              key={index}
              onLayout={(e) => {
                const width = e.nativeEvent.layout.width;
                setWidths((prev) => {
                  const next = [...prev];
                  next[index] = width;
                  return next;
                });
              }}
              style={{
                fontFamily: "CormorantGaramond_500Medium",
                fontSize: size,
                lineHeight: size * 0.9,
                letterSpacing: size * -0.022,
                color,
              }}
            >
              {letter}
            </Text>
          ))}
        </View>
      ) : null}
      <View className="flex-row">
        {LETTERS.map((letter, index) => {
          const animatedStyle = useAnimatedStyle(() => ({
            width: widths[index] ? widths[index] * progresses[index].value : 0,
            opacity: reduceMotion ? progresses[index].value : 1,
            overflow: "hidden",
          }));
          return (
            <Animated.View key={index} style={animated ? animatedStyle : undefined}>
              <Text
                style={{
                  fontFamily: "CormorantGaramond_500Medium",
                  fontSize: size,
                  lineHeight: size * 0.9,
                  letterSpacing: size * -0.022,
                  color,
                }}
              >
                {letter}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
