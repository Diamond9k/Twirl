import { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { COMMISSION_RATE } from "@/lib/constants";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Avatar } from "@/components/twirl/Avatar";

const { width } = Dimensions.get("window");

type Item = {
  id: string;
  title: string;
  description: string;
  price_per_day: number;
  deposit: number;
  size: string;
  occasion: string;
  category: string;
  images: string[];
  available: boolean;
  owner_id: string;
  profiles: { full_name: string; school: string; sorority: string; rating: number; avatar_url: string | null };
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 86400000 * 3));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("items").select("*, profiles(full_name, school, sorority, rating, avatar_url)").eq("id", id).single().then(({ data }) => setItem(data));
  }, [id]);

  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
  const subtotal = (item?.price_per_day ?? 0) * days;
  const fee = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
  const total = subtotal + fee;

  async function handleRentRequest() {
    if (!item || !user) return;
    setLoading(true);
    try {
      const { data: convo } = await supabase.from("conversations").insert({
        user1_id: user.id,
        user2_id: item.owner_id,
        item_id: item.id,
        last_message: `Rental request for ${item.title}`,
        last_message_at: new Date().toISOString(),
      }).select().single();

      const { data: rentalData } = await supabase.from("rentals").insert({
        item_id: item.id,
        renter_id: user.id,
        owner_id: item.owner_id,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        total_price: total,
        commission_amount: fee,
        deposit_amount: item.deposit,
        status: "pending",
        conversation_id: convo?.id,
      }).select().single();

      await supabase.from("messages").insert({
        conversation_id: convo?.id,
        sender_id: user.id,
        content: `Rental request for ${item.title} · ${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()} · $${total}`,
      });

      router.push(`/contract/${rentalData.id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  if (!item) return (
    <View className="flex-1 bg-twirl-paper items-center justify-center">
      <Text className="text-twirl-muted">loading...</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-twirl-paper">
      <StatusBar style="light" />
      <ScrollView>
        <View style={{ position: "relative" }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {(item.images?.length ? item.images : [null]).map((uri, i) => (
              uri ? (
                <Image key={i} source={{ uri }} style={{ width, height: width * 1.25 }} resizeMode="cover" />
              ) : (
                <View key={i} className="bg-twirl-blush items-center justify-center" style={{ width, height: width * 1.25 }}>
                  <Text style={{ fontSize: 80 }}>👗</Text>
                </View>
              )
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => router.back()} className="absolute top-14 left-4 bg-black/30 rounded-full w-10 h-10 items-center justify-center">
            <Text className="text-white text-lg">←</Text>
          </TouchableOpacity>
          {item.images?.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
              {item.images.map((_, i) => (
                <View key={i} className={`w-1.5 h-1.5 rounded-full ${i === imageIndex ? "bg-white" : "bg-white/40"}`} />
              ))}
            </View>
          )}
        </View>

          <View className="px-5 pt-5 pb-32">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-twirl-text text-4xl" style={{ fontFamily: "serif", fontStyle: "italic" }}>{item.title}</Text>
              <Text className="text-twirl-muted text-[10px] uppercase tracking-[1px] mt-1">{item.category} · {item.occasion}</Text>
            </View>
            <View className="items-end">
              <Text className="text-twirl-text text-2xl">${item.price_per_day}</Text>
              <Text className="text-twirl-muted text-xs">per day</Text>
            </View>
          </View>

          <View className="flex-row gap-2 mt-3">
            <View className="bg-twirl-blush rounded-full px-3 py-1">
              <Text className="text-twirl-pink text-sm font-medium">Size {item.size}</Text>
            </View>
            {item.deposit > 0 && (
              <View className="bg-pink-50 rounded-full px-3 py-1">
                <Text className="text-twirl-muted text-sm">${item.deposit} deposit</Text>
              </View>
            )}
          </View>

          {item.description ? (
            <Text className="text-twirl-muted text-sm mt-4 leading-5">{item.description}</Text>
          ) : null}

          <View className="bg-twirl-cream border border-twirl-line rounded-2xl p-4 mt-4 flex-row items-center gap-3">
            <Avatar uri={item.profiles?.avatar_url} size={40} />
            <View>
              <Text className="text-twirl-text font-semibold">{item.profiles?.full_name}</Text>
              <Text className="text-twirl-muted text-xs">{item.profiles?.school}</Text>
              {item.profiles?.sorority ? <Text className="text-twirl-pink text-xs">{item.profiles.sorority}</Text> : null}
            </View>
            {item.profiles?.rating ? (
              <View className="ml-auto">
                <Text className="text-twirl-pink font-bold">{item.profiles.rating}★</Text>
              </View>
            ) : null}
          </View>

          {item.owner_id !== user?.id && (
            <View className="mt-5">
              <Text className="text-twirl-text font-bold text-base mb-3">pick your dates</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  className="flex-1 bg-white border border-pink-100 rounded-2xl px-4 py-3"
                >
                  <Text className="text-twirl-muted text-xs">from</Text>
                  <Text className="text-twirl-text font-semibold">{startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  className="flex-1 bg-white border border-pink-100 rounded-2xl px-4 py-3"
                >
                  <Text className="text-twirl-muted text-xs">until</Text>
                  <Text className="text-twirl-text font-semibold">{endDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>

              {showStartPicker && (
                <DateTimePicker value={startDate} mode="date" minimumDate={new Date()} onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d); }} />
              )}
              {showEndPicker && (
                <DateTimePicker value={endDate} mode="date" minimumDate={startDate} onChange={(_, d) => { setShowEndPicker(false); if (d) setEndDate(d); }} />
              )}

              <View className="bg-white rounded-3xl p-4 mt-4 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-twirl-muted">${item.price_per_day}/day × {days} days</Text>
                  <Text className="text-twirl-text font-medium">${subtotal}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-twirl-muted">service fee (15%)</Text>
                  <Text className="text-twirl-text font-medium">${fee}</Text>
                </View>
                {item.deposit > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-twirl-muted">deposit (refundable)</Text>
                    <Text className="text-twirl-text font-medium">${item.deposit}</Text>
                  </View>
                )}
                <View className="border-t border-pink-100 pt-2 flex-row justify-between">
                  <Text className="text-twirl-text font-bold">total</Text>
                  <Text className="text-twirl-pink font-bold text-lg">${total}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {item.owner_id !== user?.id && item.available && (
        <View className="absolute bottom-0 left-0 right-0 bg-twirl-paper border-t border-twirl-line px-5 py-4 pb-8">
          <TouchableOpacity
            onPress={handleRentRequest}
            disabled={loading}
            className="bg-twirl-text rounded-xl py-4 items-center"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <Text className="text-white font-bold text-base">
              {loading ? "creating request..." : `review contract · $${total}`}
            </Text>
          </TouchableOpacity>
          <Text className="text-twirl-muted text-xs text-center mt-2">
            ${item.deposit} deposit held · refunded on safe return
          </Text>
        </View>
      )}
    </View>
  );
}
