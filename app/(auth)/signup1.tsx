import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CornerOrnament } from "@/components/twirl/CornerOrnament";
import { Input } from "@/components/twirl/Input";
import { Button } from "@/components/twirl/Button";
import { StepDots } from "@/components/twirl/StepDots";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Signup1Screen() {
  const router = useRouter();
  const [emailLocal, setEmailLocal] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleContinue() {
    if (!emailLocal) {
      setError("Enter your UARK email");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    router.push({
      pathname: "/(auth)/signup2",
      params: { email: `${emailLocal}@uark.edu`, password },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-twirl-blush">
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="absolute top-7 -right-7">
          <CornerOrnament opacity={0.55} />
        </View>

        <View className="pt-[52px] px-6 flex-row justify-between items-center">
          <Pressable onPress={() => router.back()}>
            <Text className="text-twirl-muted text-base">←</Text>
          </Pressable>
          <Text className="text-twirl-muted text-[10px] tracking-[1.8px]" style={{ fontFamily: "JetBrainsMono_500Medium" }}>
            01 / 02
          </Text>
        </View>

        <View className="pt-14 px-6 pb-8">
          <Text className="text-twirl-text text-[64px] leading-[60px]" style={{ fontFamily: "CormorantGaramond_500Medium_Italic" }}>
            Welcome.
          </Text>
          <Text className="text-twirl-ink2 text-[14px] mt-2.5 leading-[21px]">
            Twirl is invite-only for verified <Text className="font-semibold">@uark.edu</Text> students.
          </Text>
        </View>

        <View className="px-6">
          <Input
            label="UARK Email"
            value={emailLocal}
            onChangeText={(t) => setEmailLocal(t.replace("@uark.edu", ""))}
            placeholder="margaux"
            suffix="@uark.edu"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="8+ characters"
            secureTextEntry
          />
          {error ? <Text className="text-[#7B4141] text-sm mb-1">{error}</Text> : null}
        </View>

        <View className="mt-auto px-6 pb-7">
          <View className="mb-[18px]">
            <StepDots step={1} total={2} />
          </View>
          <Button variant="rose" onPress={handleContinue}>
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
