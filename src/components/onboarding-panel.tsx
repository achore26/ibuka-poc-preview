/*
 * One-time company onboarding (B06): the authenticated user creates the
 * single company record the database will own. Only the name is sent — the
 * database assigns the owner (the signed-in identity), id and timestamps.
 * Concurrent onboarding resolves to the existing owned record.
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
import type { CreateCompanyResult } from "@/lib/app-data/api";

const hintClass = "text-xs leading-relaxed text-muted-foreground";

type CreateState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "failed"; message: string };

export function OnboardingPanel({
  onCreate,
}: {
  onCreate: (name: string) => Promise<CreateCompanyResult>;
}) {
  const [name, setName] = useState("");
  const [createState, setCreateState] = useState<CreateState>({ kind: "idle" });

  const trimmed = name.trim();
  const lengthOk = trimmed.length >= 1 && trimmed.length <= 200;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!lengthOk || createState.kind === "creating") return;
    setCreateState({ kind: "creating" });
    try {
      const result = await onCreate(trimmed);
      if (result.kind === "already-exists") {
        setCreateState({
          kind: "failed",
          message:
            "A company already exists for this account (created in another tab or attempt), so it has been loaded instead.",
        });
      }
      // created -> parent swaps to the assessment; no state change needed
    } catch (error) {
      setCreateState({
        kind: "failed",
        message: error instanceof Error ? error.message : "The company could not be created.",
      });
    }
  }

  return (
    <Card className="mt-6 lg:mt-8" size="sm">
      <CardHeader>
        <CardTitle className="text-base">Create your company</CardTitle>
        <CardDescription className="max-w-[46em] leading-relaxed">
          One company per account. The name is a display name for this proof
          of concept — it is not registry-verified, and ownership is assigned
          and enforced by the database, not by this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5 sm:max-w-96 sm:flex-1">
            <label htmlFor="company-name" className="text-sm font-medium">
              Company name
            </label>
            <Input
              id="company-name"
              placeholder="Synthetic Test Company A"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (createState.kind !== "creating") setCreateState({ kind: "idle" });
              }}
              disabled={createState.kind === "creating"}
            />
          </div>
          <Button
            type="submit"
            className="sm:mt-6"
            disabled={!lengthOk || createState.kind === "creating"}
          >
            {createState.kind === "creating" ? "Creating…" : "Create company"}
          </Button>
        </form>
        {!lengthOk && trimmed.length > 0 ? (
          <p className={hintClass}>The name must be 1–200 characters (trimmed).</p>
        ) : null}
        {createState.kind === "failed" ? (
          <p role="alert" className={hintClass}>
            {createState.message}
          </p>
        ) : null}
        <p className={hintClass}>
          Use a synthetic test company for now; real client company data is
          not permitted at this stage of the proof of concept.
        </p>
      </CardContent>
    </Card>
  );
}
