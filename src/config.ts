export interface PublicRuntimeConfig {
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)
  );
}

// HTTPS is required so the publishable key is never sent to an insecure origin;
// plain http is accepted only for loopback addresses during local development.
function parseProjectUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return value;
    if (url.protocol === "http:" && isLoopbackHostname(url.hostname)) return value;
    return null;
  } catch {
    return null;
  }
}

export function loadConfig(): PublicRuntimeConfig {
  const rawUrl = readNonEmptyString(import.meta.env.VITE_SUPABASE_URL);
  return {
    supabaseUrl: rawUrl === null ? null : parseProjectUrl(rawUrl),
    supabasePublishableKey: readNonEmptyString(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  };
}

export type ConfiguredRuntimeConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export function isSupabaseConfigured(
  config: PublicRuntimeConfig
): config is ConfiguredRuntimeConfig {
  return config.supabaseUrl !== null && config.supabasePublishableKey !== null;
}
