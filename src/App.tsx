import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewPreview } from "@/components/review-preview";
import { SignInDialog } from "@/components/sign-in-dialog";
import { SectionNavProvider, SectionRail, type SectionNavConfig } from "@/components/section-rail";
import { Workspace } from "@/components/workspace";
import { useAuthSession } from "@/lib/auth-session";
import { getAccountDataClient, getSupabaseClient } from "@/lib/supabase-client";
import { checkSupabaseConnectivity, type ConnectivityResult } from "./lib/supabase-status";
import { EXPECTED_SAMPLE_VERSION, enabledFields, enabledSections } from "@/lib/enabled-sample";

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
    <Card size="sm" className="shadow-none ring-1 ring-border">
      <CardHeader>
        <CardTitle className="text-sm">Service diagnostics</CardTitle>
        <CardDescription className="max-w-[46em] leading-relaxed">
          Read-only reachability check against this project&rsquo;s public
          Supabase API (for the staging team). It reports the observed response
          only — it does not verify the key, authentication, or data isolation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="h-11 sm:h-9" onClick={runCheck} disabled={pending}>
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

/*
 * Operator tooling is never product surface: the connectivity check and the
 * interface-provenance note live behind this collapsed disclosure, rendered
 * only in local development (import.meta.env.DEV) so diagnostics and
 * implementation copy never appear in the production flow.
 */
function DevelopmentDisclosure() {
  return (
    <details className="panel mt-2 text-sm">
      <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium sm:min-h-0">
        Development diagnostics (staging team)
      </summary>
      <div className="flex flex-col gap-4 border-t px-4 py-4">
        <DiagnosticsCard />
        <p className="max-w-[52em] text-xs leading-relaxed text-muted-foreground">
          Interface tones are visually inferred from the public KASIB site
          (kasib.co.ke, observed 24 September 2026) — not an official brand
          specification; this repository contains no official KASIB logo or
          brand assets.
        </p>
      </div>
    </details>
  );
}

