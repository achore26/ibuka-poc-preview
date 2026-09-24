import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewPreview } from "@/components/review-preview";
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
    status: "Planned",
    active: false,
  },
  {
    number: "02",
    label: "Sample Market listing assessment",
    status: "Review preview",
    active: true,
  },
  {
    number: "03",
    label: "Readiness summary and dashboard",
    status: "Planned",
    active: false,
  },
] as const;

/*
 * Bridge elevation drawn in-repo: deck, three arches and piers in deep ink,
 * with one accent line beneath standing for the water the bridge crosses.
 * Purely decorative, so it is hidden from assistive technology.
 */
function BridgeRule({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 190"
      fill="none"
      aria-hidden="true"
      className={className ?? "mt-12 w-full text-foreground"}
    >
      <g stroke="currentColor" fill="none">
        <line x1="0" y1="36" x2="1200" y2="36" strokeWidth="3" />
        <path d="M70 36a130 130 0 0 0 260 0" strokeWidth="2.5" />
        <path d="M470 36a130 130 0 0 0 260 0" strokeWidth="2.5" />
        <path d="M870 36a130 130 0 0 0 260 0" strokeWidth="2.5" />
        <g strokeWidth="2.5">
          <line x1="0" y1="36" x2="0" y2="178" />
          <line x1="70" y1="36" x2="70" y2="178" />
          <line x1="330" y1="36" x2="330" y2="178" />
          <line x1="470" y1="36" x2="470" y2="178" />
          <line x1="730" y1="36" x2="730" y2="178" />
          <line x1="870" y1="36" x2="870" y2="178" />
          <line x1="1130" y1="36" x2="1130" y2="178" />
          <line x1="1200" y1="36" x2="1200" y2="178" />
        </g>
      </g>
      <line
        x1="0"
        y1="182"
        x2="1200"
        y2="182"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-primary"
      />
    </svg>
  );
}

export default function App() {
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
    <div className="min-h-svh bg-background font-sans text-foreground">
      <div className="border-t-[3px] border-foreground" />

      <div className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-foreground/15 pb-3 pt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>IBUKA · Phase 1 proof of concept</span>
          <span>KASIB</span>
        </div>

        <header className="pt-16 sm:pt-24">
          <h1 className="font-serif text-[clamp(3.75rem,13vw,7rem)] font-medium leading-[0.92] tracking-[-0.01em]">
            Daraja
          </h1>
          <p className="mt-5 font-serif text-xl italic text-primary sm:text-2xl">
            Bridging business and capital
          </p>
          <BridgeRule />
        </header>

        <main>
          <p className="max-w-[36em] font-serif text-lg leading-relaxed text-foreground/90 sm:text-xl">
            A staging preview of the IBUKA Phase 1 proof of concept by KASIB,
            with a proposed four-item sample assessment shown below for review.
          </p>

          <ReviewPreview />

          <section aria-labelledby="phase-heading" className="mt-16">
            <h2
              id="phase-heading"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
            >
              Phase one — what to expect
            </h2>
            <ol className="mt-4 divide-y divide-foreground/10 border-y border-foreground/10">
              {phaseItems.map((item) => (
                <li
                  key={item.number}
                  className="grid grid-cols-[2.75rem_1fr] items-baseline gap-x-4 py-4 sm:grid-cols-[3rem_1fr_auto]"
                >
                  <span
                    className={`font-serif text-lg ${item.active ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {item.number}
                  </span>
                  <span className="text-pretty">{item.label}</span>
                  <span
                    className={`col-span-2 pt-1 font-mono text-[11px] uppercase tracking-[0.14em] sm:col-span-1 sm:pt-0 ${
                      item.active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 max-w-[46em] text-sm leading-relaxed text-muted-foreground">
              The review preview above runs entirely in this page using demo
              placeholder entries — nothing is saved, no account is involved,
              and answers reset on reload. Company registration, sign-in, saved
              assessments and dashboards are not implemented yet.
            </p>
          </section>

          <Card className="mt-14">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Service diagnostics</CardTitle>
              <CardAction className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Staging team
              </CardAction>
              <CardDescription className="max-w-[38em] leading-relaxed">
                Runs a read-only reachability check against this project’s public Supabase
                API using only the browser-safe publishable key. It reports the observed
                response only; it does not verify the key, authentication, company data
                isolation or row-level security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={runCheck} disabled={pending}>
                {pending ? "Checking…" : "Run connectivity check"}
              </Button>
              {result ? (
                <p
                  role="status"
                  className={`mt-4 font-mono text-[13px] leading-relaxed ${statusClassByState[result.state]}`}
                >
                  {describeResult(result)}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </main>

        <footer className="mt-24 border-t border-foreground/15 pt-5">
          <p className="max-w-[52em] font-mono text-[11px] leading-relaxed tracking-[0.02em] text-muted-foreground">
            Daraja is the working product name for the IBUKA Phase 1 proof of concept by
            KASIB. The review preview is a demo only: placeholder entries, self-reported
            progress, nothing saved or signed in, and no regulatory, listing-eligibility
            or approval finding. Colour tones are visually inferred from the public KASIB
            site; no official KASIB logo or brand assets are used. Sign-in, saved
            assessments and dashboards are not implemented yet.
          </p>
        </footer>
      </div>
    </div>
  );
}
