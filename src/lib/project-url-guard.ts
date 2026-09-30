/*
 * Fail-closed Supabase target guard (test-only release, 30 September 2026).
 *
 * This release is a TEST WORKSPACE: the only hosted backend it may ever
 * initialize against is the shared synthetic project
 * https://eaveywzurnrqyeejlapl.supabase.co (plus loopback HTTP/HTTPS for the
 * local stack). Anything else — another hosted project, a spoofed host,
 * userinfo, a non-root path, a query/hash or an unintended port — must be
 * rejected so a build-time env override can never point this app's Auth/Data
 * initialization at an arbitrary (e.g. real production) project. An unknown
 * target simply leaves the app unconfigured: sign-in and saving stay
 * unavailable and the page says so honestly.
 *
 * Pure string/URL logic only — unit-verifiable with no DOM or SDK.
 */

/** The one approved hosted origin (canonical Supabase project URL). */
export const APPROVED_SUPABASE_PROJECT_ORIGIN = "https://eaveywzurnrqyeejlapl.supabase.co";

const APPROVED_HOSTNAME = "eaveywzurnrqyeejlapl.supabase.co";

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

/*
 * Rules (all must hold):
 *  - parses as an absolute URL, no userinfo, root path only, no query/hash;
 *  - EITHER the EXACT approved https hostname with the default port,
 *    OR a loopback hostname over http/https (any port — the local stack uses
 *    fixed non-standard ports; a numeric loopback like http://2130706433 is
 *    canonicalized to 127.0.0.1 by the URL parser and is still loopback).
 * A thrown URL parse also rejects (fail closed).
 */
export function isApprovedSupabaseProjectUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username !== "" || url.password !== "") return false;
  if (url.search !== "" || url.hash !== "") return false;
  const path = url.pathname;
  if (path !== "" && path !== "/") return false;
  if (url.hostname.toLowerCase() === APPROVED_HOSTNAME) {
    // The one approved hosted target: canonical https, default port only
    // (an explicitly written :443 normalizes to "" by the URL parser).
    return url.protocol === "https:" && url.port === "";
  }
  if (isLoopbackHostname(url.hostname)) {
    return url.protocol === "https:" || url.protocol === "http:";
  }
  return false;
}
