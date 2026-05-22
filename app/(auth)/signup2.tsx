import { useState, useRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CornerOrnament } from "@/components/twirl/CornerOrnament";
import { StepDots } from "@/components/twirl/StepDots";
import { Button } from "@/components/twirl/Button";
import { supabase } from "@/lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";

const sizes = ["XS", "S", "M", "L", "XL"];
const years = ["'26", "'27", "'28", "'29"];
const greekChoices = ["ΚΚΓ", "ΧΩ", "ΑΔΠ", "ΔΔΔ", "ΚΔ", "ΖΤΑ", "ΑΦ", "ΠΒΦ"];
const stepTitles = ["Your portrait.", "Tell us about you.", "Your chapter.", "A little intro."];

export default function Signup2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; password?: string }>();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [year, setYear] = useState("'27");
  const [major, setMajor] = useState("");
  const [hometown, setHometown] = useState("");
  const [letters, setLetters] = useState("ΚΚΓ");
  const [size, setSize] = useState("S");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);

  async function sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function signUpWithRetry(email: string, password: string) {
    const first = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, school: "University of Arkansas", sorority: letters, size } },
    });

    if (!first.error) return first;

    const message = typeof first.error.message === "string" ? first.error.message : "";
    const isRetryable = message.includes("504") || message.includes("AuthRetryableFetchError");
    if (!isRetryable) return first;

    await sleep(800);
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, school: "University of Arkansas", sorority: letters, size } },
    });
  }

  function formatSignupError(err: unknown) {
    const fallback = "Couldn't create account right now. Please try again.";
    if (!err || typeof err !== "object") return fallback;
    const maybeError = err as { message?: unknown; status?: unknown };
    const rawMessage = typeof maybeError.message === "string" ? maybeError.message : "";
    const looksLikeTransportDump =
      rawMessage.length > 180 || rawMessage.includes("\"headers\"") || rawMessage.includes("\"_bodyBlob\"");
    if (looksLikeTransportDump) return "Request timed out. Please try again.";
    if (rawMessage.trim().length > 0) return rawMessage;
    if (maybeError.status === 504) return "Request timed out. Please try again.";
    return fallback;
  }

  function isRetryableTimeoutError(err: unknown) {
    if (!err || typeof err !== "object") return false;
    const maybeError = err as { message?: unknown; status?: unknown };
    const rawMessage = typeof maybeError.message === "string" ? maybeError.message : "";
    return maybeError.status === 504 || rawMessage.includes("504") || rawMessage.includes("AuthRetryableFetchError");
  }

  async function finishSignup() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const email = params.email || "";
      const password = params.password || "";
      const { data, error: signError } = await signUpWithRetry(email, password);
      if (signError) throw signError;
      const resolvedUser = data.user ?? null;
      if (resolvedUser) {
        const { error: profileErr } = await supabase.from("profiles").upsert({
          id: resolvedUser.id,
          email,
          full_name: name,
          school: "University of Arkansas",
          sorority: letters,
          size,
          bio,
          year,
          major,
          hometown,
        });
        if (profileErr) throw profileErr;
      }
      router.replace("/(tabs)/");
    } catch (e: any) {
      const email = params.email || "";
      const password = params.password || "";

      // Supabase can time out after creating the account. Try sign-in as fallback.
      if (isRetryableTimeoutError(e) && email && password) {
        const signIn = await supabase.auth.signInWithPassword({ email, password });
        if (!signIn.error && signIn.data.user) {
          const { error: profileErr } = await supabase.from("profiles").upsert({
            id: signIn.data.user.id,
            email,
            full_name: name,
            school: "University of Arkansas",
            sorority: letters,
            size,
            bio,
            year,
            major,
            hometown,
          });
          if (!profileErr) {
            router.replace("/(tabs)/");
            return;
          }
        }
      }

      setError(formatSignupError(e));
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  }

  function next() {
    if (step < 3) setStep((s) => s + 1);
    else void finishSignup();
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
    else router.replace("/(auth)/signup1");
  }

  return (
    <SafeAreaView className="flex-1 bg-twirl-cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="absolute -left-10 bottom-[140px] rotate-180">
          <CornerOrnament opacity={0.5} />
        </View>
        <View className="pt-[52px] px-6 flex-row justify-between items-center">
          <Pressable onPress={back}>
            <Text className="text-twirl-muted text-base">←</Text>
          </Pressable>
          <Text className="text-twirl-muted text-[10px] tracking-[1.8px]" style={{ fontFamily: "JetBrainsMono_500Medium" }}>
            {String(step + 2).padStart(2, "0")} / 05
          </Text>
        </View>

        <View className="pt-10 px-6 pb-6">
          <Text className="text-twirl-ink2 text-[10px] tracking-[1.8px] uppercase mb-2" style={{ fontFamily: "JetBrainsMono_500Medium" }}>
            Create your profile
          </Text>
          <Text className="text-twirl-text text-[56px] leading-[56px]" style={{ fontFamily: "CormorantGaramond_500Medium_Italic" }}>
            {stepTitles[step]}
          </Text>
        </View>

        <View className="px-6 flex-1">
          {step === 0 ? (
            <View className="items-center pt-6">
              <View className="w-[200px] h-[200px] rounded-full bg-twirl-paper border border-twirl-line items-center justify-center">
                <Text className="text-twirl-muted text-5xl">👤</Text>
              </View>
              <Text className="text-twirl-ink2 mt-3">Tap to add photo</Text>
            </View>
          ) : null}

          {step === 1 ? (
            <View>
              <LabeledInput label="Name" value={name} onChangeText={setName} />
              <Text className="text-twirl-ink2 text-[10px] tracking-[1.8px] uppercase mb-2">Year</Text>
              <View className="flex-row gap-2 mb-3">
                {years.map((y) => (
                  <Pressable key={y} onPress={() => setYear(y)} className={`h-11 px-4 rounded-full justify-center ${year === y ? "bg-twirl-text" : "bg-twirl-paper border border-twirl-line"}`}>
                    <Text className={`${year === y ? "text-white" : "text-twirl-text"}`}>{y}</Text>
                  </Pressable>
                ))}
              </View>
              <LabeledInput label="Major" value={major} onChangeText={setMajor} />
              <LabeledInput label="Hometown" value={hometown} onChangeText={setHometown} />
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <Text className="text-twirl-ink2 text-[10px] tracking-[1.8px] uppercase mb-2">Chapter</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {greekChoices.map((g) => (
                  <Pressable key={g} onPress={() => setLetters(g)} className={`h-11 px-4 rounded-full justify-center border ${letters === g ? "bg-twirl-rose border-twirl-rose" : "bg-twirl-paper border-twirl-line"}`}>
                    <Text className={`${letters === g ? "text-white" : "text-twirl-rose-deep"} text-xl`} style={{ fontFamily: "CormorantGaramond_500Medium_Italic" }}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="text-twirl-ink2 text-[10px] tracking-[1.8px] uppercase mb-2">Your size</Text>
              <View className="flex-row gap-2">
                {sizes.map((s) => (
                  <Pressable key={s} onPress={() => setSize(s)} className={`flex-1 h-12 rounded-xl items-center justify-center ${size === s ? "bg-twirl-text" : "bg-twirl-paper border border-twirl-line"}`}>
                    <Text className={`${size === s ? "text-white" : "text-twirl-text"}`}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <Text className="text-twirl-ink2 text-[10px] tracking-[1.8px] uppercase mb-2">Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={5}
                placeholder="A line or two. Pinterest energy."
                placeholderTextColor="#A89AA0"
                className="bg-twirl-paper border border-twirl-line rounded-xl px-4 py-4 text-twirl-text min-h-[140px]"
              />
              <Text className="text-right text-twirl-ink2 text-xs mt-2">{bio.length}/280</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-auto px-6 pb-7">
          {error ? <Text className="text-[#7B4141] text-sm mb-2">{error}</Text> : null}
          <View className="mb-[18px]">
            <StepDots step={step + 2} total={5} />
          </View>
          <Button variant="rose" onPress={next} loading={loading}>
            {step === 3 ? "Finish" : "Continue"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-3">
      <Text className="text-twirl-ink2 text-[10px] tracking-[1.8px] uppercase mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#A89AA0"
        className="bg-twirl-paper border border-twirl-line rounded-xl px-4 py-4 text-twirl-text"
      />
    </View>
  );
}
