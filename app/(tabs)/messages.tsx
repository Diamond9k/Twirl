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
        id, last_message, last_message_at, unread_count,
        items(title),
        user1:profiles!user1_id(id, full_name),
        user2:profiles!user2_id(id, full_name)
      `)
      .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
      .order("last_message_at", { ascending: false });

    const shaped = (data ?? []).map((c: any) => ({
      ...c,
      other_user: c.user1.id === user!.id ? c.user2 : c.user1,
      item: c.items,
    }));
    setConversations(shaped);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { fetchConversations(); }, []));

  return (
    <View className="flex-1 bg-twirl-cream">
      <StatusBar style="dark" />
      <View className="bg-white px-5 pt-14 pb-4 border-b border-pink-50">
        <Text className="text-2xl font-bold text-twirl-text">messages</Text>
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
            className="bg-white px-5 py-4 border-b border-pink-50 flex-row items-center gap-3"
          >
            <View className="w-12 h-12 rounded-full bg-twirl-blush items-center justify-center">
              <Text className="text-2xl">👤</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-twirl-text font-semibold">{c.other_user?.full_name}</Text>
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
