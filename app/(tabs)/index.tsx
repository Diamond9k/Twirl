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
    <View className="flex-1 bg-twirl-paper">
      <StatusBar style="dark" />
      <View className="bg-twirl-blush px-5 pt-14 pb-4 border-b border-twirl-line">
        <Text className="text-twirl-text mb-2 text-5xl" style={{ fontFamily: "serif", fontStyle: "italic" }}>
          browse
        </Text>
        <TextInput
          className="bg-twirl-paper rounded-full px-4 py-3 text-twirl-text text-sm border border-twirl-line"
          placeholder="search dresses, tops, skirts..."
          placeholderTextColor="#A89AA0"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3 bg-twirl-paper" contentContainerStyle={{ gap: 8 }}>
        <TouchableOpacity
          onPress={() => setSelectedOccasion("")}
          className={`px-4 py-2 rounded-full border ${!selectedOccasion ? "bg-twirl-text border-twirl-text" : "bg-twirl-paper border-twirl-line"}`}
        >
          <Text className={`text-xs tracking-[1px] uppercase ${!selectedOccasion ? "text-white" : "text-twirl-ink2"}`}>All</Text>
        </TouchableOpacity>
        {OCCASIONS.map(o => (
          <TouchableOpacity
            key={o}
            onPress={() => setSelectedOccasion(selectedOccasion === o ? "" : o)}
            className={`px-4 py-2 rounded-full border ${selectedOccasion === o ? "bg-twirl-text border-twirl-text" : "bg-twirl-paper border-twirl-line"}`}
          >
            <Text className={`text-xs tracking-[1px] uppercase ${selectedOccasion === o ? "text-white" : "text-twirl-ink2"}`}>{o}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchItems} tintColor="#E56A8A" />}
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
