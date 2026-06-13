import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, FlatList, Linking, Alert } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { ItemCard } from "@/components/cards/ItemCard";
import { Avatar } from "@/components/twirl/Avatar";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Profile = {
  full_name: string;
  school: string;
  sorority: string;
  size: string;
  rating: number;
  total_rentals: number;
  total_earnings: number;
  stripe_account_id: string | null;
  avatar_url: string | null;
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [reviewAvg, setReviewAvg] = useState<number | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  async function setupPayouts() {
    setConnectLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert("Error", "Not logged in"); return; }
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not open payout setup");
    } finally {
      setConnectLoading(false);
    }
  }

  function deleteAccount() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and personal data. Shared transaction records are anonymized and retained where required. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) { Alert.alert("Error", "Not logged in"); return; }
              const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${session.access_token}`,
                },
              });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error ?? "Failed to delete account");
              await signOut();
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Could not delete account");
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
    supabase.from("items").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setMyItems(data ?? []));
    supabase.from("reviews").select("stars").eq("reviewee_id", user.id).then(({ data }) => {
      if (data && data.length) {
        const avg = data.reduce((sum, r) => sum + (r.stars ?? 0), 0) / data.length;
        setReviewAvg(Math.round(avg * 10) / 10);
      } else {
        setReviewAvg(null);
      }
    });
  }, [user]);

  return (
    <View className="flex-1 bg-twirl-paper">
      <StatusBar style="dark" />
      <ScrollView>
        <View className="bg-twirl-blush px-5 pb-6 border-b border-twirl-line" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center gap-4">
            <Avatar uri={profile?.avatar_url} size={64} />
            <View className="flex-1">
              <Text className="text-twirl-text text-3xl" style={{ fontFamily: "CormorantGaramond_500Medium_Italic" }}>{profile?.full_name ?? "..."}</Text>
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
              { label: "rating", value: reviewAvg != null ? `${reviewAvg}★` : "—" },
            ].map(stat => (
              <View key={stat.label} className="flex-1 bg-twirl-paper border border-twirl-line rounded-2xl py-3 items-center">
                <Text className="text-twirl-text text-base">{stat.value}</Text>
                <Text className="text-twirl-muted text-[10px] uppercase tracking-[1px]">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {!profile?.stripe_account_id && (
          <TouchableOpacity
            onPress={setupPayouts}
            disabled={connectLoading}
            className="mx-5 mt-4 bg-twirl-blush border border-twirl-line rounded-2xl px-4 py-3 flex-row items-center justify-between"
          >
            <View>
              <Text className="text-twirl-text font-semibold text-sm">set up payouts</Text>
              <Text className="text-twirl-muted text-xs mt-0.5">connect your bank to get paid</Text>
            </View>
            <Text className="text-twirl-pink font-bold text-lg">→</Text>
          </TouchableOpacity>
        )}

        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-twirl-text text-3xl" style={{ fontFamily: "CormorantGaramond_500Medium_Italic" }}>my closet</Text>
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

        <TouchableOpacity onPress={deleteAccount} style={{ alignItems: "center", marginTop: 24, marginBottom: 40 }}>
          <Text style={{ color: "#B84565", fontSize: 13 }}>delete account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
