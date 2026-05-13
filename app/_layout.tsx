import "../global.css";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "@gluestack-ui/config";
import { StripeProvider } from "@stripe/stripe-react-native";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuth = segments[0] === "(auth)";

  useEffect(() => {
    if (loading) return;
    if (!session && !inAuth) router.replace("/(auth)/login");
    if (session && inAuth) router.replace("/(tabs)/");
  }, [session, loading, inAuth, router]);

  if (loading || (!session && !inAuth) || (session && inAuth)) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider>
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthGuard>
        </StripeProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
