import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { StatusBar } from "expo-status-bar";

type Rental = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number;
  deposit_amount: number;
  stripe_payment_intent: string | null;
  stripe_deposit_intent: string | null;
  items: { title: string; images: string[]; price_per_day: number };
  renter: { full_name: string };
  owner: { full_name: string };
};

type Tab = "renting" | "lending";

const COLORS = {
  paper:    "#FDFAF4",
  blush:    "#F7E4DE",
  line:     "#E8DDD4",
  ink:      "#2A1F26",
  ink2:     "#5A4A54",
  muted:    "#A89AA0",
  rose:     "#E56A8A",
  roseDeep: "#B84565",
  text:     "#2A1F26",
};

export default function RentalsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("renting");
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchRentals() {
    setLoading(true);
    const field = tab === "renting" ? "renter_id" : "owner_id";
    const { data } = await supabase
      .from("rentals")
      .select("*, items(title, images, price_per_day), renter:profiles!renter_id(full_name), owner:profiles!owner_id(full_name)")
      .eq(field, user!.id)
      .order("created_at", { ascending: false });
    setRentals(data ?? []);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { if (user) fetchRentals(); }, [tab, user?.id]));

  async function updateStatus(id: string, status: string) {
    await supabase.from("rentals").update({ status }).eq("id", id);
    fetchRentals();
  }

  async function confirmAction(title: string, message: string, action: () => Promise<void>) {
    return new Promise<void>((resolve) => {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel", onPress: () => resolve() },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            await action();
            resolve();
          },
        },
      ]);
    });
  }

  async function handleApprove(rental: Rental) {
    await confirmAction("Approve Request", `Approve rental for ${rental.renter?.full_name}? They'll receive a payment link.`, async () => {
      setActionLoading(rental.id);
      await updateStatus(rental.id, "approved");
      setActionLoading(null);
    });
  }

  async function handleDecline(rental: Rental) {
    await confirmAction("Decline Request", "Decline this rental request?", async () => {
      setActionLoading(rental.id);
      await updateStatus(rental.id, "cancelled");
      setActionLoading(null);
    });
  }

  async function handleConfirmHandoff(rental: Rental) {
    await confirmAction("Confirm Handoff", "You've given the item to the renter?", async () => {
      setActionLoading(rental.id);
      await updateStatus(rental.id, "active");
      setActionLoading(null);
    });
  }

  async function handleConfirmReturn(rental: Rental) {
    await confirmAction(
      "Confirm Return",
      "Item returned in good condition? This will charge the renter and release their deposit.",
      async () => {
        setActionLoading(rental.id);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const apiUrl = getFunctionsUrl();
          const res = await fetch(`${apiUrl}/release-deposit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ rental_id: rental.id }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Failed");
          fetchRentals();
        } catch (err: any) {
          Alert.alert("Error", err.message ?? "Could not complete return. Try again.");
        } finally {
          setActionLoading(null);
        }
      }
    );
  }

  const statusColor: Record<string, { bg: string; text: string }> = {
    pending:   { bg: "#FEF3C7", text: "#92400E" },
    approved:  { bg: "#D1FAE5", text: "#065F46" },
    paid:      { bg: "#D1FAE5", text: "#065F46" },
    active:    { bg: "#DBEAFE", text: "#1E40AF" },
    completed: { bg: "#F3F4F6", text: "#6B7280" },
    cancelled: { bg: "#FEE2E2", text: "#991B1B" },
    disputed:  { bg: "#FEE2E2", text: "#991B1B" },
  };

  function renderActions(rental: Rental, isLending: boolean) {
    const isActing = actionLoading === rental.id;

    if (isActing) {
      return (
        <View style={{ marginTop: 10, alignItems: "center" }}>
          <ActivityIndicator size="small" color={COLORS.rose} />
        </View>
      );
    }

    // LENDING (owner) actions
    if (isLending) {
      if (rental.status === "pending") {
        return (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => handleDecline(rental)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.blush, borderWidth: 1, borderColor: COLORS.line, alignItems: "center" }}
            >
              <Text style={{ color: COLORS.ink2, fontSize: 12, letterSpacing: 1, fontWeight: "600" }}>DECLINE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleApprove(rental)}
              style={{ flex: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.rose, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontSize: 12, letterSpacing: 1, fontWeight: "600" }}>APPROVE</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (rental.status === "paid") {
        return (
          <TouchableOpacity
            onPress={() => handleConfirmHandoff(rental)}
            style={{ marginTop: 10, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.ink, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 12, letterSpacing: 1, fontWeight: "600" }}>CONFIRM HANDOFF</Text>
          </TouchableOpacity>
        );
      }

      if (rental.status === "active") {
        return (
          <TouchableOpacity
            onPress={() => handleConfirmReturn(rental)}
            style={{ marginTop: 10, paddingVertical: 10, borderRadius: 12, backgroundColor: "#065F46", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 12, letterSpacing: 1, fontWeight: "600" }}>CONFIRM RETURN & RELEASE DEPOSIT</Text>
          </TouchableOpacity>
        );
      }
    }

    // RENTING (renter) info states
    if (!isLending) {
      if (rental.status === "approved") {
        return (
          <TouchableOpacity
            onPress={() => router.push(`/contract/${rental.id}`)}
            style={{ marginTop: 10, backgroundColor: "#065F46", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}
          >
            <Text style={{ color: "#fff", fontSize: 12, textAlign: "center", letterSpacing: 1, fontWeight: "600" }}>COMPLETE PAYMENT</Text>
          </TouchableOpacity>
        );
      }
      if (rental.status === "paid") {
        return (
          <View style={{ marginTop: 10, backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: "#92400E", fontSize: 12, textAlign: "center" }}>Waiting for owner to confirm handoff</Text>
          </View>
        );
      }
    }

    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <StatusBar style="dark" />
      <View style={{ backgroundColor: COLORS.blush, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.line }}>
        <Text style={{ color: COLORS.text, fontSize: 48, marginBottom: 12, fontFamily: "CormorantGaramond_500Medium_Italic", fontStyle: "italic" }}>ledger</Text>
        <View style={{ flexDirection: "row", backgroundColor: COLORS.paper, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: COLORS.line }}>
          {(["renting", "lending"] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: tab === t ? COLORS.blush : "transparent" }}
            >
              <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: tab === t ? COLORS.rose : COLORS.muted }}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={rentals}
        keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRentals} tintColor={COLORS.rose} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text>
            <Text style={{ color: COLORS.muted }}>no {tab === "renting" ? "rentals" : "lending"} yet</Text>
          </View>
        }
        renderItem={({ item: r }) => (
          <View style={{ backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {r.items.images?.[0] ? (
                <Image source={{ uri: r.items.images[0] }} style={{ width: 64, height: 80, borderRadius: 16 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 64, height: 80, borderRadius: 16, backgroundColor: COLORS.blush, alignItems: "center", justifyContent: "center" }}>
                  <Text>👗</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontFamily: "CormorantGaramond_500Medium_Italic", fontStyle: "italic" }} numberOfLines={1}>
                  {r.items.title}
                </Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>
                  {tab === "renting" ? `from ${r.owner?.full_name}` : `to ${r.renter?.full_name}`}
                </Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 4 }}>{r.start_date} → {r.end_date}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ color: COLORS.rose, fontWeight: "700" }}>${r.total_price}</Text>
                  <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: (statusColor[r.status] ?? { bg: "#F3F4F6" }).bg }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: (statusColor[r.status] ?? { text: "#6B7280" }).text }}>{r.status}</Text>
                  </View>
                </View>
              </View>
            </View>
            {renderActions(r, tab === "lending")}
          </View>
        )}
      />
    </View>
  );
}

function getFunctionsUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (process.env.EXPO_PUBLIC_SUPABASE_URL) {
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
  }
  throw new Error("Missing Supabase functions URL");
}