/** Repo-native CMP monogram: navy tile, white letters, one red detail. */
function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-8 flex-col overflow-hidden rounded-lg bg-rail-raised ring-1 ring-white/15 ${className}`}
    >
      <span className="flex flex-1 items-center justify-center text-[0.6rem] font-bold tracking-tight text-white">
        CMP
      </span>
      <span className="h-[3px] w-full bg-primary" />
    </span>
  );
}

export default function App() {
  const client = useMemo(() => getSupabaseClient(), []);
  const auth = useAuthSession(client);
  const sessionUser = auth.phase === "signed-in" ? auth.user : null;
  const dataClient = useMemo(
    () => (client && sessionUser ? getAccountDataClient(client, sessionUser.id) : null),
    [client, sessionUser?.id],
  );
  const signedIn = sessionUser !== null;
  const userEmail = sessionUser?.email ?? null;

  // Live navy-rail content reported by whichever assessment form is mounted.
  const [nav, setNav] = useState<SectionNavConfig | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  const showNoticeBar = !signedIn && auth.notice !== null && !signInOpen;

  return (
    <SectionNavProvider value={setNav}>
      <div className="flex min-h-svh flex-col bg-background font-sans text-foreground">
        <header className="sticky top-0 z-40 shrink-0 bg-rail text-white">
          <div className="mx-auto flex h-14 w-full max-w-[90rem] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandMark />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-none tracking-tight">
                  CMP Kenya
                </span>
                <span className="mt-1 block text-[0.68rem] leading-none text-rail-muted">
                  Listing preparation · KASIB
                </span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              {signedIn && userEmail ? (
                <>
                  <span className="hidden max-w-48 truncate text-xs text-rail-foreground sm:block" title={userEmail}>
                    {userEmail}
                  </span>
                  <Button
                    variant="outline"
                    className="h-11 border-white/25 bg-transparent text-rail-foreground hover:bg-rail-raised hover:text-white sm:h-8"
                    onClick={() => {
                      const event = new Event("cmp-before-signout", { cancelable: true });
                      if (window.dispatchEvent(event)) void auth.signOut();
                    }}
                    disabled={auth.phase === "restoring"}
                  >
                    Sign out
                  </Button>
                </>
              ) : auth.phase === "unconfigured" ? (
                <span className="text-xs text-rail-muted">Sign-in unavailable</span>
              ) : auth.phase !== "restoring" ? (
                <SignInDialog
                  open={signInOpen}
                  onOpenChange={setSignInOpen}
                  notice={auth.notice}
                  onSignIn={auth.signIn}
                  triggerClassName="h-11 border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white sm:h-8"
                />
              ) : null}
            </div>
          </div>
        </header>

        {showNoticeBar ? (
          <div className="shrink-0 border-b border-destructive/25 bg-destructive/5">
            <p role="alert" className="mx-auto max-w-[90rem] px-4 py-2 text-xs leading-relaxed text-foreground sm:px-6">
              {auth.notice?.message}
            </p>
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-[90rem] flex-1 items-stretch">
          <SectionRail nav={nav} />

          <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-8 lg:px-10 lg:pt-8">
            <div className="mx-auto flex w-full max-w-[71.5rem] flex-col">
              {auth.phase === "restoring" ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Restoring your session…
                </p>
              ) : signedIn && client && sessionUser ? (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
                        Listing preparation
                      </h1>
                      <p className="mt-1 max-w-[52em] text-sm leading-relaxed text-muted-foreground">
                        {enabledFields.length} selected questions across{" "}
                        {enabledSections.length} sections. Entries save
                        automatically to your synthetic test company; the
                        content remains proposed pending validation.
                      </p>
                    </div>
                  </div>
                  <Workspace key={sessionUser.id} client={dataClient!} user={sessionUser} />
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
                        Listing preparation
                      </h1>
                      <p className="mt-1 max-w-[52em] text-sm leading-relaxed text-muted-foreground">
                        {enabledFields.length} selected questions across{" "}
                        {enabledSections.length} sections. Proposed content
                        pending validation.
                      </p>
                    </div>
                  </div>

                  {auth.phase === "unconfigured" ? (
                    <Card className="mt-5 shadow-none ring-1 ring-border" size="sm">
                      <CardHeader>
                        <CardTitle className="text-base">Sign-in unavailable</CardTitle>
                        <CardDescription className="max-w-[46em] leading-relaxed">
                          The public Supabase URL or publishable key is not
                          configured, so magic-link sign-in and the saved assessment
                          are unavailable in this build. The preview below still
                          works.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ) : null}

                  <div className="mt-6">
                    <ReviewPreview />
                  </div>

                  <details className="panel mt-8 text-sm">
                    <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium sm:min-h-0">
                      About this preview
                    </summary>
                    <div className="flex flex-col gap-4 border-t px-4 py-4 text-sm leading-relaxed text-muted-foreground">
                      <p className="max-w-[52em]">
                        This page previews the selected ten-item sample
                        ({EXPECTED_SAMPLE_VERSION}) for the IBUKA Phase 1
                        proof of concept. The selection, prompts, typed
                        controls and progress rule are proposals shown for
                        review — they are not validated regulatory content,
                        and nothing here has been approved.
                      </p>
                      <p className="max-w-[52em]">
                        The sample grew from an earlier four-item preview to
                        the current ten items, so progress figures are not
                        comparable across that change: the denominator moved
                        from 4 to 10. Only one of the four earlier ids
                        (CP-07) is also part of the selected ten; historical
                        answers are retained separately by additive database
                        work. See the repository documentation for the full
                        id-level history.
                      </p>
                      <p className="max-w-[52em]">
                        The signed-out preview holds entries in memory only; signed-in
                        entries autosave to the assessment database for the
                        account&rsquo;s single synthetic company. The progress figure
                        is self-reported — it counts items marked ready for review
                        and is not a regulatory pass/fail result, listing
                        eligibility, or approval.
                      </p>
                    </div>
                  </details>
                </>
              )}

              {import.meta.env.DEV ? <DevelopmentDisclosure /> : null}

              <footer className="mt-10 border-t pt-5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  CMP Kenya · IBUKA Phase 1 proof of concept · KASIB
                </p>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </SectionNavProvider>
  );
}
