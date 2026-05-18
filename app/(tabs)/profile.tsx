import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, FlatList } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { ItemCard } from "@/components/cards/ItemCard";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

type Profile = {
  full_name: string;
  school: string;
  sorority: string;
  size: string;
  rating: number;
  total_rentals: number;
  total_earnings: number;
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myItems, setMyItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
    supabase.from("items").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setMyItems(data ?? []));
  }, [user]);

  return (
    <View className="flex-1 bg-twirl-paper">
      <StatusBar style="dark" />
      <ScrollView>
        <View className="bg-twirl-blush px-5 pt-14 pb-6 border-b border-twirl-line">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-twirl-paper border border-twirl-line items-center justify-center">
              <Text className="text-3xl">👤</Text>
            </View>
            <View className="flex-1">
              <Text className="text-twirl-text text-3xl" style={{ fontFamily: "serif", fontStyle: "italic" }}>{profile?.full_name ?? "..."}</Text>
              <Text className="text-twirl-muted text-sm">{profile?.school}</Text>
              {profile?.sorority ? <Text className="text-twirl-pink text-sm font-medium">{profile.sorority}</Text> : null}
            </View>
            <TouchableOpacity onPress={signOut} className="bg-twirl-paper border border-twirl-line rounded-xl px-3 py-2">
              <Text className="text-twirl-ink2 text-sm">sign out</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row mt-5 gap-3">
            {[
              { label: "size", value: profile?.size ?? "—" },
              { label: "rentals", value: String(profile?.total_rentals ?? 0) },
              { label: "earned", value: `$${profile?.total_earnings ?? 0}` },
              { label: "rating", value: profile?.rating ? `${profile.rating}★` : "—" },
            ].map(stat => (
              <View key={stat.label} className="flex-1 bg-twirl-paper border border-twirl-line rounded-2xl py-3 items-center">
                <Text className="text-twirl-text text-base">{stat.value}</Text>
                <Text className="text-twirl-muted text-[10px] uppercase tracking-[1px]">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-twirl-text text-3xl" style={{ fontFamily: "serif", fontStyle: "italic" }}>my closet</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/list")}>
              <Text className="text-twirl-pink font-semibold text-sm">+ add item</Text>
            </TouchableOpacity>
          </View>

          {myItems.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">👗</Text>
              <Text className="text-twirl-muted">nothing listed yet</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/list")}
                className="bg-twirl-pink rounded-2xl px-6 py-3 mt-4"
              >
                <Text className="text-white font-semibold">list your first item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2 pb-8">
              {myItems.map(item => (
                <ItemCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}`)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
