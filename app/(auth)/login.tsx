import { useState } from "react";
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/twirl/Button";
import { Input } from "@/components/twirl/Input";
import { Wordmark } from "@/components/twirl/Wordmark";
import { CornerOrnament } from "@/components/twirl/CornerOrnament";

export default function LoginScreen() {
  const router = useRouter();
  const [emailLocal, setEmailLocal] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!emailLocal || !password) { setError("Fill in all fields"); return; }
    setLoading(true);
    setError("");
    const email = `${emailLocal.toLowerCase()}@uark.edu`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else router.replace("/(tabs)/");
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-twirl-blush">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-7 pt-[72px] pb-9">
          <View className="absolute top-10 -right-7">
            <CornerOrnament opacity={0.5} />
          </View>
          <View className="flex-1 items-center justify-center">
            <Wordmark size={140} animated />
          </View>

          <View className="mb-1">
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
                <Text className="text-red-500 text-sm">{error}</Text>
              </View>
            ) : null}

            <Input
              label="Email"
              placeholder="margaux"
              value={emailLocal}
              onChangeText={(t) => setEmailLocal(t.replace("@uark.edu", "").replace("@", ""))}
              suffix="@uark.edu"
            />
            <Input label="Password" placeholder="8+ characters" value={password} onChangeText={setPassword} secureTextEntry />

            <View className="mt-1">
              <Button variant="rose" onPress={handleLogin} loading={loading}>
                Sign in
              </Button>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup1")}
              className="items-center mt-6"
            >
              <Text className="text-twirl-ink2 text-[17px]" style={{ fontFamily: "CormorantGaramond_500Medium_Italic" }}>
                Create account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
