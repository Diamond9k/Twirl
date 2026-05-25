import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { StatusBar } from "expo-status-bar";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type ConversationMeta = {
  user1_id: string;
  other_user: { id: string; full_name: string };
  item: { title: string } | null;
};

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadConversation();

    const channel = supabase
      .channel(`conv-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  async function loadConversation() {
    const [{ data: conv }, { data: msgs }] = await Promise.all([
      supabase
        .from("conversations")
        .select("user1_id, user2_id, items(title), user1:profiles!user1_id(id, full_name), user2:profiles!user2_id(id, full_name)")
        .eq("id", id)
        .single(),
      supabase
        .from("messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true }),
    ]);

    if (conv) {
      const isUser1 = conv.user1_id === user!.id;
      const raw = conv as any;
      setMeta({
        user1_id: conv.user1_id,
        other_user: isUser1 ? raw.user2 : raw.user1,
        item: raw.items ?? null,
      });
      // Reset unread count for current user
      await supabase
        .from("conversations")
        .update(isUser1 ? { unread_user1: 0 } : { unread_user2: 0 })
        .eq("id", id);
    }

    setMessages(prev => {
      const incoming = (msgs as Message[]) ?? [];
      const incomingIds = new Set(incoming.map(m => m.id));
      const realtimeOnly = prev.filter(m => !incomingIds.has(m.id));
      return [...incoming, ...realtimeOnly].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function sendMessage() {
    const content = inputText.trim();
    if (!content || sending) return;
    setSending(true);
    setInputText("");

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user!.id,
      content,
    });

    if (insertError) {
      setInputText(content);
      setSending(false);
      return;
    }

    const isUser1 = meta?.user1_id === user!.id;
    const unreadCol = isUser1 ? "unread_user2" : "unread_user1";
    const { data: conv } = await supabase.from("conversations").select(unreadCol).eq("id", id).single();
    await supabase
      .from("conversations")
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        [unreadCol]: ((conv as any)?.[unreadCol] ?? 0) + 1,
      })
      .eq("id", id);

    setSending(false);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-twirl-paper items-center justify-center">
        <ActivityIndicator color="#E56A8A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-twirl-paper">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-twirl-blush px-5 pt-14 pb-4 border-b border-twirl-line flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
          <Text className="text-twirl-text text-xl">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-twirl-text text-xl" style={{ fontFamily: "CormorantGaramond_500Medium_Italic" }}>
            {meta?.other_user?.full_name ?? "..."}
          </Text>
          {meta?.item?.title ? (
            <Text className="text-twirl-pink text-xs">re: {meta.item.title}</Text>
          ) : null}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Text className="text-twirl-muted text-sm">no messages yet — say hi!</Text>
          </View>
        }
        renderItem={({ item: msg }) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <View className={`flex-row ${isMine ? "justify-end" : "justify-start"}`}>
              <View
                className={`max-w-[75%] px-4 py-2.5 ${
                  isMine
                    ? "bg-twirl-pink rounded-2xl rounded-br-sm"
                    : "bg-white border border-twirl-line rounded-2xl rounded-bl-sm"
                }`}
              >
                <Text className={`text-sm leading-5 ${isMine ? "text-white" : "text-twirl-text"}`}>
                  {msg.content}
                </Text>
                <Text className={`text-[10px] mt-1 ${isMine ? "text-white/70" : "text-twirl-muted"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Compose */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <View className="flex-row items-end gap-2 px-4 py-3 pb-8 border-t border-twirl-line bg-twirl-paper">
          <TextInput
            className="flex-1 bg-white border border-twirl-line rounded-2xl px-4 py-3 text-twirl-text text-sm"
            placeholder="message..."
            placeholderTextColor="#A89AA0"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            className="w-10 h-10 rounded-full bg-twirl-pink items-center justify-center"
            style={{ opacity: !inputText.trim() || sending ? 0.4 : 1 }}
          >
            <Text className="text-white text-lg">↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
