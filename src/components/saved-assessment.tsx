/*
 * Persisted assessment (CMP Kenya, 30 September 2026 UX contract): the enabled
 * ten-item sample with automatic saving. Every meaningful change — typed
 * answers, Ready/Return-to-draft/N-A state actions and recorded N/A reasons —
 * autosaves ~800ms after the change; explicit Retry/Save now remains as a
 * fallback. Saves are serialized per item; a late acknowledgement can never
 * mark a re-edited draft "Saved" (the current draft is compared with the
 * acknowledged row and re-dirtied); queued writes stop on reload, account
 * switch or unmount (epoch guards). Failures keep the latest visible edits,
 * back off and stop after a bounded budget, and never fake "Saved".
 *
 * The dashboard metric derives ONLY from server-confirmed rows and is labelled
 * self-reported prepared-for-review — not regulatory readiness.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuestionNavigation } from "@/components/use-question-navigation";
import { AssessmentForm, type FormSection } from "@/components/assessment-form";
import { DashboardPanel } from "@/components/dashboard-panel";
import { PreparedGap, PreparedPanel } from "@/components/prepared-panel";
import {
  enabledFields,
  enabledSections,
  initialSampleAnswer,
  type SampleAnswer,
} from "@/lib/enabled-sample";
import {
  aggregateAutosave,
  autosaveReducer,
  dueDirtyItems,
  dueRequeueItems,
  initialAutosaveState,
} from "@/lib/autosave";
import {
  applyAnswerUpdate,
  answerDirty,
  answerTextChanged,
  answerWriteIssue,
  rowToSampleAnswer,
} from "@/lib/app-data/answer-state";
import { summarizeSampleProgress } from "@/lib/sample-progress";
import { fetchAnswers, saveAnswer, updateCompanyName } from "@/lib/app-data/api";
import { fetchChecklist, type ChecklistResult, type NormalizedChecklistItem } from "@/lib/app-data/checklist";
import type { AnswerRow, CompanyRow } from "@/lib/app-data/types";

const hintClass = "text-xs leading-relaxed text-muted-foreground";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "failed"; message: string };

function formatSavedAt(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
  const [drafts, setDrafts] = useState<Record<string, SampleAnswer>>({});
  const [invalidDrafts, setInvalidDrafts] = useState<Record<string, string>>({});
  const ids = useMemo(() => enabledFields.map((field) => field.id), []);
  const [autosave, dispatchAutosave] = useReducer(autosaveReducer, ids, initialAutosaveState);
  const { activeKey, setActiveKey, navigateTo } = useQuestionNavigation();
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const savedRowsRef = useRef(savedRows);
  savedRowsRef.current = savedRows;
  const autosaveRef = useRef(autosave);
  autosaveRef.current = autosave;
  const itemsRef = useRef<NormalizedChecklistItem[]>([]);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const loadEpochRef = useRef(0);

  const items = checklist?.ok ? checklist.items : null;
  itemsRef.current = items ?? [];

  const sections: FormSection[] | null = useMemo(() => {
    if (!items) return null;
    return enabledSections.map((section) => ({
      key: section.key,
      title: section.title,
      items: items
        .filter((item) => item.sectionKey === section.key)
        .map((item) => ({
          id: item.id,
          prompt: item.prompt,
          shortLabel: item.shortLabel,
          source: item.source,
          control: item.control,
          allowsNa: item.allowsNa,
          selectOptions: item.selectOptions,
        })),
    }));
  }, [items]);

  const dirtyMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!items) return map;
    for (const field of items) {
      const draft = drafts[field.id] ?? initialSampleAnswer();
      const saved = rowToSampleAnswer(savedRows[field.id] ?? null);
      map[field.id] = answerDirty(draft, saved);
    }
    return map;
  }, [items, drafts, savedRows]);
  const dirtyMapRef = useRef(dirtyMap);
  dirtyMapRef.current = dirtyMap;

  // Dashboard derives only from server-confirmed rows (the saved snapshot).
  const summary = useMemo(() => {
    if (!items) return null;
    const states = items.map((field) => {
      const saved = rowToSampleAnswer(savedRows[field.id] ?? null);
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

  const aggregate = aggregateAutosave(autosave);
  const anySaving = aggregate.saving > 0;
  const anyDirty = aggregate.dirty > 0 || Object.values(dirtyMap).some(Boolean);
  const anyFailed = aggregate.failed > 0;

  // -- Load / resume -----------------------------------------------------------

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
    const nextDrafts: Record<string, SampleAnswer> = {};
    for (const field of checklistResult.items) {
      const row = answersResult.rows.find((entry) => entry.item_id === field.id) ?? null;
      nextRows[field.id] = row;
      nextDrafts[field.id] = rowToSampleAnswer(row);
    }
    setChecklist(checklistResult);
    setSavedRows(nextRows);
    setDrafts(nextDrafts);
    setInvalidDrafts({});
    dispatchAutosave({ type: "reset", ids: checklistResult.items.map((item) => item.id) });
    setLoadState({ kind: "ready" });
  }, [client, company.id]);

  useEffect(() => {
    void loadAll();
    return () => {
      loadEpochRef.current += 1;
    };
  }, [loadAll]);

  // -- Serialized saving ---------------------------------------------------------

  /*
   * Flushes one item now: validates the draft (invalid drafts show a
   * validation message and are never posted), then INSERT/UPDATE through the
   * real API. The captured draft comparison after success re-dirties the item
   * when the user typed during the request — a late acknowledgement never
   * falsely says Saved.
   */
  const flushIds = useCallback(
    (keys: string[], epoch: number) => {
      const itemsList = itemsRef.current;
      for (const key of keys) {
        const field = itemsList.find((entry) => entry.id === key);
        const draft = draftsRef.current[key];
        if (!field || !draft) continue;
        chainRef.current = chainRef.current
          .then(async () => {
            if (epoch !== loadEpochRef.current) return;
            const saved = rowToSampleAnswer(savedRowsRef.current[key] ?? null);
            if (!answerDirty(draft, saved)) {
              /*
               * Already server-confirmed (D2): the edit was TEXTUALLY new
               * (e.g. "5000 " over a saved canonical 5000) but numerically
               * acknowledged-equal, so there is nothing to persist — the
               * typed string stays in the control and no write is made.
               * Settle the queue state to clean here so the item cannot sit
               * "Unsaved changes" (and trip the unload guard) forever.
               */
              dispatchAutosave({ type: "flush", id: key, at: Date.now() });
              dispatchAutosave({
                type: "succeeded",
                id: key,
                savedAt: savedRowsRef.current[key]?.updated_at ?? "",
              });
              return;
            }
            dispatchAutosave({ type: "flush", id: key, at: Date.now() });
            const issue = answerWriteIssue(field, draft);
            if (issue) {
              // Invalid typed draft (D1): show validation, post nothing, and
              // park the item in the STABLE "invalid" state — excluded from
              // the automatic queue until the next corrected edit (or Retry),
              // so an untouched invalid draft can never loop retries. The
              // draft-vs-saved dirty map still counts it for the unload guard.
              setInvalidDrafts((previous) => ({ ...previous, [key]: issue }));
              dispatchAutosave({ type: "invalid", id: key });
              return;
            }
            try {
              const row = await saveAnswer(client, company.id, field, draft);
              if (epoch !== loadEpochRef.current) return;
              savedRowsRef.current = { ...savedRowsRef.current, [key]: row };
              setSavedRows((previous) => ({ ...previous, [key]: row }));
              dispatchAutosave({ type: "succeeded", id: key, savedAt: row.updated_at });
              const current = draftsRef.current[key];
              if (current && answerDirty(current, rowToSampleAnswer(row))) {
                dispatchAutosave({ type: "edit", id: key, at: Date.now() });
              }
            } catch (error) {
              if (epoch !== loadEpochRef.current) return;
              const message = error instanceof Error ? error.message : "The answer was not saved.";
              dispatchAutosave({ type: "failed", id: key, message, at: Date.now() });
            }
          })
          .catch(() => {
            if (epoch === loadEpochRef.current) {
              dispatchAutosave({ type: "failed", id: key, message: "The save did not complete.", at: Date.now() });
            }
          });
      }
    },
    [client, company.id],
  );

  // Debounce tick: flush due items, requeue failed ones after backoff.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const epoch = loadEpochRef.current;
      const state = autosaveRef.current;
      const now = Date.now();
      for (const id of dueDirtyItems(state, now)) flushIds([id], epoch);
      for (const id of dueRequeueItems(state, now)) dispatchAutosave({ type: "requeue", id, at: now });
    }, 200);
    return () => window.clearInterval(timer);
  }, [flushIds]);

  // -- Draft updates ---------------------------------------------------------------

  /*
   * Every MEANINGFUL change enters the dirty queue, not only typed edits: a
   * Ready/Return-to-draft/N-A state action or a recorded N/A reason on a
   * clean saved item must autosave too (bounded verification 30 September
   * 2026 caught this wiring error: non-typed changes previously never
   * dispatched "edit", so they waited for a manual save that the UI no
   * longer requires). Meaningful is TEXTUAL against the prior draft (D2):
   * saved "5000" then typing "5000 " is a real change — the typed string
   * survives and the item re-queues; numeric semantic equality is used only
   * when comparing a draft with a server-confirmed snapshot. A patch that
   * changes nothing textually dispatches nothing — otherwise the item would
   * sit "dirty" while the flush finds it already server-confirmed. `typed`
   * still governs the demotion semantics inside applyAnswerUpdate (typing
   * returns a ready item to draft).
   */
  const updateDraft = useCallback(
    (field: NormalizedChecklistItem, patch: Partial<SampleAnswer>, typed: boolean) => {
      const prior = draftsRef.current[field.id] ?? initialSampleAnswer();
      const next = applyAnswerUpdate(field, prior, patch, typed);
      if (!answerTextChanged(next, prior)) return;
      draftsRef.current = { ...draftsRef.current, [field.id]: next };
      setDrafts((previous) => ({ ...previous, [field.id]: next }));
      dispatchAutosave({ type: "edit", id: field.id, at: Date.now() });
      setInvalidDrafts((previous) =>
        previous[field.id] ? Object.fromEntries(Object.entries(previous).filter(([key]) => key !== field.id)) : previous,
      );
    },
    [],
  );

  // -- Exit guards -------------------------------------------------------------------

  useEffect(() => {
    if (!anyDirty && !anySaving) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const signOutHandler = (event: Event) => {
      if (
        !window.confirm(
          "You have unsaved changes or a save in progress. Sign out and leave these changes?",
        )
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("cmp-before-signout", signOutHandler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("cmp-before-signout", signOutHandler);
    };
  }, [anyDirty, anySaving]);

  // Background reconciliation only while fully clean and idle.
  useEffect(() => {
    function onFocus() {
      if (aggregateAutosave(autosaveRef.current).saving > 0) return;
      if (Object.values(dirtyMapRef.current).some(Boolean)) return;
      const epoch = loadEpochRef.current;
      fetchAnswers(client, company.id)
        .then((rows) => {
          if (epoch !== loadEpochRef.current) return;
          if (aggregateAutosave(autosaveRef.current).saving > 0) return;
          if (Object.values(dirtyMapRef.current).some(Boolean)) return;
          setSavedRows((previous) => {
            const next = { ...previous };
            for (const key of Object.keys(next)) {
              const row = rows.find((entry) => entry.item_id === key);
              if (autosaveRef.current.items[key]?.kind !== "saving") next[key] = row ?? null;
            }
            return next;
          });
          setDrafts((previous) => {
            const next = { ...previous };
            for (const key of Object.keys(next)) {
              if (autosaveRef.current.items[key]?.kind === "saving") continue;
              const row = rows.find((entry) => entry.item_id === key);
              next[key] = rowToSampleAnswer(row ?? null);
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

  // -- Render ---------------------------------------------------------------------------

  if (loadState.kind === "failed") {
    return (
      <Card className="mt-6 lg:mt-8" size="sm">
        <CardHeader>
          <CardTitle className="text-base">Assessment unavailable</CardTitle>
          <CardDescription className="max-w-[46em] leading-relaxed">{loadState.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="h-11 sm:h-9" onClick={() => void loadAll()}>
            Retry loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loadState.kind === "loading" || !items || !sections) {
    return (
      <p role="status" className="mt-8 text-sm text-muted-foreground">
        Loading your saved assessment…
      </p>
    );
  }

  const savedTime = formatSavedAt(lastSavedAt);
  const globalStatus = anySaving
    ? "Saving…"
    : anyFailed
      ? "Some changes could not be saved — check the marked entries and retry."
      : aggregate.invalid > 0
        ? "Some entries need attention before they can be saved."
        : anyDirty
          ? "Unsaved changes — saving shortly."
          : savedTime
            ? `All changes saved (last save ${savedTime}).`
            : "Autosaves a few moments after you stop typing.";

  const gaps: PreparedGap[] =
    summary?.kind === "ok"
      ? summary.gaps.map((gap) => {
          const field = items.find((item) => item.id === gap.id);
          return {
            id: gap.id,
            shortLabel: field?.shortLabel ?? gap.id,
            statusNote:
              gap.status === "not_started"
                ? "not started"
                : gap.status === "in_progress"
                  ? "draft"
                  : "N/A without a recorded reason",
          };
        })
      : [];

  return (
    <section aria-label="Saved sample assessment" className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Listing assessment</p>
        <h1 title={company.name} className="mt-1 line-clamp-2 text-2xl font-semibold leading-8 tracking-tight sm:line-clamp-none sm:text-[30px] sm:leading-9">{company.name}</h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Proposed sample pending validation</p>
      </div>
      <div
        role="status"
        aria-live="polite"
        className="panel flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5 text-sm"
      >
        <span
          className={
            anyFailed || aggregate.invalid > 0
              ? "font-medium text-destructive"
              : anySaving || anyDirty
                ? "font-medium"
                : "text-muted-foreground"
          }
        >
          {globalStatus}
        </span>
        {(anyDirty || anyFailed) && !anySaving ? (
          <Button
            className="ms-auto h-11 sm:h-9"
            onClick={() => flushIds(Object.keys(dirtyMap).filter((key) => dirtyMap[key]), loadEpochRef.current)}
          >
            Save now
          </Button>
        ) : null}
      </div>
      {Object.keys(invalidDrafts).length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm">
          {Object.entries(invalidDrafts).map(([id, message]) => (
            <p key={id}>{message}</p>
          ))}
          <p className={hintClass}>The marked entries stay visible and are not saved until they are valid.</p>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,720px)_264px]">
        <SavedForm
          sections={sections}
          activeKey={activeKey}
          onSelectSection={setActiveKey}
          drafts={drafts}
          savedRows={savedRows}
          autosave={autosave}
          invalidDrafts={invalidDrafts}
          items={items}
          progressPanel={
            <details className="text-sm">
              <summary className="flex min-h-11 cursor-pointer items-center rounded font-medium focus-visible:outline-2 focus-visible:outline-ring">Progress and remaining items</summary>
              <PreparedPanel summary={summary} gaps={gaps} savedNote={anyDirty || anySaving ? "Progress reflects the last saved answers." : "Saved entries only."} onNavigate={navigateTo} completeAllowed={!anyDirty && !anySaving && !anyFailed && aggregate.invalid === 0} firstId={enabledFields[0].id} />
            </details>
          }
          onUpdate={updateDraft}
          onRetry={(id) => {
            setInvalidDrafts((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== id)));
            dispatchAutosave({ type: "retry", id, at: Date.now() });
            flushIds([id], loadEpochRef.current);
          }}
        />

        <div className="flex flex-col gap-4">
          <div className="hidden lg:sticky lg:top-20 lg:block">
            <PreparedPanel
              summary={summary}
              gaps={gaps}
              savedNote={anyDirty || anySaving ? "Progress reflects the last saved answers." : "Saved entries only."}
              onNavigate={navigateTo}
              completeAllowed={!anyDirty && !anySaving && !anyFailed && aggregate.invalid === 0}
              firstId={enabledFields[0].id}
            />
          </div>

          <DashboardPanel
            company={company}
            items={items}
            savedRows={savedRows}
            onRename={submitRename}
            renameBusy={renameBusy}
            renameError={renameError}
          />
        </div>
      </div>

      <p className={hintClass}>
        Entries are saved against the signed-in company above and are self-reported. The sample and rules
        remain proposals pending validation; they are not a regulatory finding. Preview-only sessions never
        save anything.
      </p>
    </section>
  );
}

/*
 * The autosaving form wrapper: maps the shared AssessmentForm to drafts and
 * per-item autosave chips (Unsaved changes / Saving / Saved / Could not save +
 * Retry).
 */
function SavedForm({
  sections,
  activeKey,
  onSelectSection,
  drafts,
  savedRows,
  autosave,
  invalidDrafts,
  items,
  progressPanel,
  onUpdate,
  onRetry,
}: {
  sections: FormSection[];
  activeKey: string;
  onSelectSection: (key: string) => void;
  progressPanel: React.ReactNode;
  drafts: Record<string, SampleAnswer>;
  savedRows: Record<string, AnswerRow | null>;
  autosave: ReturnType<typeof autosaveReducer>;
  invalidDrafts: Record<string, string>;
  items: NormalizedChecklistItem[];
  onUpdate: (field: NormalizedChecklistItem, patch: Partial<SampleAnswer>, typed: boolean) => void;
  onRetry: (id: string) => void;
}) {
  const sectionProgress = (key: string) => {
    const sectionItems = items.filter((item) => item.sectionKey === key);
    return {
      ready: sectionItems.filter((item) => rowToSampleAnswer(savedRows[item.id] ?? null).status === "ready").length,
      total: sectionItems.length,
    };
  };

  const itemStatusSlot = (id: string) => {
    const state = autosave.items[id];
    if (!state) return null;
    if (state.kind === "saving") return <Badge variant="outline">Saving…</Badge>;
    if (state.kind === "dirty") return <Badge variant="outline">Unsaved changes</Badge>;
    if (state.kind === "invalid") {
      return (
        <Badge variant="outline" className="border-destructive/40 text-destructive">
          Needs attention
        </Badge>
      );
    }
    if (state.kind === "failed") {
      return (
        <span className="flex items-center gap-1.5">
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Could not save
          </Badge>
          <Button variant="outline" size="sm" className="h-11 sm:h-7" onClick={() => onRetry(id)}>
            Retry
          </Button>
        </span>
      );
    }
    return null;
  };

  return (
    <AssessmentForm
      persisted
      sections={sections}
      progress={sectionProgress}
      answers={drafts}
      activeKey={activeKey}
      onSelectSection={onSelectSection}
      onTypedChange={(id, patch) => {
        const field = items.find((item) => item.id === id);
        if (field) onUpdate(field, patch, true);
      }}
      onMarkReady={(id) => {
        const field = items.find((item) => item.id === id);
        if (field) onUpdate(field, { status: "ready" }, false);
      }}
      onReturnToDraft={(id) => {
        const field = items.find((item) => item.id === id);
        if (field) onUpdate(field, { status: "in_progress" }, false);
      }}
      onMarkNotApplicable={(id) => {
        const field = items.find((item) => item.id === id);
        if (field) onUpdate(field, { status: "na" }, false);
      }}
      onUndoNotApplicable={(id) => {
        const field = items.find((item) => item.id === id);
        if (field) onUpdate(field, { status: "in_progress" }, false);
      }}
      statusSlot={itemStatusSlot}
      mobileSummary={progressPanel}
      navSuffix={
        Object.keys(invalidDrafts).length > 0 ? (
          <p className={hintClass}>Some entries have validation messages — see the marked questions.</p>
        ) : undefined
      }
    />
  );
}
