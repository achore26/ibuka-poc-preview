/*
 * Saved-state companion cards for the right rail (30 September 2026
 * redesign): the company card with rename, and the full per-item saved-state
 * list behind a disclosure so the rail stays quiet (the progress metric
 * itself lives in prepared-panel.tsx). Per-item details are NEVER hidden
 * when they carry an error — save failures surface on the fields and in the
 * status strip, not here.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidNa } from "@/lib/sample-progress";
import type { NormalizedChecklistItem } from "@/lib/app-data/checklist";
import { rowToSampleAnswer } from "@/lib/app-data/answer-state";
import type { AnswerRow, CompanyRow } from "@/lib/app-data/types";

const hintClass = "text-xs leading-relaxed text-muted-foreground";

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
    <Card className="shadow-none ring-1 ring-border" size="sm">
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
                className="h-11 text-sm sm:h-8"
              />
            </div>
            <div className="flex gap-2 sm:mt-5">
              <Button type="submit" size="sm" className="h-11 sm:h-7" disabled={renameBusy}>
                {renameBusy ? "Saving…" : "Save name"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-11 sm:h-7"
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
                className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-foreground sm:min-h-0"
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

function SavedStatesCard({
  items,
  savedRows,
}: {
  items: NormalizedChecklistItem[];
  savedRows: Record<string, AnswerRow | null>;
}) {
  return (
    <details className="panel text-sm">
      <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium sm:min-h-0">
        Saved item states ({items.length})
      </summary>
      <div className="border-t px-4 py-3">
        <ul className="flex flex-col gap-1.5">
          {items.map((field) => {
            const row = savedRows[field.id] ?? null;
            const saved = rowToSampleAnswer(row);
            const stateLabel =
              saved.status === "ready"
                ? "Prepared for review"
                : saved.status === "in_progress"
                  ? "Draft"
                  : saved.status === "na"
                    ? isValidNa({
                        id: field.id,
                        status: saved.status,
                        allowsNa: field.allowsNa,
                        naReason: saved.naReason,
                      })
                      ? "Not applicable (reason recorded)"
                      : "Not applicable — reason required"
                    : row
                      ? "Not started"
                      : "Not started (never saved)";
            return (
              <li key={field.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-xs font-medium">{field.shortLabel}</span>
                <span className="text-xs text-muted-foreground">
                  {stateLabel}
                  {row?.updated_at ? ` · saved ${formatSavedAt(row.updated_at) ?? ""}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

export function DashboardPanel({
  company,
  items,
  savedRows,
  onRename,
  renameBusy,
  renameError,
}: {
  company: CompanyRow;
  items: NormalizedChecklistItem[];
  savedRows: Record<string, AnswerRow | null>;
  onRename: (name: string) => Promise<void>;
  renameBusy: boolean;
  renameError: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SavedStatesCard items={items} savedRows={savedRows} />
      <CompanyCard
        company={company}
        onRename={onRename}
        renameBusy={renameBusy}
        renameError={renameError}
      />
    </div>
  );
}
