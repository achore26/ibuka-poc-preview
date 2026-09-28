/*
 * Magic-link sign-in panel (B05). Shown while signed out. The email is used
 * only to request a Supabase magic link that returns to this same origin and
 * must be opened in the same browser (PKCE verifier held locally). No
 * password field exists anywhere in this application.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AuthNotice, SignInResult } from "@/lib/auth-session";

const hintClass = "text-xs leading-relaxed text-muted-foreground";

type SendState = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "failed"; message: string };

export function AuthPanel({
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
    <Card className="mt-6 lg:mt-8" size="sm">
      <CardHeader>
        <CardTitle className="text-base">Sign in with an email link</CardTitle>
        <CardDescription className="max-w-[46em] leading-relaxed">
          Enter your email to receive a one-time sign-in link. The link opens
          this page in the same browser — there are no passwords in this proof
          of concept. Use a synthetic tester address for now; real company
          data is not requested at this stage.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {notice && notice.kind === "link-error" ? (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm leading-relaxed text-foreground">
            {notice.message}
          </p>
        ) : null}
        {notice && notice.kind === "session-ended" ? (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm leading-relaxed text-foreground">
            {notice.message}
          </p>
        ) : null}
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5 sm:max-w-72 sm:flex-1">
            <label htmlFor="sign-in-email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tester@example.test"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (sendState.kind !== "sending") setSendState({ kind: "idle" });
              }}
              disabled={sendState.kind === "sending"}
            />
          </div>
          <Button
            type="submit"
            className="sm:mt-6"
            disabled={!trimmed || !emailLooksValid || sendState.kind === "sending"}
          >
            {sendState.kind === "sending" ? "Sending…" : "Send sign-in link"}
          </Button>
        </form>
        {sendState.kind === "sent" ? (
          <p role="status" className={hintClass}>
            Link sent{trimmed ? ` to ${trimmed}` : ""}. Open it in this same
            browser — it continues the request started here and expires after
            use. Nothing is signed in until the link is opened.
          </p>
        ) : null}
        {sendState.kind === "failed" ? (
          <p role="alert" className={hintClass}>
            {sendState.message}
          </p>
        ) : null}
        <p className={hintClass}>
          Sign-in is provisional infrastructure for the proof of concept; the
          email sender for the hosted staging service is still to be selected
          by KASIB, so local testing uses a local test inbox.
        </p>
      </CardContent>
    </Card>
  );
}
