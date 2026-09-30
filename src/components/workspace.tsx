/*
 * Authenticated workspace shell: loads the caller's single company record
 * (creating it via onboarding when absent) and renders the persisted
 * assessment + dashboard. Responses are fenced by an epoch that changes on
 * every identity/company reload so stale async responses are never applied.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OnboardingPanel } from "@/components/onboarding-panel";
import { SavedAssessment } from "@/components/saved-assessment";
import { createCompany, fetchMyCompany } from "@/lib/app-data/api";
import type { CompanyRow } from "@/lib/app-data/types";

type CompanyLoad =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "failed"; message: string };

export function Workspace({
  client,
  user,
}: {
  client: SupabaseClient;
  user: User;
}) {
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [load, setLoad] = useState<CompanyLoad>({ kind: "loading" });
  const epochRef = useRef(0);

  const loadCompany = useCallback(async () => {
    const epoch = ++epochRef.current;
    setLoad({ kind: "loading" });
    try {
      const row = await fetchMyCompany(client);
      if (epoch !== epochRef.current) return; // superseded by a reload/sign-out
      setCompany(row);
      setLoad({ kind: "ready" });
    } catch (error) {
      if (epoch !== epochRef.current) return;
      setLoad({
        kind: "failed",
        message: error instanceof Error ? error.message : "Your company record could not be loaded.",
      });
    }
  }, [client]);

  useEffect(() => {
    setCompany(null);
    void loadCompany();
    return () => { epochRef.current += 1; };
  }, [loadCompany, user.id]);

  async function handleCreate(name: string) {
    const epoch = epochRef.current;
    const result = await createCompany(client, name);
    if (epoch !== epochRef.current) return result;
    epochRef.current += 1; // invalidate any in-flight loads
    setCompany(result.company);
    setLoad({ kind: "ready" });
    return result;
  }

  if (load.kind === "loading") {
    return (
      <p role="status" className="mt-8 text-sm text-muted-foreground">
        Loading your company…
      </p>
    );
  }

  if (load.kind === "failed") {
    return (
      <Card className="mt-6 lg:mt-8" size="sm">
        <CardHeader>
          <CardTitle className="text-base">Company unavailable</CardTitle>
          <CardDescription className="max-w-[46em] leading-relaxed">
            {load.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="h-11 sm:h-9" onClick={() => void loadCompany()}>
            Retry loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return <OnboardingPanel onCreate={handleCreate} />;
  }

  return <SavedAssessment key={company.id} client={client} company={company} onCompanyUpdated={setCompany} />;
}
