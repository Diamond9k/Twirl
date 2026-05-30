import "../global.css";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import Constants from "expo-constants";

import { StripeProvider } from "@stripe/stripe-react-native";
import { useAuth } from "@/hooks/useAuth";

const isExpoGo = Constants.appOwnership === "expo";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const segmentList = [...segments] as string[];
  const rootSegment = segmentList[0];
  const authSegment = segmentList[1];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = rootSegment === "(auth)";
    const completingSignup = inAuth && authSegment === "signup2";
    if (!session && !inAuth) router.replace("/(auth)/login");
    if (session && inAuth && !completingSignup) router.replace("/(tabs)/");
  }, [session, loading, rootSegment, authSegment, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-twirl-paper">
        <ActivityIndicator color="#2A1F26" />
      </View>
    );
  }

  if (isExpoGo) {
    return (
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
    );
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!} merchantIdentifier="merchant.com.twirl.rentals">
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
    </StripeProvider>
  );
}
