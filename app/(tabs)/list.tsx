import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { SIZES, OCCASIONS, CATEGORIES } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { StatusBar } from "expo-status-bar";

export default function ListItemScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [deposit, setDeposit] = useState("");
  const [size, setSize] = useState(SIZES[2]);
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const cycleValue = (values: string[], current: string) => {
    const index = values.indexOf(current);
    return values[(index + 1) % values.length];
  };

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  }

  async function uploadImage(uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = uri.split(".").pop() ?? "jpg";
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("item-images").upload(path, blob, { contentType: `image/${ext}` });
    if (error) throw error;
    const { data } = supabase.storage.from("item-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit() {
    if (!title || !pricePerDay || images.length === 0) {
      Alert.alert("Missing info", "Add a title, price, and at least one photo");
      return;
    }
    setLoading(true);
    try {
      const uploadedUrls = await Promise.all(images.map(uploadImage));
      await supabase.from("items").insert({
        owner_id: user!.id,
        title,
        description,
        price_per_day: parseFloat(pricePerDay),
        deposit: parseFloat(deposit) || 0,
        size,
        occasion,
        category,
        images: uploadedUrls,
        available: true,
      });
      Alert.alert("Listed! 🎀", "Your item is now live on Twirl");
      router.replace("/(tabs)/");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-twirl-paper">
      <StatusBar style="dark" />
      <View className="bg-twirl-blush px-5 pt-14 pb-4 border-b border-twirl-line">
        <Text className="text-twirl-text text-5xl" style={{ fontFamily: "serif", fontStyle: "italic" }}>new listing</Text>
        <Text className="text-twirl-muted text-sm mt-1">lend a piece</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20, gap: 16 }}>
        <View>
          <Text className="text-twirl-text font-semibold mb-2">photos <Text className="text-twirl-pink">*</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {images.map((uri, i) => (
              <TouchableOpacity key={i} onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                <Image source={{ uri }} className="w-24 h-32 rounded-2xl" resizeMode="cover" />
                <View className="absolute top-1 right-1 bg-black/50 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs">✕</Text>
                </View>
              </TouchableOpacity>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImages}
                className="w-24 h-32 rounded-2xl bg-twirl-blush border-2 border-dashed border-twirl-pink items-center justify-center"
              >
                <Text className="text-twirl-pink text-2xl">+</Text>
                <Text className="text-twirl-pink text-xs mt-1">add photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <View>
          <Text className="text-twirl-ink2 text-[10px] tracking-[2px] uppercase mb-2">Item name</Text>
          <TextInput
            className="bg-twirl-paper border border-twirl-line rounded-xl px-4 py-3 text-twirl-text"
            placeholder="e.g. Pink Sequin Mini Dress"
            placeholderTextColor="#D1D5DB"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View>
          <Text className="text-twirl-ink2 text-[10px] tracking-[2px] uppercase mb-2">Description</Text>
          <TextInput
            className="bg-twirl-paper border border-twirl-line rounded-xl px-4 py-3 text-twirl-text"
            placeholder="brand, condition, fit notes..."
            placeholderTextColor="#D1D5DB"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-twirl-ink2 text-[10px] tracking-[2px] uppercase mb-2">Price/day</Text>
            <View className="flex-row items-center bg-twirl-paper border border-twirl-line rounded-xl px-4">
              <Text className="text-twirl-muted">$</Text>
              <TextInput
                className="flex-1 py-3 text-twirl-text ml-1"
                placeholder="15"
                placeholderTextColor="#D1D5DB"
                value={pricePerDay}
                onChangeText={setPricePerDay}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-twirl-ink2 text-[10px] tracking-[2px] uppercase mb-2">Deposit</Text>
            <View className="flex-row items-center bg-twirl-paper border border-twirl-line rounded-xl px-4">
              <Text className="text-twirl-muted">$</Text>
              <TextInput
                className="flex-1 py-3 text-twirl-text ml-1"
                placeholder="50"
                placeholderTextColor="#D1D5DB"
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View>
          <Text className="text-twirl-ink2 text-[10px] tracking-[2px] uppercase mb-2">Size</Text>
          <TouchableOpacity onPress={() => setSize(cycleValue(SIZES, size))} className="bg-twirl-paper border border-twirl-line rounded-xl px-4 py-3">
            <Text className="text-twirl-text">{size}</Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text className="text-twirl-ink2 text-[10px] tracking-[2px] uppercase mb-2">Occasion</Text>
          <TouchableOpacity onPress={() => setOccasion(cycleValue(OCCASIONS, occasion))} className="bg-twirl-paper border border-twirl-line rounded-xl px-4 py-3">
            <Text className="text-twirl-text">{occasion}</Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text className="text-twirl-ink2 text-[10px] tracking-[2px] uppercase mb-2">Category</Text>
          <TouchableOpacity onPress={() => setCategory(cycleValue(CATEGORIES, category))} className="bg-twirl-paper border border-twirl-line rounded-xl px-4 py-3">
            <Text className="text-twirl-text">{category}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="bg-twirl-text rounded-xl py-4 items-center mb-8"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <Text className="text-white font-bold text-base">
            {loading ? "listing..." : "list it ✨"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
