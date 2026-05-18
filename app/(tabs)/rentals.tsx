import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { StatusBar } from "expo-status-bar";

type Rental = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number;
  items: { title: string; images: string[]; price_per_day: number };
  renter: { full_name: string };
  owner: { full_name: string };
};

type Tab = "renting" | "lending";

export default function RentalsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("renting");
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRentals() {
    setLoading(true);
    const field = tab === "renting" ? "renter_id" : "owner_id";
    const { data } = await supabase
      .from("rentals")
      .select("*, items(title, images, price_per_day), renter:profiles!renter_id(full_name), owner:profiles!owner_id(full_name)")
      .eq(field, user!.id)
      .order("created_at", { ascending: false });
    setRentals(data ?? []);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { if (user) fetchRentals(); }, [tab, user?.id]));

  async function updateStatus(id: string, status: string) {
    await supabase.from("rentals").update({ status }).eq("id", id);
    fetchRentals();
  }

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    active: "bg-blue-100 text-blue-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <View className="flex-1 bg-twirl-paper">
      <StatusBar style="dark" />
      <View className="bg-twirl-blush px-5 pt-14 pb-4 border-b border-twirl-line">
        <Text className="text-twirl-text text-5xl mb-3" style={{ fontFamily: "serif", fontStyle: "italic" }}>ledger</Text>
        <View className="flex-row bg-twirl-paper rounded-xl p-1 border border-twirl-line">
          {(["renting", "lending"] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg items-center ${tab === t ? "bg-twirl-blush" : ""}`}
            >
              <Text className={`text-xs uppercase tracking-[1px] ${tab === t ? "text-twirl-rose" : "text-twirl-muted"}`}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={rentals}
        keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRentals} tintColor="#F472B6" />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Text className="text-4xl mb-3">📦</Text>
            <Text className="text-twirl-muted">no {tab === "renting" ? "rentals" : "lending"} yet</Text>
          </View>
        }
        renderItem={({ item: r }) => (
          <View className="bg-twirl-paper border border-twirl-line rounded-2xl p-4">
            <View className="flex-row gap-3">
              {r.items.images?.[0] ? (
                <Image source={{ uri: r.items.images[0] }} className="w-16 h-20 rounded-2xl" resizeMode="cover" />
              ) : (
                <View className="w-16 h-20 rounded-2xl bg-twirl-blush items-center justify-center">
                  <Text>👗</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-twirl-text text-lg" style={{ fontFamily: "serif", fontStyle: "italic" }} numberOfLines={1}>
                  {r.items.title}
                </Text>
                <Text className="text-twirl-muted text-xs mt-0.5">
                  {tab === "renting" ? `from ${r.owner?.full_name}` : `to ${r.renter?.full_name}`}
                </Text>
                <Text className="text-twirl-muted text-xs mt-1">{r.start_date} → {r.end_date}</Text>
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-twirl-pink font-bold">${r.total_price}</Text>
                  <View className={`rounded-full px-3 py-1 ${statusColor[r.status]?.split(" ")[0] ?? "bg-gray-100"}`}>
                    <Text className={`text-xs font-medium ${statusColor[r.status]?.split(" ")[1] ?? "text-gray-600"}`}>{r.status}</Text>
                  </View>
                </View>
              </View>
            </View>
            {tab === "lending" && r.status === "pending" && (
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  onPress={() => updateStatus(r.id, "approved")}
                  className="flex-1 bg-twirl-text rounded-xl py-2 items-center"
                >
                  <Text className="text-white font-semibold text-sm">approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateStatus(r.id, "cancelled")}
                  className="flex-1 bg-pink-50 border border-pink-200 rounded-xl py-2 items-center"
                >
                  <Text className="text-twirl-pink font-semibold text-sm">decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}
