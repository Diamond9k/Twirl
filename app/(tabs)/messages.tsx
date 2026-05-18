import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { StatusBar } from "expo-status-bar";

type Conversation = {
  id: string;
  other_user: { id: string; full_name: string };
  last_message: string;
  last_message_at: string;
  unread_count: number;
  item: { title: string };
};

type RawConversation = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string;
  last_message_at: string;
  unread_user1: number;
  unread_user2: number;
  items: { title: string } | null;
  user1: { id: string; full_name: string };
  user2: { id: string; full_name: string };
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchConversations() {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select(`
        id, user1_id, user2_id, last_message, last_message_at,
        unread_user1, unread_user2,
        items(title),
        user1:profiles!user1_id(id, full_name),
        user2:profiles!user2_id(id, full_name)
      `)
      .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
      .order("last_message_at", { ascending: false });

    const shaped = ((data as unknown as RawConversation[]) ?? []).map((c) => {
      const viewerIsUser1 = c.user1_id === user!.id;
      return {
        id: c.id,
        last_message: c.last_message,
        last_message_at: c.last_message_at,
        other_user: viewerIsUser1 ? c.user2 : c.user1,
        item: c.items ?? { title: "" },
        unread_count: viewerIsUser1 ? c.unread_user1 : c.unread_user2,
      };
    });
    setConversations(shaped);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { if (user) fetchConversations(); }, [user?.id]));

  return (
    <View className="flex-1 bg-twirl-paper">
      <StatusBar style="dark" />
      <View className="bg-twirl-blush px-5 pt-14 pb-4 border-b border-twirl-line">
        <Text className="text-twirl-text text-5xl" style={{ fontFamily: "serif", fontStyle: "italic" }}>inbox</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={c => c.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchConversations} tintColor="#F472B6" />}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Text className="text-4xl mb-3">💬</Text>
            <Text className="text-twirl-muted">no messages yet</Text>
          </View>
        }
        renderItem={({ item: c }) => (
          <TouchableOpacity
            onPress={() => router.push(`/conversation/${c.id}`)}
            className="bg-twirl-paper px-5 py-4 border-b border-twirl-line flex-row items-center gap-3"
          >
            <View className="w-12 h-12 rounded-full bg-twirl-blush border border-twirl-line items-center justify-center">
              <Text className="text-2xl">👤</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-twirl-text text-lg" style={{ fontFamily: "serif", fontStyle: "italic" }}>{c.other_user?.full_name}</Text>
                {c.last_message_at && (
                  <Text className="text-twirl-muted text-xs">{new Date(c.last_message_at).toLocaleDateString()}</Text>
                )}
              </View>
              {c.item?.title && (
                <Text className="text-twirl-pink text-xs">re: {c.item.title}</Text>
              )}
              <Text className="text-twirl-muted text-sm mt-0.5" numberOfLines={1}>{c.last_message}</Text>
            </View>
            {c.unread_count > 0 && (
              <View className="w-5 h-5 rounded-full bg-twirl-pink items-center justify-center">
                <Text className="text-white text-xs font-bold">{c.unread_count}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
