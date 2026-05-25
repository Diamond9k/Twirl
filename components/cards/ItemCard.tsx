import { TouchableOpacity, View, Text, Image, Dimensions } from "react-native";

const CARD_WIDTH = (Dimensions.get("window").width - 20 * 2 - 16) / 2;

type Props = {
  item: {
    id: string;
    title: string;
    price_per_day: number;
    size: string;
    occasion: string;
    images: string[];
    profiles?: { full_name: string; school: string };
  };
  onPress: () => void;
};

export function ItemCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        width: CARD_WIDTH,
        aspectRatio: 3 / 4,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: "#F7E4DE",
        borderWidth: 0.5,
        borderColor: "#E8DDD4",
      }}
    >
      {item.images?.[0] ? (
        <Image
          source={{ uri: item.images[0] }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 48 }}>👗</Text>
        </View>
      )}

      {/* Glass meta strip */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(253,250,244,0.94)",
          paddingHorizontal: 10,
          paddingTop: 8,
          paddingBottom: 10,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontFamily: "CormorantGaramond_500Medium_Italic",
            fontSize: 14,
            color: "#2A1F26",
            letterSpacing: -0.2,
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 11,
            color: "#B84565",
            marginTop: 2,
            letterSpacing: 0.3,
          }}
        >
          ${item.price_per_day}/day
        </Text>
      </View>
    </TouchableOpacity>
  );
}
