import { View, Text, Image } from "react-native";

type Props = { uri?: string | null; size?: number; emoji?: string };

/** Round avatar that renders the user's photo, falling back to an emoji when absent. */
export function Avatar({ uri, size = 48, emoji = "👤" }: Props) {
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: "#FDFAF4" }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "#F7E4DE",
        borderWidth: 1,
        borderColor: "#E8DDD4",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}
