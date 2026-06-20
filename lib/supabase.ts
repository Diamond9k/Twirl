import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PLACEHOLDER_ENV_VALUES = new Set([
  "https://your-project.supabase.co",
  "your-anon-key",
  "your-anon-jwt",
  "sb_publishable_xxx",
]);

function configuredEnvValue(value: string | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue || PLACEHOLDER_ENV_VALUES.has(trimmedValue)) return undefined;
  return trimmedValue;
}

const supabaseUrl = configuredEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
/** Legacy anon JWT (`eyJ…`) or dashboard publishable key (`sb_publishable_…`). */
const supabaseKey =
  configuredEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  configuredEnvValue(process.env.EXPO_PUBLIC_SUPABASE_KEY);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_KEY in .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: {
      getItem: (key) => AsyncStorage.getItem(key),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      removeItem: (key) => AsyncStorage.removeItem(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
