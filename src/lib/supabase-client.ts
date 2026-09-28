/*
 * Browser Supabase client for the persisted assessment slice.
 *
 * Uses only the PUBLIC project URL + publishable key (src/config.ts; browser
 * is untrusted — no service-role or other secret can ever appear here).
 * Auth uses the PKCE flow with same-origin redirects: the magic link returns
 * to this app's origin and is completed in the same browser with a locally
 * held verifier, detected and cleaned from the URL by the SDK.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, loadConfig } from "@/config";

let cached: SupabaseClient | null = null;
let cachedFor: string | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = loadConfig();
  if (!isSupabaseConfigured(config)) {
    return null;
  }
  const cacheKey = `${config.supabaseUrl} ${config.supabasePublishableKey}`;
  if (cached === null || cachedFor !== cacheKey) {
    cached = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedFor = cacheKey;
  }
  return cached;
}

/** Each API request checks the identity and carries that identity's captured token.
 * A queued request from an old workspace cannot borrow the next user's token.
 */
export function getAccountDataClient(authClient: SupabaseClient, userId: string): SupabaseClient {
  const config = loadConfig();
  if (!isSupabaseConfigured(config)) throw new Error("Supabase is not configured.");
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    accessToken: async () => {
      const { data, error } = await authClient.auth.getSession();
      if (error || !data.session || data.session.user.id !== userId || data.session.user.is_anonymous) {
        throw new Error("Your account changed. Reload the assessment before saving.");
      }
      return data.session.access_token;
    },
  });
}
