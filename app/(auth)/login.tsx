import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { StatusBar } from "expo-status-bar";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) { setError("Fill in all fields"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-twirl-cream"
    >
      <StatusBar style="dark" />
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-12">
          <Text className="text-5xl font-bold text-twirl-pink tracking-tight">twirl</Text>
          <Text className="text-twirl-muted text-base mt-2">rent. wear. repeat.</Text>
        </View>

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-500 text-sm">{error}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <TextInput
            className="bg-white border border-pink-100 rounded-2xl px-4 py-4 text-twirl-text text-base"
            placeholder="college email"
            placeholderTextColor="#D1D5DB"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            className="bg-white border border-pink-100 rounded-2xl px-4 py-4 text-twirl-text text-base"
            placeholder="password"
            placeholderTextColor="#D1D5DB"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="bg-twirl-pink rounded-2xl py-4 mt-6 items-center"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "signing in..." : "sign in"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          className="items-center mt-5"
        >
          <Text className="text-twirl-muted text-sm">
            new here? <Text className="text-twirl-pink font-semibold">join twirl</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
