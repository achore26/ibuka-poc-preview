import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewPreview } from "@/components/review-preview";
import { AuthPanel } from "@/components/auth-panel";
import { Workspace } from "@/components/workspace";
import { useAuthSession } from "@/lib/auth-session";
import { getAccountDataClient, getSupabaseClient } from "@/lib/supabase-client";
import { checkSupabaseConnectivity, type ConnectivityResult } from "./lib/supabase-status";

const statusClassByState: Record<ConnectivityResult["state"], string> = {
  reachable: "status-ok",
  "not-configured": "status-warn",
  unreachable: "status-error",
  "unexpected-response": "status-error",
};

function describeResult(result: ConnectivityResult): string {
  switch (result.state) {
    case "reachable":
      return `Reachable — the Supabase API responded with HTTP ${result.httpStatus}.`;
    case "not-configured":
      return "Not configured — the public Supabase URL is missing or not HTTPS, or the publishable key is missing.";
    case "unreachable":
      return "Unreachable — no response from the Supabase project URL (network or DNS failure).";
    case "unexpected-response":
      return `Unexpected response — HTTP ${result.httpStatus}. The endpoint answered but not with a healthy result.`;
  }
}

const phaseItems = [
  {
    number: "01",
    label: "Company registration and magic-link sign-in",
    status: "Implemented (provisional, local)",
  },
  {
    number: "02",
    label: "Sample Market listing assessment",
    status: "Implemented (provisional, local)",
  },
  {
    number: "03",
    label: "Readiness summary and dashboard",
    status: "Implemented (provisional, local)",
  },
] as const;

function DiagnosticsCard() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ConnectivityResult | null>(null);

  async function runCheck() {
    setPending(true);
    try {
      setResult(await checkSupabaseConnectivity());
    } finally {
      setPending(false);
    }
  }

  return (
    <Card size="sm" className="mt-4">
      <CardHeader>
        <CardTitle>Service diagnostics</CardTitle>
        <CardDescription className="max-w-[46em] leading-relaxed">
          Read-only reachability check against this project&rsquo;s public
          Supabase API (for the staging team). It reports the observed
          response only — it does not verify the key, authentication, or
          data isolation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={runCheck} disabled={pending}>
          {pending ? "Checking…" : "Run connectivity check"}
        </Button>
        {result ? (
          <p
            role="status"
            className={`mt-3 font-mono text-xs leading-relaxed ${statusClassByState[result.state]}`}
          >
            {describeResult(result)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function App() {
  const client = useMemo(() => getSupabaseClient(), []);
  const auth = useAuthSession(client);
  const sessionUser = auth.phase === "signed-in" ? auth.user : null;
  const dataClient = useMemo(() => client && sessionUser ? getAccountDataClient(client, sessionUser.id) : null, [client, sessionUser?.id]);
  const signedIn = sessionUser !== null;
  const userEmail = sessionUser?.email ?? null;

  return (
    <div className="min-h-svh bg-background font-sans text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="text-sm font-semibold tracking-tight">Daraja</span>
          <div className="flex min-w-0 items-center gap-3">
            {signedIn && userEmail ? (
              <>
                <span className="truncate text-xs text-muted-foreground" title={userEmail}>
                  {userEmail}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const event = new Event("daraja-before-signout", { cancelable: true });
                    if (window.dispatchEvent(event)) void auth.signOut();
                  }}
                  disabled={auth.phase === "restoring"}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                IBUKA Phase 1 proof of concept · KASIB
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <main>
          {auth.phase === "restoring" ? (
            <p role="status" className="pt-8 text-sm text-muted-foreground sm:pt-10">
              Restoring your session…
            </p>
          ) : signedIn && client && sessionUser ? (
            <>
              <div className="pt-8 sm:pt-10">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Sample Market listing assessment
                  </h1>
                  <Badge variant="secondary">Provisional</Badge>
                </div>
                <p className="mt-2 max-w-[46em] text-sm leading-relaxed text-muted-foreground">
                  Saved against your synthetic test company. Entries and their
                  readiness states are self-reported; the sample and rules
                  remain proposals pending validation — not a regulatory
                  finding.
                </p>
              </div>
              {auth.notice ? <p role="alert" className="mt-4 text-sm">{auth.notice.message}</p> : null}
              <Workspace key={sessionUser.id} client={dataClient!} user={sessionUser} />
            </>
          ) : (
            <>
              <div className="pt-8 sm:pt-10">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Sample Market listing assessment
                  </h1>
                  <Badge variant="secondary">Review preview</Badge>
                </div>
                <p className="mt-2 max-w-[46em] text-sm leading-relaxed text-muted-foreground">
                  Sign in below to save entries against a synthetic test
                  company. Without signing in, the preview further down shows
                  the proposed four-item sample — not yet validated, nothing is
                  saved, and entries reset on reload.
                </p>
              </div>

              {auth.phase === "unconfigured" ? (
                <Card className="mt-6 lg:mt-8" size="sm">
                  <CardHeader>
                    <CardTitle className="text-base">Sign-in unavailable</CardTitle>
                    <CardDescription className="max-w-[46em] leading-relaxed">
                      The public Supabase URL or publishable key is not
                      configured, so magic-link sign-in and the saved
                      assessment are unavailable in this build. The review
                      preview below still works.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <AuthPanel notice={auth.notice} onSignIn={auth.signIn} />
              )}

              <section aria-label="Preview heading" className="mt-10">
                <h2 className="text-lg font-semibold tracking-tight">
                  Review preview (signed out)
                </h2>
                <p className="mt-1 max-w-[46em] text-sm leading-relaxed text-muted-foreground">
                  Everything here runs in this page only: entries are held in
                  memory, nothing is saved or sent anywhere, and answers reset
                  on reload.
                </p>
              </section>

              <ReviewPreview />

              <details className="mt-10 rounded-xl border bg-card">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                  About this preview
                </summary>
                <div className="flex flex-col gap-4 border-t px-4 py-4 text-sm leading-relaxed text-muted-foreground">
                  <p className="max-w-[52em]">
                    This page previews a proposed four-item sample for the IBUKA
                    Phase 1 proof of concept. The sample selection, prompts, typed
                    controls and progress rule are proposals shown for review —
                    they are not validated regulatory content, and nothing here
                    has been approved.
                  </p>
                  <p className="max-w-[52em]">
                    The signed-out preview holds entries in memory only; signed-in
                    entries are saved to the assessment database for the
                    account&rsquo;s single synthetic company. The progress figure
                    is self-reported — it counts items marked ready and is not a
                    regulatory pass/fail result, listing eligibility, or approval.
                  </p>
                  <div>
                    <h2 className="text-xs font-medium text-foreground">
                      Phase 1 scope
                    </h2>
                    <ol className="mt-2 flex flex-col gap-1.5">
                      {phaseItems.map((item) => (
                        <li
                          key={item.number}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
                        >
                          <span>
                            <span className="mr-2 font-mono text-xs">
                              {item.number}
                            </span>
                            {item.label}
                          </span>
                          <span className="text-xs">{item.status}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </details>
            </>
          )}

          <DiagnosticsCard />
        </main>

        <footer className="mt-12 border-t pt-5">
          <p className="max-w-[52em] text-xs leading-relaxed text-muted-foreground">
            Daraja is the working product name for the IBUKA Phase 1 proof of
            concept by KASIB — bridging business and capital. Interface tones
            are visually inferred from the public KASIB site; this repository
            contains no official KASIB logo or brand assets.
          </p>
        </footer>
      </div>
    </div>
  );
}
