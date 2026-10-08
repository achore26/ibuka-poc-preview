import { useMemo, useState } from "react";
import { LandingPage } from "@/components/landing-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInDialog } from "@/components/sign-in-dialog";
import { BrandLogo } from "@/components/brand-logo";
import { SectionNavProvider, SectionRail, type SectionNavConfig } from "@/components/section-rail";
import { Workspace } from "@/components/workspace";
import { useAuthSession } from "@/lib/auth-session";
import { getAccountDataClient, getSupabaseClient } from "@/lib/supabase-client";
import { checkSupabaseConnectivity, type ConnectivityResult } from "./lib/supabase-status";
import { EXPECTED_SAMPLE_VERSION } from "@/lib/enabled-sample";

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
      return "Not configured — the public Supabase URL is missing, is not an approved test target (only the shared synthetic test project or a local loopback stack is allowed), or the publishable key is missing.";
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
          Logo, colours and type follow the supplied CMP Kenya Brand
          Identity Guidelines v1.0 (October 2026). The artwork under
          public/brand is reproduced exactly from the supplied files; the
          fonts under public/fonts are self-hosted Google Fonts latin
          WOFF2 under the SIL Open Font Licence. Working demo concept:
          professional brand finishing and final brand approval remain
          open (guidelines §9).
        </p>
      </div>
    </details>
  );
}



/*
 * Persistent TEST WORKSPACE banner (guidance task, 30 September 2026): the
 * whole current deployment — both domains, one shared synthetic Supabase
 * project — is test-only, so the banner stays visible in every auth state
 * (signed-out preview, onboarding, signed-in workspace). When nothing is
 * signed in, the copy also says the preview itself saves nothing.
 */
function TestWorkspaceBanner({ previewActive }: { previewActive: boolean }) {
  return (
    <div
      role="note"
      aria-label="Test workspace"
      className="shrink-0 border-b border-border bg-card"
      style={{ boxShadow: "inset 0.25rem 0 0 var(--status-warn)" }}
    >
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6">
        <span
          className="text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--status-warn)" }}
        >
          Test workspace
        </span>
        <p className="min-w-0 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {previewActive
            ? "Use fictional company data. Preview entries are not saved."
            : "Use fictional company data. Signed-in entries save to the test database."}
        </p>
      </div>
    </div>
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
      <div className={`flex min-h-svh flex-col bg-background font-sans text-foreground ${signedIn ? "lg:pl-[232px]" : ""}`}>
        <header className="sticky top-0 z-40 shrink-0 border-b bg-white text-foreground">
          <div className="mx-auto flex h-[88px] lg:h-16 w-full max-w-[90rem] items-center justify-between gap-3 px-6">
            <div id="workspace-utility" className="flex min-w-0 flex-1 items-center gap-6">
              <div className={`workspace-brand flex shrink-0 items-center ${signedIn ? 'lg:hidden' : ''}`}>
                <BrandLogo lockup="horizontal" tone="primary" width={124} className="shrink-0" />
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              {signedIn && userEmail ? (
                <>
                  <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:block" title={userEmail}>
                    {userEmail}
                  </span>
                  <Button
                    variant="outline"
                    className="h-11 border-border bg-transparent text-foreground hover:bg-muted"
                    onClick={() => {
                      const event = new Event("cmp-before-signout", { cancelable: true });
                      if (window.dispatchEvent(event)) void auth.signOut();
                    }}
                    disabled={auth.phase === "restoring"}
                  >
                    Sign out
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <TestWorkspaceBanner previewActive={!signedIn && auth.phase !== "restoring"} />

        {showNoticeBar ? (
          <div className="shrink-0 border-b border-destructive/25 bg-destructive/5">
            <p role="alert" className="mx-auto max-w-[90rem] px-4 py-2 text-xs leading-relaxed text-foreground sm:px-6">
              {auth.notice?.message}
            </p>
          </div>
        ) : null}

        {auth.phase === "restoring" ? (
          <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-8 lg:px-12 lg:pt-10">
            <div className="mx-auto flex w-full max-w-[1000px] flex-col">
              <p role="status" className="text-sm text-muted-foreground">
                Restoring your session…
              </p>
            </div>
          </main>
        ) : signedIn && client && sessionUser ? (
          <div className="mx-auto flex w-full max-w-[90rem] flex-1 items-stretch">
            <SectionRail nav={nav} />
            <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-8 lg:px-12 lg:pt-10">
              <div className="mx-auto flex w-full max-w-[1000px] flex-col">
                <Workspace key={sessionUser.id} client={dataClient!} user={sessionUser} />
                {import.meta.env.DEV ? <DevelopmentDisclosure /> : null}
                <footer className="mt-10 border-t pt-5">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    CMP Kenya · IBUKA Phase 1 proof of concept · KASIB
                  </p>
                </footer>
              </div>
            </main>
          </div>
        ) : (
          <LandingPage 
            authPhase={auth.phase}
            setSignInOpen={setSignInOpen}
            expectedSampleVersion={EXPECTED_SAMPLE_VERSION}
          />
        )}
      </div>
    </SectionNavProvider>
  );
}
