/*
 * Built-in Node fixtures for the fail-closed Supabase target guard
 * (src/lib/project-url-guard.ts). Same self-running convention as the other
 * unit suites: no framework, exits non-zero on failure, typechecked by
 * `npm run build`.
 *
 * Run with: npm test
 */

import { APPROVED_SUPABASE_PROJECT_ORIGIN, isApprovedSupabaseProjectUrl } from "./project-url-guard.ts";

let failures = 0;
function check(value: string, expected: boolean, note: string): void {
  const actual = isApprovedSupabaseProjectUrl(value);
  if (actual !== expected) {
    failures += 1;
    console.error(`FAIL ${note}: isApprovedSupabaseProjectUrl(${JSON.stringify(value)}) -> ${actual}, expected ${expected}`);
  }
}

// -- Accept: the one known shared test host, in its exact canonical forms ----
check(APPROVED_SUPABASE_PROJECT_ORIGIN, true, "approved origin constant");
check("https://eaveywzurnrqyeejlapl.supabase.co/", true, "approved origin with root slash");
// Default-port spelling normalizes to the canonical origin — still the same target.
check("https://eaveywzurnrqyeejlapl.supabase.co:443/", true, "approved origin with normalized default port");

// -- Accept: loopback HTTP/HTTPS for the local stack (any port) --------------
check("http://127.0.0.1:55421", true, "loopback IPv4 with local-stack port");
check("http://127.0.0.1:55421/", true, "loopback IPv4 root slash");
check("http://localhost:54321", true, "localhost with port");
check("https://localhost", true, "localhost over https");
check("http://[::1]:55421", true, "loopback IPv6");
check("https://127.0.0.1:8443", true, "loopback https with port");

// -- Reject: any OTHER hosted project (fail closed on unknown targets) -------
check("https://otherproject.supabase.co", false, "unrelated Supabase project");
check("https://production-tenant.supabase.co/", false, "production-sounding unrelated project");
check("https://supabase.co", false, "bare vendor host");
check("https://eaveywzurnrqyeejlapl.supabase.co.evil.example", false, "suffix spoof of approved host");
check("https://fake-eaveywzurnrqyeejlapl.supabase.co", false, "prefix spoof of approved host");
check("https://EAVEYWZURNRQYEEJLAPL.SUPABASE.CO.", false, "dns-normalization trick (trailing dot)");

// -- Reject: approved host, wrong shape ---------------------------------------
check("https://user:eaveywzurnrqyeejlapl.supabase.co", false, "userinfo (empty user) on approved host");
check("https://user:pass@eaveywzurnrqyeejlapl.supabase.co", false, "userinfo on approved host");
check("https://eaveywzurnrqyeejlapl.supabase.co/rest/v1", false, "non-root path");
check("https://eaveywzurnrqyeejlapl.supabase.co?apikey=x", false, "query on approved host");
check("https://eaveywzurnrqyeejlapl.supabase.co#frag", false, "fragment on approved host");
check("https://eaveywzurnrqyeejlapl.supabase.co:8443", false, "unintended port on approved host");
check("http://eaveywzurnrqyeejlapl.supabase.co", false, "plain http to the hosted project");

// -- Reject: non-loopback local-shaped and malformed values -------------------
check("http://127.0.0.1.evil.example:55421", false, "suffix spoof of loopback");
// A numeric loopback (http://2130706433) is canonicalized to 127.0.0.1 by the
// WHATWG URL parser, so it is genuinely loopback — accepted by design.
check("http://2130706433", true, "numeric loopback canonicalizes to 127.0.0.1");
check("http://example.com:55421", false, "non-loopback host");
check("https://example.com", false, "non-loopback https host");
check("file:///etc/passwd", false, "non-network scheme");
check("eaveywzurnrqyeejlapl.supabase.co", false, "bare hostname without scheme");
check("", false, "empty string");
check("not a url", false, "unparseable string");

if (failures > 0) {
  throw new Error(`project-url-guard.test: ${failures} failure(s)`);
}
console.log("project-url-guard.test: all checks pass");
