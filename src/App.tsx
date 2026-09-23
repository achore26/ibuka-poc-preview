import { useState } from "react";
import { checkSupabaseConnectivity, type ConnectivityResult } from "./lib/supabase-status";

const statusClassByState: Record<ConnectivityResult["state"], string> = {
  reachable: "ok",
  "not-configured": "warn",
  unreachable: "error",
  "unexpected-response": "error",
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
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">IBUKA · Phase 1 proof of concept</p>
        <h1>Daraja</h1>
        <p className="tagline">Bridging business and capital</p>
        <p className="badge">Staging · working name</p>
      </header>

      <main>
        <section className="card" aria-labelledby="status-title">
          <h2 id="status-title">The sample assessment is being prepared</h2>
          <p>
            Daraja is being introduced in stages. The sample Market listing assessment for the
            IBUKA Phase 1 proof of concept is still being prepared and is not available yet.
          </p>
          <ul className="plan">
            <li>
              <span>Company registration and magic-link sign-in</span>
              <span className="pill pill-planned">Planned</span>
            </li>
            <li>
              <span>Sample Market listing assessment</span>
              <span className="pill pill-progress">In preparation</span>
            </li>
            <li>
              <span>Readiness summary and dashboard</span>
              <span className="pill pill-planned">Planned</span>
            </li>
          </ul>
          <p className="note">
            Nothing on this staging page collects company information yet, and no results are being
            produced. This staging address is temporary.
          </p>
        </section>

        <details className="card diagnostics">
          <summary>Service diagnostics (staging team)</summary>
          <p className="note">
            Runs a read-only reachability check against this project&apos;s public Supabase API
            using only the browser-safe publishable key. It reports the observed response only;
            it does not verify the key, authentication, company data isolation or row-level
            security.
          </p>
          <button type="button" onClick={runCheck} disabled={pending}>
            {pending ? "Checking…" : "Run connectivity check"}
          </button>
          {result ? (
            <p className={`status status-${statusClassByState[result.state]}`} role="status">
              {describeResult(result)}
            </p>
          ) : null}
        </details>
      </main>

      <footer className="footer">
        <p>
          Daraja is the working product name for the IBUKA Phase 1 proof of concept by KASIB. This
          staging site shows the foundation of the service; the features above are not active yet.
        </p>
      </footer>
    </div>
  );
}
