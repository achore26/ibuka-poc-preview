import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:55473";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const segment = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const jwt = `${segment({ alg: "none", typ: "JWT" })}.${segment({
  sub: USER_ID, aud: "authenticated", role: "authenticated",
  email: "adapter.tester@example.test", iat: now, exp: now + 86400,
})}.${Buffer.from("synthetic-adapter-signature").toString("base64url")}`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
page.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("requestfailed", (r) => console.log("REQFAILED", r.method(), r.url(), r.failure()?.errorText));
page.on("response", (r) => { if (r.url().includes("supabase")) console.log("RESP", r.status(), r.request().method(), r.url().slice(0, 120)); });

await page.route("**/auth/v1/user*", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: USER_ID, email: "adapter.tester@example.test", aud: "authenticated", role: "authenticated", is_anonymous: false }) }));

await page.goto(base);
const result = await page.evaluate(async (token) => {
  const module = await import("/src/lib/supabase-client.ts");
  const client = module.getSupabaseClient();
  const res = await client.auth.setSession({ access_token: token, refresh_token: "synthetic-adapter-refresh" });
  const session = await client.auth.getSession();
  return {
    setError: res.error ? String(res.error) : null,
    phase: session.data.session ? "has-session" : "no-session",
    userId: session.data.session?.user?.id ?? null,
    isAnonymous: session.data.session?.user?.is_anonymous ?? null,
  };
}, jwt);
console.log(JSON.stringify(result, null, 2));
await browser.close();
