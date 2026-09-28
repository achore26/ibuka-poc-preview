/*
 * Saved-state dashboard (B07): self-reported sample readiness derived ONLY
 * from server-confirmed saved rows. Shows the metric, pending/ready/gap
 * states per item, the ordered gap list, last-save visibility, unsaved
 * indication, and the company card with rename. The score is a provisional
 * self-reported progress measure — never a listing-eligibility or approval
 * claim.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  isValidNa,
  type SampleProgress,
} from "@/lib/sample-progress";
import type { NormalizedChecklistItem } from "@/lib/app-data/checklist";
import type { AnswerRow, CompanyRow } from "@/lib/app-data/types";
import { rowToDemoAnswer } from "@/lib/app-data/answer-state";

const hintClass = "text-xs leading-relaxed text-muted-foreground";

function gapStatusLabel(status: "not_started" | "in_progress" | "na"): string {
  switch (status) {
    case "not_started":
      return "not started";
    case "in_progress":
      return "in progress";
    case "na":
      return "N/A without a recorded reason — not valid";
  }
}

function formatSavedAt(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function CompanyCard({
  company,
  onRename,
  renameBusy,
  renameError,
}: {
  company: CompanyRow;
  onRename: (name: string) => Promise<void>;
  renameBusy: boolean;
  renameError: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(company.name);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 200 || trimmed === company.name) {
      setEditing(false);
      setName(company.name);
      return;
    }
    await onRename(trimmed);
    setEditing(false);
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Company</CardTitle>
        {editing ? (
          <form onSubmit={submit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="rename-company" className="text-xs font-medium">
                Company name
              </label>
              <Input
                id="rename-company"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={renameBusy}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2 sm:mt-5">
              <Button type="submit" size="sm" disabled={renameBusy}>
                {renameBusy ? "Saving…" : "Save name"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setName(company.name);
                }}
                disabled={renameBusy}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <CardContent className="flex flex-col gap-1.5 px-0 pt-0">
            <p className="text-sm font-medium leading-snug">{company.name}</p>
            <p className={hintClass}>
              One company per account; ownership is enforced by the database.{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => {
                  setEditing(true);
                  setName(company.name);
                }}
              >
                Rename
              </button>
            </p>
            {renameError ? (
              <p role="alert" className={hintClass}>
                {renameError}
              </p>
            ) : null}
          </CardContent>
        )}
      </CardHeader>
    </Card>
  );
}

export function DashboardPanel({
  company,
  summary,
  items,
  savedRows,
  lastSavedAt,
  anyDirty,
  anySaving,
  onSaveAll,
  onRename,
  renameBusy,
  renameError,
}: {
  company: CompanyRow;
  summary: SampleProgress | null;
  items: NormalizedChecklistItem[];
  savedRows: Record<string, AnswerRow | null>;
  lastSavedAt: string | null;
  anyDirty: boolean;
  anySaving: boolean;
  onSaveAll: () => void;
  onRename: (name: string) => Promise<void>;
  renameBusy: boolean;
  renameError: string | null;
}) {
  const percent = summary?.kind === "ok" ? (100 * summary.ready) / summary.applicable : 0;
  const savedTime = formatSavedAt(lastSavedAt);
  const validNaIds = items
    .filter((field) => {
      const saved = rowToDemoAnswer(savedRows[field.id] ?? null);
      return isValidNa({
        id: field.id,
        status: saved.status,
        allowsNa: field.allowsNa,
        naReason: saved.naReason,
      });
    })
    .map((field) => field.id);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Self-reported sample progress
          </CardTitle>
          <CardDescription className="text-xs">
            Provisional · not a listing eligibility or approval result.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {summary?.kind === "ok" ? (
            <div role="status" aria-live="polite" className="flex flex-col gap-4">
              <div>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {summary.displayPercent}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.ready} of {summary.applicable} applicable items
                  marked ready
                  {summary.validNa > 0
                    ? ` · ${summary.validNa} valid N/A excluded`
                    : ""}
                </p>
              </div>
              <Progress
                value={percent}
                aria-valuenow={Number(percent.toFixed(2))}
                className="h-2"
                aria-label="Self-reported sample progress (saved)"
              />
            </div>
          ) : summary?.kind === "not_applicable" ? (
            <p role="status" className="text-sm leading-relaxed text-muted-foreground">
              Not applicable — every configured item is a valid N/A, so no
              percentage is shown.
            </p>
          ) : summary ? (
            <p role="status" className="text-sm leading-relaxed text-muted-foreground">
              No sample items are configured — no score is shown.
            </p>
          ) : (
            <p role="status" className="text-sm leading-relaxed text-muted-foreground">
              Loading saved progress…
            </p>
          )}

          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onSaveAll} disabled={!anyDirty || anySaving}>
                {anySaving ? "Saving…" : "Save changes"}
              </Button>
              {anyDirty ? (
                <Badge variant="outline">Unsaved changes</Badge>
              ) : anySaving ? (
                <Badge variant="outline">Saving…</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  {lastSavedAt ? "All changes saved" : "No saved entries"}
                </Badge>
              )}
            </div>
            <p className={hintClass}>
              {anySaving
                ? "Saving — the score updates only after the database confirms each entry."
                : anyDirty
                  ? "The score shows saved entries only; save to include the changes above."
                  : savedTime
                    ? `Last saved at ${savedTime} (server-confirmed).`
                    : "Nothing has been saved yet; the score reflects that honestly."}
            </p>
          </div>

          {summary?.kind === "ok" ? (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">Gaps</h3>
              {summary.gaps.length > 0 ? (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {summary.gaps.map((gap) => (
                    <li key={gap.id} className="text-xs leading-relaxed">
                      <span className="font-mono font-medium">{gap.id}</span>{" "}
                      <span className="text-muted-foreground">
                        —{" "}
                        {items.find((field) => field.id === gap.id)?.shortLabel} ·{" "}
                        {gapStatusLabel(gap.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  No gaps — every applicable item is marked ready.
                </p>
              )}
              {validNaIds.length > 0 ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Excluded as valid N/A (reason recorded):{" "}
                  <span className="font-mono">{validNaIds.join(", ")}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Saved item states</CardTitle>
          <CardDescription className="text-xs">
            Per-item saved status and last server-confirmed save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((field) => {
              const row = savedRows[field.id] ?? null;
              const saved = rowToDemoAnswer(row);
              const stateLabel =
                saved.status === "ready"
                  ? "Ready"
                  : saved.status === "in_progress"
                    ? "In progress"
                    : saved.status === "na"
                      ? isValidNa({ id: field.id, status: saved.status, allowsNa: field.allowsNa, naReason: saved.naReason })
                        ? "N/A (reason recorded)"
                        : "N/A — reason required (not yet saved as valid)"
                      : row
                        ? "Not started"
                        : "Not started (never saved)";
              return (
                <li key={field.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="font-mono text-xs font-medium">{field.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {stateLabel}
                    {row?.updated_at
                      ? ` · saved ${formatSavedAt(row.updated_at) ?? ""}`
                      : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <CompanyCard
        company={company}
        onRename={onRename}
        renameBusy={renameBusy}
        renameError={renameError}
      />
    </div>
  );
}
