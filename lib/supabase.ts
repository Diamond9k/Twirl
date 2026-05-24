import { createClient } from "@supabase/supabase-js";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const placeholderValues = new Set(["your-anon-jwt", "sb_publishable_xxx"]);

function configuredEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && !placeholderValues.has(trimmed) ? trimmed : undefined;
}

/** Prefer dashboard publishable keys, with legacy anon JWT as a fallback. */
const supabaseKey =
  configuredEnv(process.env.EXPO_PUBLIC_SUPABASE_KEY) ||
  configuredEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

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
