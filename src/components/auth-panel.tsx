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

const hintClass = "text-xs leading-relaxed text-muted-foreground";

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
    <form onSubmit={submit} className="flex flex-col gap-3">
      {notice ? (
        <p
          role="alert"
          className={`rounded-md border px-3 py-2 text-sm leading-relaxed ${
            notice.kind === "link-error"
              ? "border-destructive/40 bg-destructive/5 text-foreground"
              : "border-border bg-muted text-foreground"
          }`}
        >
          {notice.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sign-in-email" className="text-sm font-medium">
          Email address
        </label>
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tester@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (sendState.kind !== "sending") setSendState({ kind: "idle" });
          }}
          disabled={sendState.kind === "sending"}
          className="h-11 sm:h-9"
        />
      </div>
      <Button
        type="submit"
        className="h-11 sm:h-9"
        disabled={!trimmed || !emailLooksValid || sendState.kind === "sending"}
      >
        {sendState.kind === "sending" ? "Sending…" : "Send sign-in link"}
      </Button>
      {sendState.kind === "sent" ? (
        <p role="status" className={hintClass}>
          Link sent{trimmed ? ` to ${trimmed}` : ""}. Open it in this same browser on this same
          device — it continues the request started here, and it expires after
          use. Opening it on another device or browser will not sign you in.
        </p>
      ) : null}
      {sendState.kind === "failed" ? (
        <p role="alert" className={hintClass}>
          {sendState.message}
        </p>
      ) : null}
      <p className={hintClass}>
        Use a real, deliverable tester email address you control — an address
        that cannot receive mail cannot sign in. Keep the company details you
        enter synthetic; real client company data is not permitted at this
        stage of the proof of concept.
      </p>
    </form>
  );
}
