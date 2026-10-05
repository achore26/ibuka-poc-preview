/*
 * Magic-link sign-in form (compact, 30 September 2026 redesign): the fields
 * and notices that used to sit in a large page block, now composed inside
 * the header's "Sign in" dialog (see sign-in-dialog.tsx). Behaviour is
 * unchanged: the email is used only to request a Supabase magic link that
 * returns to this same origin and must be opened in the same browser on the
 * same device (the PKCE verifier is held locally). No password field exists
 * anywhere in this application.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthNotice, SignInResult } from "@/lib/auth-session";

type SendState = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "failed"; message: string };

export function SignInForm({
  notice,
  onSignIn,
}: {
  notice: AuthNotice | null;
  onSignIn: (email: string) => Promise<SignInResult>;
}) {
  const [email, setEmail] = useState("");
  const [sendState, setSendState] = useState<SendState>({ kind: "idle" });

  const trimmed = email.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed || !emailLooksValid || sendState.kind === "sending") return;
    setSendState({ kind: "sending" });
    const result = await onSignIn(trimmed);
    if (result.kind === "sent") {
      setSendState({ kind: "sent" });
    } else {
      setSendState({ kind: "failed", message: result.message });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 mt-2">
      {notice ? (
        <div
          role="alert"
          className={`rounded-md border px-4 py-3 text-[14px] leading-relaxed ${
            notice.kind === "link-error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-border bg-muted text-foreground"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="sign-in-email" className="text-sm font-medium text-[#0B2545]">
          Email Address
        </label>
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (sendState.kind !== "sending") setSendState({ kind: "idle" });
          }}
          disabled={sendState.kind === "sending"}
          className="h-12 border-gray-200 focus-visible:ring-[#C9962B] focus-visible:border-[#C9962B] transition-all text-[15px]"
        />
      </div>

      <Button
        type="submit"
        className="h-12 w-full bg-[#0B2545] hover:bg-[#0B2545]/90 text-white font-medium text-[15px] transition-all shadow-sm"
        disabled={!trimmed || !emailLooksValid || sendState.kind === "sending"}
      >
        {sendState.kind === "sending" ? "Sending Secure Link..." : "Continue with Email"}
      </Button>

      {sendState.kind === "sent" && (
        <div className="rounded-md bg-[#5CC49A]/10 p-4 border border-[#5CC49A]/30 mt-2">
          <p className="text-[14px] text-[#0A7A53] leading-relaxed">
            <strong>Check your inbox!</strong> A secure sign-in link has been sent{trimmed ? ` to ${trimmed}` : ""}. Please open it on this device to continue.
          </p>
        </div>
      )}

      {sendState.kind === "failed" && (
        <p role="alert" className="text-[13px] text-destructive mt-1 font-medium text-center">
          {sendState.message}
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-[13px] text-gray-500 text-center leading-relaxed">
          Secure, passwordless authentication. By continuing, you agree to the 
          terms of this proof-of-concept. Please use a deliverable email address.
        </p>
      </div>
    </form>
  );
}
