import { ActivityIndicator, Pressable, Text, View } from "react-native";

type ButtonVariant = "ink" | "rose" | "plum" | "ghost" | "cream";

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
};

const variantMap: Record<ButtonVariant, { container: string; text: string; spinner: string }> = {
  ink: { container: "bg-twirl-text", text: "text-white", spinner: "#FDFAF4" },
  rose: { container: "bg-twirl-pink", text: "text-white", spinner: "#FDFAF4" },
  plum: { container: "bg-twirl-plum", text: "text-white", spinner: "#FDFAF4" },
  ghost: { container: "bg-transparent border border-twirl-line", text: "text-twirl-text", spinner: "#2A1F26" },
  cream: { container: "bg-twirl-cream border border-twirl-line", text: "text-twirl-text", spinner: "#2A1F26" },
};

export function Button({ children, onPress, variant = "ink", disabled, loading, icon }: Props) {
  const colors = variantMap[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`h-[54px] rounded-[14px] items-center justify-center flex-row gap-2 ${colors.container}`}
      style={({ pressed }) => ({
        opacity: isDisabled ? 0.55 : pressed ? 0.95 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {loading ? (
        <ActivityIndicator color={colors.spinner} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`${colors.text} text-[15px] font-semibold tracking-[0.2px]`}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}
