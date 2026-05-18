import { TouchableOpacity, View, Text, Image, Dimensions } from "react-native";

const WIDTH = (Dimensions.get("window").width - 32) / 2;

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
      className="bg-twirl-paper rounded-2xl overflow-hidden border border-twirl-line"
      style={{ width: WIDTH }}
      activeOpacity={0.9}
    >
      {item.images?.[0] ? (
        <Image
          source={{ uri: item.images[0] }}
          style={{ width: WIDTH, height: WIDTH * 1.3 }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="bg-twirl-blush items-center justify-center"
          style={{ width: WIDTH, height: WIDTH * 1.3 }}
        >
          <Text style={{ fontSize: 40 }}>👗</Text>
        </View>
      )}
      <View className="p-3">
        <Text className="text-twirl-text text-base" style={{ fontFamily: "serif", fontStyle: "italic" }} numberOfLines={1}>
          {item.title}
        </Text>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-twirl-text text-sm">
            ${item.price_per_day}
            <Text className="text-twirl-muted text-xs">/day</Text>
          </Text>
          <View className="bg-twirl-blush rounded-full px-2 py-0.5 border border-twirl-line">
            <Text className="text-twirl-rose text-xs font-medium">{item.size}</Text>
          </View>
        </View>
        {item.occasion ? (
          <Text className="text-twirl-muted text-[10px] mt-1 uppercase tracking-[1px]">{item.occasion}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
