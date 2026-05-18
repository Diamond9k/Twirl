import { View } from "react-native";

type Props = {
  step: number;
  total: number;
};

export function StepDots({ step, total }: Props) {
  return (
    <View className="flex-row gap-1.5 items-center">
      {Array.from({ length: total }).map((_, index) => {
        const active = index + 1 === step;
        return (
          <View
            key={index}
            style={{
              height: 4,
              width: active ? 16 : 4,
              borderRadius: 999,
              backgroundColor: active ? "#B84565" : "#E8DDD4",
            }}
          />
        );
      })}
    </View>
  );
}
