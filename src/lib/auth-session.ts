import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

export type AuthPhase = "unconfigured" | "restoring" | "signed-out" | "signed-in";
export interface AuthNotice { kind: "link-error" | "session-ended"; message: string }
export type SignInResult = { kind: "sent" } | { kind: "failed"; message: string };
export interface AuthSession {
  phase: AuthPhase; user: User | null; session: Session | null; notice: AuthNotice | null;
  signIn: (email: string) => Promise<SignInResult>; signOut: () => Promise<void>; clearNotice: () => void;
}

// One callback exchange per client, including React StrictMode's effect replay.
const initializations = new WeakMap<SupabaseClient, Promise<AuthNotice | null>>();
function initialize(client: SupabaseClient): Promise<AuthNotice | null> {
  const existing = initializations.get(client);
  if (existing) return existing;
  const pending = (async (): Promise<AuthNotice | null> => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const errorCode = url.searchParams.get("error_code") ?? hash.get("error_code");
    const hasError = url.searchParams.has("error") || hash.has("error") || !!errorCode;
    const code = url.searchParams.get("code");
    try {
      if (hasError) throw new Error(errorCode === "otp_expired" ? "That sign-in link has expired." : "That sign-in link could not be used.");
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }
      return null;
    } catch {
      return { kind: "link-error", message: "That sign-in link could not be used or has expired. Request a new link and open it in the same browser where you requested it." };
    } finally {
      if (code || hasError) {
        for (const key of ["code", "error", "error_code", "error_description"]) {
          url.searchParams.delete(key); hash.delete(key);
        }
        url.hash = hash.toString();
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    }
  })();
  initializations.set(client, pending);
  return pending;
}

export function useAuthSession(client: SupabaseClient | null): AuthSession {
  const [phase, setPhase] = useState<AuthPhase>(client ? "restoring" : "unconfigured");
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const intentionalSignOut = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!client) { setPhase("unconfigured"); setSession(null); return; }
    let active = true;
    let events = 0;
    const apply = (next: Session | null) => {
      const accepted = next?.user.is_anonymous ? null : next;
      setSession(accepted); setPhase(accepted ? "signed-in" : "signed-out");
    };
    const { data } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      events++;
      apply(next);
      if (event === "SIGNED_OUT" && !intentionalSignOut.current) {
        setNotice({ kind: "session-ended", message: "Your session has ended. Please sign in again." });
      }
    });
    const epoch = ++generation.current;
    void (async () => {
      try {
        const callbackNotice = await initialize(client);
        if (!active || epoch !== generation.current) return;
        if (callbackNotice) setNotice(callbackNotice);
        const before = events;
        const { data: restored, error } = await client.auth.getSession();
        if (!active || epoch !== generation.current || before !== events) return;
        if (error) throw error;
        apply(restored.session);
      } catch {
        if (!active || epoch !== generation.current) return;
        apply(null);
        setNotice({ kind: "session-ended", message: "Your session could not be restored. Please sign in again." });
      }
    })();
    return () => { active = false; generation.current++; data.subscription.unsubscribe(); };
  }, [client]);

  const signIn = useCallback(async (email: string): Promise<SignInResult> => {
    if (!client) return { kind: "failed", message: "Sign-in is not configured." };
    try {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: true } });
      if (error) return { kind: "failed", message: error.status === 429 || error.code === "over_email_send_rate_limit"
        ? "Too many sign-in links were requested. Wait a little while and try again."
        : `The sign-in link could not be sent: ${error.message}` };
      return { kind: "sent" };
    } catch { return { kind: "failed", message: "The sign-in request failed. Check your connection and try again." }; }
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client || intentionalSignOut.current) return;
    intentionalSignOut.current = true;
    generation.current++;
    try {
      // This SDK clears local storage even if server-side revocation fails.
      const { error } = await client.auth.signOut({ scope: "local" });
      const { data, error: restoreError } = await client.auth.getSession();
      if (restoreError || data.session) throw new Error("Sign-out could not be confirmed.");
      setSession(null); setPhase("signed-out");
      setNotice(error ? { kind: "session-ended", message: "Signed out of this browser. Server-side session revocation could not be confirmed." } : null);
    } catch {
      setNotice({ kind: "session-ended", message: "Sign-out could not be completed. Check your connection and try again." });
    } finally { intentionalSignOut.current = false; }
  }, [client]);
  return { phase, user: session?.user ?? null, session, notice, signIn, signOut, clearNotice: useCallback(() => setNotice(null), []) };
}
