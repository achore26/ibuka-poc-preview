import { isSupabaseConfigured, loadConfig } from "../config";

export type ConnectivityState =
  | "reachable"
  | "not-configured"
  | "unreachable"
  | "unexpected-response";

export interface ConnectivityResult {
  state: ConnectivityState;
  httpStatus: number | null;
}

export async function checkSupabaseConnectivity(): Promise<ConnectivityResult> {
  const config = loadConfig();
  if (!isSupabaseConfigured(config)) {
    return { state: "not-configured", httpStatus: null };
  }
  try {
    const endpoint = new URL("/auth/v1/health", config.supabaseUrl);
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: { apikey: config.supabasePublishableKey },
      cache: "no-store",
    });
    return response.ok
      ? { state: "reachable", httpStatus: response.status }
      : { state: "unexpected-response", httpStatus: response.status };
  } catch {
    return { state: "unreachable", httpStatus: null };
  }
}
