/*
 * Pure autosave planner for the persisted assessment (UX contract,
 * 30 September 2026). No React/DOM/IO — covered by Node fixtures in
 * autosave.test.ts. The component wires this reducer to timers and the
 * serialized save chain; every decision about WHEN to save, HOW OFTEN to
 * retry and what a late acknowledgement means lives here.
 *
 * Contract implemented:
 *  - edits debounce ~800ms before a save is due;
 *  - saves are serialized per item by the component; while a save is in
 *    flight the item may be edited again — a successful acknowledgement then
 *    leaves the item DIRTY (the captured draft was stale), never falsely
 *    "Saved" (the component dispatches "edit" after comparing the current
 *    draft with the captured one);
 *  - automatic retries back off (1s, then 3s) and stop after a bounded
 *    number of consecutive failures, leaving a clear "Could not save + Retry"
 *    state — no fake Saved, no unbounded requests. Editing a stopped item
 *    keeps the visible failure; only the explicit Retry action restarts
 *    saving for it;
 *  - a manual Retry resets the failure budget and re-queues immediately;
 *  - "reset" clears everything (reload, account switch, unmount).
 */

export const AUTOSAVE_DEBOUNCE_MS = 800;
export const AUTOSAVE_MAX_AUTO_ATTEMPTS = 3;

/** Backoff between automatic retries: 1s, then 3s, then stop. */
export function autosaveBackoffMs(attempts: number): number {
  if (attempts <= 1) return 1000;
  if (attempts === 2) return 3000;
  return Number.POSITIVE_INFINITY;
}

export type AutosaveItemStatus =
  | { kind: "clean"; savedAt: string | null }
  | { kind: "dirty"; editedAt: number; attempts: number }
  | { kind: "saving"; startedAt: number; attempts: number }
  | { kind: "failed"; message: string; attempts: number; failedAt: number }
  | { kind: "invalid" };

export interface AutosaveState {
  items: Record<string, AutosaveItemStatus>;
}

export type AutosaveEvent =
  | { type: "edit"; id: string; at: number }
  | { type: "flush"; id: string; at: number }
  | { type: "succeeded"; id: string; savedAt: string }
  | { type: "failed"; id: string; message: string; at: number }
  | { type: "invalid"; id: string }
  | { type: "requeue"; id: string; at: number }
  | { type: "retry"; id: string; at: number }
  | { type: "reset"; ids: string[] };

export function initialAutosaveState(ids: string[]): AutosaveState {
  const items: Record<string, AutosaveItemStatus> = {};
  for (const id of ids) items[id] = { kind: "clean", savedAt: null };
  return { items };
}

export function autosaveReducer(state: AutosaveState, event: AutosaveEvent): AutosaveState {
  if (event.type === "reset") return initialAutosaveState(event.ids);
  const item = state.items[event.id];
  if (!item) return state;

  switch (event.type) {
    case "edit": {
      // Editing while saving keeps "saving" (the in-flight capture is stale;
      // the component re-dirties on acknowledgement). Editing a failed item
      // records the edit but KEEPS the failure budget, so a failing endpoint
      // is not hammered; when the budget is exhausted the item stays "failed"
      // with its banner until Retry is pressed.
      if (item.kind === "saving") return state;
      const attempts = item.kind === "failed" ? item.attempts : 0;
      if (attempts >= AUTOSAVE_MAX_AUTO_ATTEMPTS) return state;
      return {
        ...state,
        items: { ...state.items, [event.id]: { kind: "dirty", editedAt: event.at, attempts } },
      };
    }
    case "flush": {
      if (item.kind !== "dirty") return state;
      return {
        ...state,
        items: { ...state.items, [event.id]: { kind: "saving", startedAt: event.at, attempts: item.attempts } },
      };
    }
    case "succeeded": {
      if (item.kind !== "saving") return state;
      return { ...state, items: { ...state.items, [event.id]: { kind: "clean", savedAt: event.savedAt } } };
    }
    case "failed": {
      const attempts = item.kind === "saving" ? item.attempts + 1 : item.kind === "failed" ? item.attempts : 1;
      return {
        ...state,
        items: {
          ...state.items,
          [event.id]: { kind: "failed", message: event.message, attempts, failedAt: event.at },
        },
      };
    }
    case "invalid": {
      /*
       * Stable local-validation state (D1, 30 September 2026): the draft
       * failed answerWriteIssue, so nothing was posted. The item leaves the
       * automatic queue entirely — no debounced re-flush loop, no network
       * request — until the user edits it again (a new "edit" resets it to
       * dirty with a fresh budget) or presses Retry. It stays excluded from
       * "clean", and the component's draft-vs-saved dirty map keeps it
       * counted for the unload guard.
       */
      if (item.kind !== "saving") return state;
      return { ...state, items: { ...state.items, [event.id]: { kind: "invalid" } } };
    }
    case "requeue": {
      // Automatic retry after backoff (only dispatched while shouldAutoRetry).
      if (item.kind !== "failed") return state;
      return {
        ...state,
        items: { ...state.items, [event.id]: { kind: "dirty", editedAt: event.at, attempts: item.attempts } },
      };
    }
    case "retry": {
      // Manual Retry always re-queues immediately with a fresh budget.
      return {
        ...state,
        items: { ...state.items, [event.id]: { kind: "dirty", editedAt: event.at, attempts: 0 } },
      };
    }
  }
}

/*
 * Ids whose debounces have elapsed. Items whose failure budget is exhausted
 * are excluded (they wait for the explicit Retry action). Called by the
 * component's timer tick.
 */
export function dueDirtyItems(state: AutosaveState, now: number): string[] {
  const due: string[] = [];
  for (const [id, item] of Object.entries(state.items)) {
    if (item.kind !== "dirty") continue;
    if (item.attempts >= AUTOSAVE_MAX_AUTO_ATTEMPTS) continue;
    if (now - item.editedAt < AUTOSAVE_DEBOUNCE_MS) continue;
    due.push(id);
  }
  return due;
}

export type AutosaveFailedStatus = Extract<AutosaveItemStatus, { kind: "failed" }>;

/** Whether an automatic retry should be scheduled after a failure. */
export function shouldAutoRetry(item: AutosaveItemStatus): item is AutosaveFailedStatus {
  return item.kind === "failed" && item.attempts < AUTOSAVE_MAX_AUTO_ATTEMPTS;
}

/** Ids that failed and are due for an automatic backoff requeue. */
export function dueRequeueItems(state: AutosaveState, now: number): string[] {
  const due: string[] = [];
  for (const [id, item] of Object.entries(state.items)) {
    if (!shouldAutoRetry(item)) continue;
    if (now - item.failedAt < autosaveBackoffMs(item.attempts)) continue;
    due.push(id);
  }
  return due;
}

/** Aggregate chip state for the summary line. */
export function aggregateAutosave(state: AutosaveState): {
  saving: number;
  dirty: number;
  failed: number;
  invalid: number;
} {
  let saving = 0;
  let dirty = 0;
  let failed = 0;
  let invalid = 0;
  for (const item of Object.values(state.items)) {
    if (item.kind === "saving") saving += 1;
    else if (item.kind === "dirty") dirty += 1;
    else if (item.kind === "failed") failed += 1;
    else if (item.kind === "invalid") invalid += 1;
  }
  return { saving, dirty, failed, invalid };
}
