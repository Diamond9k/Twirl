import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useStripe } from "@stripe/stripe-react-native";
import { StatusBar } from "expo-status-bar";

export default function ContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [rental, setRental] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("rentals")
      .select("*, items(*, profiles(full_name, school)), profiles!renter_id(full_name)")
      .eq("id", id)
      .single()
      .then(({ data }) => setRental(data));
  }, [id]);

  async function handleAgreeAndPay() {
    if (!agreed) { Alert.alert("Please agree to the rental contract first"); return; }
    setLoading(true);
    try {
      // Create PaymentIntent with manual capture (holds deposit without charging)
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rental_id: rental.id,
          amount: Math.round(rental.total_price * 100),
          deposit: Math.round(rental.items.deposit * 100),
        }),
      });
      const { paymentIntentClientSecret, depositIntentClientSecret } = await response.json();

      // Init payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret,
        merchantDisplayName: "Twirl",
        applePay: { merchantCountryCode: "US" },
        googlePay: { merchantCountryCode: "US", testEnv: true },
        style: "alwaysLight",
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) throw new Error(presentError.message);

      // Log contract agreement. Payment status is finalized by trusted backend code.
      const { error: contractError } = await supabase.from("rental_contracts").insert({
        rental_id: rental.id,
        renter_id: user!.id,
        owner_id: rental.items.owner_id,
        agreed_at: new Date().toISOString(),
        deposit_intent_id: depositIntentClientSecret?.split("_secret")[0],
        terms_version: "1.0",
      });
      if (contractError) throw contractError;

      router.replace("/(tabs)/rentals");
    } catch (e: any) {
      Alert.alert("Payment failed", e.message);
    }
    setLoading(false);
  }

  if (!rental) return null;
  const item = rental.items;
  const deposit = item.deposit;
  const days = Math.ceil((new Date(rental.end_date).getTime() - new Date(rental.start_date).getTime()) / 86400000);

  return (
    <View className="flex-1 bg-twirl-cream">
      <StatusBar style="dark" />
      <View className="bg-white px-5 pt-14 pb-4 border-b border-pink-50">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-twirl-muted text-sm mb-2">← back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-twirl-text">rental contract</Text>
        <Text className="text-twirl-muted text-sm mt-1">read & agree before payment</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20, gap: 16 }}>
        {/* Item summary */}
        <View className="bg-white rounded-3xl p-4">
          <Text className="text-twirl-text font-bold text-lg">{item.title}</Text>
          <Text className="text-twirl-muted text-sm mt-1">
            {rental.start_date} → {rental.end_date} · {days} days
          </Text>
          <View className="flex-row justify-between mt-3 pt-3 border-t border-pink-50">
            <Text className="text-twirl-muted">Rental fee</Text>
            <Text className="text-twirl-text font-semibold">${item.price_per_day * days}</Text>
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-twirl-muted">Service fee (15%)</Text>
            <Text className="text-twirl-text font-semibold">${Math.round(item.price_per_day * days * 0.15)}</Text>
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-twirl-muted">Security deposit (held)</Text>
            <Text className="text-twirl-text font-semibold">${deposit}</Text>
          </View>
          <View className="flex-row justify-between mt-3 pt-3 border-t border-pink-50">
            <Text className="text-twirl-text font-bold">Total charged today</Text>
            <Text className="text-twirl-pink font-bold text-lg">${rental.total_price}</Text>
          </View>
        </View>

        {/* Contract terms */}
        <View className="bg-white rounded-3xl p-5">
          <Text className="text-twirl-text font-bold text-base mb-4">📋 Rental Agreement</Text>
          {[
            {
              title: "1. Security Deposit",
              body: `A security deposit of $${deposit} will be held on your card. It will be automatically released within 48 hours of the item being confirmed returned in its original condition.`,
            },
            {
              title: "2. Non-Return",
              body: `If the item is not returned by ${rental.end_date}, the security deposit will be forfeited and transferred to the lender. Continued non-return may result in account suspension.`,
            },
            {
              title: "3. Damage",
              body: `If the item is returned damaged beyond normal wear, the lender may file a damage claim within 48 hours of return. Twirl will review photo evidence from both parties and make a final determination on deposit release.`,
            },
            {
              title: "4. Condition Documentation",
              body: `Both parties agree that the item photos on the listing represent the item's condition at the time of rental. The renter is responsible for returning the item in the same condition.`,
            },
            {
              title: "5. Late Return",
              body: `Items returned more than 24 hours late will incur an additional charge of $${item.price_per_day} per day, charged from the deposit.`,
            },
            {
              title: "6. Dispute Resolution",
              body: `Twirl's decision on all deposit disputes is final. By agreeing to this contract, both parties accept Twirl as the binding arbitrator.`,
            },
          ].map((section, i) => (
            <View key={i} className={i > 0 ? "mt-4 pt-4 border-t border-pink-50" : ""}>
              <Text className="text-twirl-text font-semibold text-sm">{section.title}</Text>
              <Text className="text-twirl-muted text-sm mt-1 leading-5">{section.body}</Text>
            </View>
          ))}
        </View>

        {/* Agreement checkbox */}
        <TouchableOpacity
          onPress={() => setAgreed(a => !a)}
          className="bg-white rounded-3xl p-4 flex-row items-start gap-3"
        >
          <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center mt-0.5 ${agreed ? "bg-twirl-pink border-twirl-pink" : "border-pink-200"}`}>
            {agreed && <Text className="text-white text-xs font-bold">✓</Text>}
          </View>
          <Text className="text-twirl-text text-sm flex-1 leading-5">
            I have read and agree to the rental contract. I understand the security deposit of{" "}
            <Text className="text-twirl-pink font-bold">${deposit}</Text> will be held and may be forfeited if the item is not returned in its original condition.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAgreeAndPay}
          disabled={loading || !agreed}
          className="rounded-2xl py-4 items-center mb-8"
          style={{ backgroundColor: agreed ? "#F472B6" : "#E5E7EB", opacity: loading ? 0.6 : 1 }}
        >
          <Text className={`font-bold text-base ${agreed ? "text-white" : "text-gray-400"}`}>
            {loading ? "processing..." : `agree & pay $${rental.total_price}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
