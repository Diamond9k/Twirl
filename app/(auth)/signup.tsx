import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/lib/supabase";
import { SEC_SCHOOLS, SIZES } from "@/lib/constants";
import { StatusBar } from "expo-status-bar";

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState(SEC_SCHOOLS[0]);
  const [sorority, setSorority] = useState("");
  const [size, setSize] = useState(SIZES[2]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    if (!email || !password || !name) { setError("Fill in all fields"); return; }
    setLoading(true);
    setError("");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, school, sorority, size },
      },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: name,
        school,
        sorority,
        size,
        email,
      });
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-twirl-cream"
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-8 pt-16">
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : router.back()} className="mb-8">
          <Text className="text-twirl-muted text-sm">← back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-twirl-text mb-1">
          {step === 1 ? "create account" : "your style"}
        </Text>
        <Text className="text-twirl-muted mb-8">
          {step === 1 ? "use your .edu email" : "help others find your listings"}
        </Text>

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-500 text-sm">{error}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <View className="gap-3">
            <TextInput
              className="bg-white border border-pink-100 rounded-2xl px-4 py-4 text-twirl-text text-base"
              placeholder="full name"
              placeholderTextColor="#D1D5DB"
              value={name}
              onChangeText={setName}
            />
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
            <TouchableOpacity
              onPress={() => setStep(2)}
              className="bg-twirl-pink rounded-2xl py-4 mt-3 items-center"
            >
              <Text className="text-white font-semibold text-base">next →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            <View>
              <Text className="text-twirl-muted text-xs mb-1 ml-1">school</Text>
              <View className="bg-white border border-pink-100 rounded-2xl overflow-hidden">
                <Picker selectedValue={school} onValueChange={setSchool} style={{ color: "#1C1024" }}>
                  {SEC_SCHOOLS.map(s => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
              </View>
            </View>
            <TextInput
              className="bg-white border border-pink-100 rounded-2xl px-4 py-4 text-twirl-text text-base"
              placeholder="sorority (optional)"
              placeholderTextColor="#D1D5DB"
              value={sorority}
              onChangeText={setSorority}
            />
            <View>
              <Text className="text-twirl-muted text-xs mb-1 ml-1">your size</Text>
              <View className="bg-white border border-pink-100 rounded-2xl overflow-hidden">
                <Picker selectedValue={size} onValueChange={setSize} style={{ color: "#1C1024" }}>
                  {SIZES.map(s => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading}
              className="bg-twirl-pink rounded-2xl py-4 mt-3 items-center"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <Text className="text-white font-semibold text-base">
                {loading ? "creating account..." : "join twirl 🎀"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
