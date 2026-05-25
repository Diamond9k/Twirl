import { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
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

const FILTERS = ["All", "Formal", "Casual", "Game Day", "Sorority"];

const OCCASION_MAP: Record<string, string[]> = {
  Formal:    ["Formals", "Formal", "Date Night", "Crush Party"],
  Casual:    ["Going Out", "Darty", "Day Event"],
  "Game Day":["Game Day"],
  Sorority:  ["Bid Day", "Philanthropy", "Recruitment"],
};

export default function BrowseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    setLoading(true);
    let query = supabase
      .from("items")
      .select("*, profiles(full_name, school)")
      .eq("available", true)
      .neq("owner_id", user?.id ?? "")
      .order("created_at", { ascending: false });

    if (filter !== "All") {
      const occasions = OCCASION_MAP[filter] ?? [];
      if (occasions.length > 0) query = query.in("occasion", occasions);
    }

    const { data } = await query.limit(50);
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, [filter]);

  const itemCount = items.length;

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF4" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{ backgroundColor: "#F7E4DE", height: 150, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
          <View>
            <Text style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: "#5A4A54" }}>
              UARK · Spring Rush
            </Text>
            <Text style={{ fontFamily: "CormorantGaramond_500Medium_Italic", fontSize: 44, color: "#2A1F26", letterSpacing: -1, lineHeight: 42, marginTop: 1 }}>
              The Closet.
            </Text>
          </View>
          <Text style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 10, letterSpacing: 1.5, color: "#B8945A", textTransform: "uppercase" }}>
            {itemCount} pieces
          </Text>
        </View>

        {/* Search bar */}
        <View style={{ backgroundColor: "#FDFAF4", borderRadius: 999, borderWidth: 0.5, borderColor: "#E8DDD4", paddingVertical: 11, paddingHorizontal: 18, flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontFamily: "CormorantGaramond_500Medium_Italic", fontSize: 17, color: "#A89AA0", letterSpacing: -0.1, flex: 1 }}>
            silk slip, bow dress, crimson…
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 14 }}
        style={{ backgroundColor: "#FDFAF4", flexGrow: 0 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              height: 34,
              paddingHorizontal: 14,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: filter === f ? "#2A1F26" : "transparent",
              borderWidth: filter === f ? 0 : 1,
              borderColor: "#E8DDD4",
            }}
          >
            <Text style={{
              fontFamily: "JetBrainsMono_500Medium",
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: filter === f ? "#FDFAF4" : "#5A4A54",
            }}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        numColumns={2}
        contentContainerStyle={{ gap: 16, padding: 20, paddingBottom: 140 }}
        columnWrapperStyle={{ gap: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchItems} tintColor="#E56A8A" />}
        ListEmptyComponent={
          !loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <Text style={{ fontFamily: "CormorantGaramond_500Medium_Italic", fontSize: 28, color: "#2A1F26", marginBottom: 8 }}>
                No pieces yet.
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#A89AA0" }}>
                Check back during rush week.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
        )}
      />
    </View>
  );
}
