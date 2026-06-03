export function getFunctionsBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error("Set EXPO_PUBLIC_API_URL or EXPO_PUBLIC_SUPABASE_URL in .env");
  }

  return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`;
}
