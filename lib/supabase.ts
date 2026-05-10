import { createClient } from "@supabase/supabase-js";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
/** Legacy anon JWT (`eyJ…`) or dashboard publishable key (`sb_publishable_…`). */
const exampleKeyValues = new Set([
  "your-anon-key",
  "your-anon-jwt",
  "sb_publishable_xxx",
]);
const realEnvValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && !exampleKeyValues.has(trimmed) ? trimmed : undefined;
};
const supabaseKey =
  realEnvValue(process.env.EXPO_PUBLIC_SUPABASE_KEY) ||
  realEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

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
