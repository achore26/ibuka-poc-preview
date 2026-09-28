/*
 * Persisted assessment (B06/B07): the four provisional sample questions with
 * explicit save, load/resume and honest save/dirty state. The anonymous
 * review preview (review-preview.tsx) stays separate and transient; this
 * component is the signed-in, database-backed version.
 *
 * Rules implemented here and enforced again by the database:
 *  - typed answers and readiness states are separate data;
 *  - Ready requires an adequate typed answer (a recorded No to Q-DIR-01 is
 *    complete; Yes requires the details);
 *  - N/A is offered only for Q-OFR-03 and is valid only with a recorded
 *    reason;
 *  - success is reported only from server-confirmed rows; unsaved edits are
 *    always distinguishable and are never silently dropped or overwritten;
 *  - writes are serialized; concurrent first inserts are retried as updates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
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
import { Textarea } from "@/components/ui/textarea";
import {
  answerAdequate,
  initialDemoAnswer,
  type DemoAnswer,
} from "@/lib/demo-sample";
import {
  isValidNa,
  summarizeSampleProgress,
  type SampleItemState,
} from "@/lib/sample-progress";
import {
  answerDirty,
  answerWriteIssue,
  applyAnswerUpdate,
  rowToDemoAnswer,
} from "@/lib/app-data/answer-state";
import { fetchAnswers, saveAnswer, updateCompanyName } from "@/lib/app-data/api";
import {
  fetchChecklist,
  type ChecklistResult,
  type NormalizedChecklistItem,
} from "@/lib/app-data/checklist";
import type { AnswerRow, CompanyRow } from "@/lib/app-data/types";
import { DashboardPanel } from "@/components/dashboard-panel";

const hintClass = "text-xs leading-relaxed text-muted-foreground";
const radioClass = "size-4 accent-primary";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "failed"; message: string };

type ItemSaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

function formatSavedAt(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatusBadge({ field, answer }: { field: { id: string; allowsNa: boolean }; answer: DemoAnswer }) {
  const naValid = isValidNa({
    id: field.id,
    status: answer.status,
    allowsNa: field.allowsNa,
    naReason: answer.naReason,
  });
  if (answer.status === "na") {
    return naValid ? (
      <Badge variant="secondary">N/A</Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        N/A — reason required
      </Badge>
    );
  }
  switch (answer.status) {
    case "ready":
      return <Badge variant="secondary">Ready</Badge>;
    case "in_progress":
      return <Badge variant="outline">In progress</Badge>;
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not started
        </Badge>
      );
  }
}

function ItemSaveBadge({
  state,
  dirty,
  savedAt,
}: {
  state: ItemSaveState;
  dirty: boolean;
  savedAt: string | null;
}) {
  if (state.kind === "saving") {
    return <Badge variant="outline">Saving…</Badge>;
  }
  if (state.kind === "error") {
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive">
        Save failed
      </Badge>
    );
  }
  if (dirty) {
    return <Badge variant="outline">Unsaved changes</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {savedAt ? `Saved ${savedAt}` : "No saved answer"}
    </Badge>
  );
}

function SavedField({
  field,
  answer,
  dirty,
  saveState,
  savedAt,
  onTypedChange,
  onStatusChange,
  onRetry,
}: {
  field: NormalizedChecklistItem;
  answer: DemoAnswer;
  dirty: boolean;
  saveState: ItemSaveState;
  savedAt: string | null;
  onTypedChange: (patch: Partial<DemoAnswer>) => void;
  onStatusChange: (patch: Partial<DemoAnswer>) => void;
  onRetry: () => void;
}) {
  const adequate = answerAdequate(field, answer);

  const options: Array<{ value: DemoAnswer["status"]; label: string; disabled: boolean }> = [
    { value: "not_started", label: "Not started", disabled: false },
    { value: "in_progress", label: "In progress", disabled: false },
    { value: "ready", label: "Ready", disabled: !adequate },
    ...(field.allowsNa
      ? [{ value: "na" as const, label: "N/A — not a foreign listing", disabled: false }]
      : []),
  ];

  return (
    <li>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="font-mono text-xs font-medium text-muted-foreground">
              {field.id}
            </span>
            <StatusBadge field={field} answer={answer} />
            <span className="ms-auto">
              <ItemSaveBadge state={saveState} dirty={dirty} savedAt={savedAt} />
            </span>
          </div>
          <CardTitle className="mt-1 text-pretty leading-snug">
            {field.prompt}
          </CardTitle>
          <CardDescription className="text-xs">
            Source: {field.source}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {field.control === "date" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${field.id}-saved-date`} className="text-sm font-medium">
                {field.shortLabel}
              </label>
              <Input
                type="date"
                id={`${field.id}-saved-date`}
                value={answer.dateValue}
                onChange={(event) => onTypedChange({ dateValue: event.target.value })}
                className="h-9 sm:max-w-56"
              />
            </div>
          ) : null}

          {field.control === "yes-no" ? (
            <div className="flex flex-col gap-1.5">
              <fieldset>
                <legend className="text-sm font-medium">{field.shortLabel}</legend>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {(["yes", "no"] as const).map((value) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`${field.id}-saved-yesno`}
                        value={value}
                        checked={answer.yesNo === value}
                        onChange={() => onTypedChange({ yesNo: value })}
                        className={radioClass}
                      />
                      <span className="capitalize">{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {answer.yesNo === "yes" ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${field.id}-saved-details`} className="text-sm font-medium">
                    Circumstances and any concerns raised
                  </label>
                  <Textarea
                    id={`${field.id}-saved-details`}
                    rows={3}
                    value={answer.text}
                    onChange={(event) => onTypedChange({ text: event.target.value })}
                    placeholder="Describe the circumstances and any concerns raised"
                  />
                </div>
              ) : null}
              <p className={hintClass}>
                A recorded No is a complete answer; Yes requires the
                circumstances above.
              </p>
            </div>
          ) : null}

          {field.control === "narrative" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${field.id}-saved-narrative`} className="text-sm font-medium">
                {field.shortLabel}
              </label>
              <Textarea
                id={`${field.id}-saved-narrative`}
                rows={4}
                value={answer.text}
                onChange={(event) => onTypedChange({ text: event.target.value })}
                placeholder="Describe the principal objects and activities"
              />
            </div>
          ) : null}

          {field.control === "conditional-text" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${field.id}-saved-text`} className="text-sm font-medium">
                {field.shortLabel}
              </label>
              <Textarea
                id={`${field.id}-saved-text`}
                rows={3}
                value={answer.text}
                onChange={(event) => onTypedChange({ text: event.target.value })}
                placeholder="Describe the arrangements, or record N/A with a reason below"
              />
              <p className={hintClass}>
                N/A with a recorded reason is offered only for this item.
              </p>
            </div>
          ) : null}

          <fieldset className="mt-1 border-t pt-4">
            <legend className="text-sm font-medium">Readiness</legend>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`${field.id}-saved-readiness`}
                    value={option.value}
                    checked={answer.status === option.value}
                    disabled={option.disabled}
                    onChange={() => onStatusChange({ status: option.value })}
                    className={radioClass}
                  />
                  <span
                    className={option.disabled ? "text-muted-foreground/70" : "text-foreground"}
                  >
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            {!adequate && answer.status !== "na" ? (
              <p className={`${hintClass} mt-2`}>
                Ready becomes available once an adequate answer is recorded above.
              </p>
            ) : null}
            {answer.status === "na" && field.allowsNa ? (
              <div className="mt-3 flex flex-col gap-1.5">
                <label htmlFor={`${field.id}-saved-na-reason`} className="text-sm font-medium">
                  Reason this is not a foreign listing
                </label>
                <Textarea
                  id={`${field.id}-saved-na-reason`}
                  rows={2}
                  value={answer.naReason}
                  onChange={(event) => onTypedChange({ naReason: event.target.value })}
                  placeholder="Record why this item does not apply"
                />
                {answer.naReason.trim() === "" ? (
                  <p className={hintClass}>
                    A recorded reason is required for a valid N/A — until then the
                    item stays in the progress denominator and counts as a gap,
                    and it cannot be saved as N/A.
                  </p>
                ) : (
                  <p className={hintClass}>
                    Reason recorded — this item is excluded from the progress
                    calculation once saved.
                  </p>
                )}
              </div>
            ) : null}
          </fieldset>

          {saveState.kind === "error" ? (
            <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
              <p role="alert" className="text-xs leading-relaxed">
                {saveState.message}
              </p>
              <div>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Retry {field.id}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}

export function SavedAssessment({
  client,
  company,
  onCompanyUpdated,
}: {
  client: SupabaseClient;
  company: CompanyRow;
  onCompanyUpdated: (company: CompanyRow) => void;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [checklist, setChecklist] = useState<ChecklistResult | null>(null);
  const [savedRows, setSavedRows] = useState<Record<string, AnswerRow | null>>({});
  const [drafts, setDrafts] = useState<Record<string, DemoAnswer>>({});
  const [itemStates, setItemStates] = useState<Record<string, ItemSaveState>>({});
  const [globalSaving, setGlobalSaving] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const savedRowsRef = useRef(savedRows);
  savedRowsRef.current = savedRows;
  const itemStatesRef = useRef(itemStates);
  itemStatesRef.current = itemStates;
  const dirtyMapRef = useRef<Record<string, boolean>>({});
  const globalSavingRef = useRef(globalSaving);
  globalSavingRef.current = globalSaving;
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const loadEpochRef = useRef(0);

  const items = checklist?.ok ? checklist.items : null;

  const dirtyMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!items) return map;
    for (const field of items) {
      const draft = drafts[field.id] ?? initialDemoAnswer();
      const saved = rowToDemoAnswer(savedRows[field.id] ?? null);
      map[field.id] = answerDirty(draft, saved);
    }
    return map;
  }, [items, drafts, savedRows]);
  dirtyMapRef.current = dirtyMap;

  const anyDirty = items ? items.some((field) => dirtyMap[field.id]) : false;
  const anySaving =
    globalSaving ||
    (items ? items.some((field) => itemStates[field.id]?.kind === "saving") : false);

  // Dashboard derives only from server-confirmed rows (the saved snapshot).
  const summary = useMemo(() => {
    if (!items) return null;
    const states: SampleItemState[] = items.map((field) => {
      const saved = rowToDemoAnswer(savedRows[field.id] ?? null);
      return {
        id: field.id,
        status: saved.status,
        allowsNa: field.allowsNa,
        naReason: saved.naReason,
      };
    });
    return summarizeSampleProgress(states);
  }, [items, savedRows]);

  const lastSavedAt = useMemo(() => {
    let latest: string | null = null;
    for (const row of Object.values(savedRows)) {
      if (row && (!latest || row.updated_at > latest)) latest = row.updated_at;
    }
    return latest;
  }, [savedRows]);

  const loadAll = useCallback(async () => {
    const epoch = ++loadEpochRef.current;
    setLoadState({ kind: "loading" });
    const [checklistResult, answersResult] = await Promise.all([
      fetchChecklist(client),
      fetchAnswers(client, company.id).then(
        (rows) => ({ kind: "ok" as const, rows }),
        (error: Error) => ({ kind: "failed" as const, message: error.message }),
      ),
    ]);
    // Fence: a newer load (or a sign-out/unmount) supersedes this response.
    if (epoch !== loadEpochRef.current) return;
    if (!checklistResult.ok) {
      setChecklist(checklistResult);
      setLoadState({ kind: "failed", message: checklistResult.reason });
      return;
    }
    if (answersResult.kind === "failed") {
      setLoadState({
        kind: "failed",
        message: `Your saved answers could not be loaded: ${answersResult.message}`,
      });
      return;
    }
    const nextRows: Record<string, AnswerRow | null> = {};
    const nextDrafts: Record<string, DemoAnswer> = {};
    for (const field of checklistResult.items) {
      const row = answersResult.rows.find((entry) => entry.item_id === field.id) ?? null;
      nextRows[field.id] = row;
      nextDrafts[field.id] = rowToDemoAnswer(row);
    }
    setChecklist(checklistResult);
    setSavedRows(nextRows);
    setDrafts(nextDrafts);
    setItemStates({});
    setLoadState({ kind: "ready" });
  }, [client, company.id]);

  useEffect(() => {
    void loadAll();
    return () => { loadEpochRef.current += 1; };
  }, [loadAll]);

  const runSaveBatch = useCallback(
    async (keys: string[], itemsList: NormalizedChecklistItem[], epoch: number) => {
      if (epoch !== loadEpochRef.current) return;
      globalSavingRef.current = true;
      setGlobalSaving(true);
      try {
        for (const key of keys) {
          if (epoch !== loadEpochRef.current) return;
          const field = itemsList.find((entry) => entry.id === key);
          if (!field) continue;
          const draft = draftsRef.current[key];
          if (!draft) continue;
          const saved = rowToDemoAnswer(savedRowsRef.current[key] ?? null);
          if (!answerDirty(draft, saved)) continue; // already server-confirmed
          const issue = answerWriteIssue(field, draft);
          if (issue) {
            setItemStates((previous) => ({ ...previous, [key]: { kind: "error", message: issue } }));
            continue;
          }
          setItemStates((previous) => ({ ...previous, [key]: { kind: "saving" } }));
          try {
            const row = await saveAnswer(client, company.id, field, draft);
            if (epoch !== loadEpochRef.current) return;
            savedRowsRef.current = { ...savedRowsRef.current, [key]: row };
            setSavedRows((previous) => ({ ...previous, [key]: row }));
            setItemStates((previous) => ({ ...previous, [key]: { kind: "saved" } }));
          } catch (error) {
            if (epoch !== loadEpochRef.current) return;
            const message = error instanceof Error ? error.message : "The answer was not saved.";
            setItemStates((previous) => ({ ...previous, [key]: { kind: "error", message } }));
          }
        }
      } finally {
        if (epoch === loadEpochRef.current) { globalSavingRef.current = false; setGlobalSaving(false); }
      }
    },
    [client, company.id],
  );

  // Serialized writes: every batch runs after the previous one settles, and a
  // batch skips items whose drafts were already confirmed by a newer state.
  const enqueueSave = useCallback(
    (keys: string[]) => {
      if (!items || keys.length === 0) return;
      const itemsList = items;
      const epoch = loadEpochRef.current;
      chainRef.current = chainRef.current
        .then(() => runSaveBatch(keys, itemsList, epoch))
        .catch(() => {});
    },
    [items, runSaveBatch],
  );

  function saveAll() {
    if (!items) return;
    const dirtyKeys = items.filter((field) => dirtyMap[field.id]).map((field) => field.id);
    enqueueSave(dirtyKeys);
  }

  const updateDraft = useCallback(
    (field: NormalizedChecklistItem, patch: Partial<DemoAnswer>, typed: boolean) => {
      setDrafts((previous) => {
        const prior = previous[field.id] ?? initialDemoAnswer();
        return { ...previous, [field.id]: applyAnswerUpdate(field, prior, patch, typed) };
      });
      // A new edit after a failure clears the stale failure banner; the draft
      // itself is always preserved.
      setItemStates((previous) =>
        previous[field.id]?.kind === "error"
          ? { ...previous, [field.id]: { kind: "idle" } }
          : previous,
      );
    },
    [],
  );

  // Warn before leaving with unsaved edits or an in-flight save.
  useEffect(() => {
    if (!anyDirty && !anySaving) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const signOutHandler = (event: Event) => {
      if (!window.confirm("You have unsaved changes or a save in progress. Sign out and leave these changes?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("daraja-before-signout", signOutHandler);
    return () => { window.removeEventListener("beforeunload", handler); window.removeEventListener("daraja-before-signout", signOutHandler); };
  }, [anyDirty, anySaving]);

  // Background reconciliation only while clean and idle, so a refresh can
  // never overwrite dirty edits or race an in-flight save.
  useEffect(() => {
    function onFocus() {
      if (Object.values(dirtyMapRef.current).some(Boolean)) return;
      if (globalSavingRef.current) return;
      const epoch = loadEpochRef.current;
      fetchAnswers(client, company.id)
        .then((rows) => {
          if (epoch !== loadEpochRef.current || globalSavingRef.current) return;
          if (Object.values(dirtyMapRef.current).some(Boolean)) return;
          setSavedRows((previous) => {
            const next = { ...previous };
            for (const key of Object.keys(next)) {
              const row = rows.find((entry) => entry.item_id === key);
              if (itemStatesRef.current[key]?.kind !== "saving") next[key] = row ?? null;
            }
            return next;
          });
          setDrafts((previous) => {
            const next = { ...previous };
            for (const key of Object.keys(next)) {
              const row = rows.find((entry) => entry.item_id === key);
              if (itemStatesRef.current[key]?.kind !== "saving") {
                next[key] = rowToDemoAnswer(row ?? null);
              }
            }
            return next;
          });
        })
        .catch(() => {
          /* transient background refresh failure; explicit loads/saves surface errors */
        });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [client, company.id]);

  async function submitRename(nextName: string) {
    const epoch = loadEpochRef.current;
    setRenameBusy(true);
    setRenameError(null);
    try {
      const updated = await updateCompanyName(client, company.id, nextName);
      if (epoch !== loadEpochRef.current) return;
      onCompanyUpdated(updated);
    } catch (error) {
      if (epoch !== loadEpochRef.current) return;
      setRenameError(error instanceof Error ? error.message : "The rename failed.");
    } finally {
      if (epoch === loadEpochRef.current) setRenameBusy(false);
    }
  }

  if (loadState.kind === "failed") {
    return (
      <Card className="mt-6 lg:mt-8" size="sm">
        <CardHeader>
          <CardTitle className="text-base">Assessment unavailable</CardTitle>
          <CardDescription className="max-w-[46em] leading-relaxed">
            {loadState.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void loadAll()}>
            Retry loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loadState.kind === "loading" || !items) {
    return (
      <p role="status" className="mt-8 text-sm text-muted-foreground">
        Loading your saved assessment…
      </p>
    );
  }

  return (
    <section aria-label="Saved sample assessment" className="mt-6 lg:mt-8">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <DashboardPanel
            company={company}
            summary={summary}
            items={items}
            savedRows={savedRows}
            lastSavedAt={lastSavedAt}
            anyDirty={anyDirty}
            anySaving={anySaving}
            onSaveAll={saveAll}
            onRename={submitRename}
            renameBusy={renameBusy}
            renameError={renameError}
          />
        </div>

        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={saveAll} disabled={!anyDirty || globalSaving}>
              {globalSaving ? "Saving…" : "Save changes"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {anySaving
                ? "Saving — entries below remain editable."
                : anyDirty
                  ? "Unsaved changes — Save writes them to the database."
                  : lastSavedAt ? `All changes saved (last save ${formatSavedAt(lastSavedAt)}).` : "No saved entries yet."}
            </span>
          </div>
          <ol className="flex flex-col gap-4">
            {items.map((field) => (
              <SavedField
                key={field.id}
                field={field}
                answer={drafts[field.id] ?? initialDemoAnswer()}
                dirty={dirtyMap[field.id] ?? false}
                saveState={itemStates[field.id] ?? { kind: "idle" }}
                savedAt={formatSavedAt(savedRows[field.id]?.updated_at ?? null)}
                onTypedChange={(patch) => updateDraft(field, patch, true)}
                onStatusChange={(patch) => updateDraft(field, patch, false)}
                onRetry={() => enqueueSave([field.id])}
              />
            ))}
          </ol>
          <p className={hintClass}>
            These entries are saved against the signed-in company above and are
            self-reported. The sample and readiness rules remain provisional
            proposals pending validation; they are not a regulatory finding.
          </p>
        </div>
      </div>
    </section>
  );
}
