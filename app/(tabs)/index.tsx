import { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { OCCASIONS, SIZES, CATEGORIES } from "@/lib/constants";
import { ItemCard } from "@/components/cards/ItemCard";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/hooks/useAuth";

type Item = {
  id: string;
  title: string;
  price_per_day: number;
  size: string;
  occasion: string;
  category: string;
  images: string[];
  profiles: { full_name: string; school: string };
};

export default function BrowseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    setLoading(true);
    let query = supabase
      .from("items")
      .select("*, profiles(full_name, school)")
      .eq("available", true)
      .neq("owner_id", user?.id ?? "")
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("title", `%${search}%`);
    if (selectedOccasion) query = query.eq("occasion", selectedOccasion);
    if (selectedSize) query = query.eq("size", selectedSize);

    const { data } = await query.limit(50);
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, [search, selectedOccasion, selectedSize]);

  return (
    <View className="flex-1 bg-twirl-cream">
      <StatusBar style="dark" />
      <View className="bg-white px-5 pt-14 pb-4 shadow-sm">
        <Text className="text-2xl font-bold text-twirl-text mb-3">twirl <Text className="text-twirl-pink">✨</Text></Text>
        <TextInput
          className="bg-twirl-blush rounded-2xl px-4 py-3 text-twirl-text text-sm"
          placeholder="search dresses, tops, skirts..."
          placeholderTextColor="#D1B8C5"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3 bg-white border-b border-pink-50" contentContainerStyle={{ gap: 8 }}>
        <TouchableOpacity
          onPress={() => setSelectedOccasion("")}
          className={`px-4 py-2 rounded-full border ${!selectedOccasion ? "bg-twirl-pink border-twirl-pink" : "bg-white border-pink-200"}`}
        >
          <Text className={`text-sm font-medium ${!selectedOccasion ? "text-white" : "text-twirl-muted"}`}>All</Text>
        </TouchableOpacity>
        {OCCASIONS.map(o => (
          <TouchableOpacity
            key={o}
            onPress={() => setSelectedOccasion(selectedOccasion === o ? "" : o)}
            className={`px-4 py-2 rounded-full border ${selectedOccasion === o ? "bg-twirl-pink border-twirl-pink" : "bg-white border-pink-200"}`}
          >
            <Text className={`text-sm font-medium ${selectedOccasion === o ? "text-white" : "text-twirl-muted"}`}>{o}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchItems} tintColor="#F472B6" />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20">
            <Text className="text-4xl mb-3">👗</Text>
            <Text className="text-twirl-muted text-base">no items found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
        )}
      />
    </View>
  );
}
