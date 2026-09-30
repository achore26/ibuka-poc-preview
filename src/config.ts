import { isApprovedSupabaseProjectUrl } from "@/lib/project-url-guard";

export interface PublicRuntimeConfig {
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/*
 * Test-only release target safeguard (fail closed): the ONLY approved hosted
 * target is the shared synthetic project URL verified in
 * src/lib/project-url-guard.ts; loopback http/https keeps the local stack
 * working. Any other URL — another hosted project, a spoofed host, userinfo,
 * a non-root path, a query/hash or an unintended port — is rejected here so a
 * build-time env override can never point Auth/Data initialization at an
 * arbitrary project. The page then honestly reports "not configured".
 */
function parseProjectUrl(value: string): string | null {
  return isApprovedSupabaseProjectUrl(value) ? value : null;
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
