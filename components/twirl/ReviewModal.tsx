import { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, Pressable, Alert } from "react-native";
import { supabase } from "@/lib/supabase";

type Props = {
  visible: boolean;
  rentalId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  onClose: () => void;
  onSubmitted: (rentalId: string) => void;
};

/** Bottom-sheet modal: star rating (1-5) + optional note, writes one review per rental. */
export function ReviewModal({ visible, rentalId, reviewerId, revieweeId, revieweeName, onClose, onSubmitted }: Props) {
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      rental_id: rentalId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      stars,
      body: body.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert("Couldn't submit", error.message);
      return;
    }
    onSubmitted(rentalId);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View style={{ backgroundColor: "#FDFAF4", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <Text style={{ fontFamily: "CormorantGaramond_500Medium_Italic", fontSize: 32, color: "#2A1F26" }}>Rate {revieweeName}</Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#5A4A54", marginTop: 2 }}>How was your rental?</Text>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 18, marginBottom: 18 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                <Text style={{ fontSize: 36, color: n <= stars ? "#B84565" : "#E8DDD4" }}>★</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Add a note (optional)"
            placeholderTextColor="#A89AA0"
            multiline
            maxLength={500}
            style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8DDD4", borderRadius: 14, padding: 14, minHeight: 90, color: "#2A1F26", textAlignVertical: "top" }}
          />

          <TouchableOpacity onPress={submit} disabled={submitting} style={{ backgroundColor: "#2A1F26", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16, opacity: submitting ? 0.6 : 1 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>{submitting ? "submitting..." : "submit review"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: "center", marginTop: 12 }}>
            <Text style={{ color: "#A89AA0" }}>not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
