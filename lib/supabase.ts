import { createClient } from "@supabase/supabase-js";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV();

const SUPABASE_KEY_PLACEHOLDERS = new Set([
  "your-anon-key",
  "your-anon-jwt",
  "sb_publishable_xxx",
]);

function getPublicSupabaseKey() {
  const publishableKey = cleanSupabaseKey(process.env.EXPO_PUBLIC_SUPABASE_KEY);
  const anonKey = cleanSupabaseKey(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const key = publishableKey ?? anonKey;

  if (key?.startsWith("sb_secret_")) {
    throw new Error("Do not expose Supabase secret keys in EXPO_PUBLIC_* env vars");
  }

  if (publishableKey && !publishableKey.startsWith("sb_publishable_")) {
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_KEY must be a publishable key (sb_publishable_...). Use EXPO_PUBLIC_SUPABASE_ANON_KEY for legacy anon JWTs."
    );
  }

  return key;
}

function cleanSupabaseKey(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || SUPABASE_KEY_PLACEHOLDERS.has(trimmed)) return undefined;
  return trimmed;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
/** Legacy anon JWT (`eyJ…`) or dashboard publishable key (`sb_publishable_…`). */
const supabaseKey = getPublicSupabaseKey();

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_KEY in .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: {
      getItem: (key) => storage.getString(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => {
        storage.remove(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
