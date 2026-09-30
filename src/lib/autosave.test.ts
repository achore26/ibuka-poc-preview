/*
 * Built-in Node fixtures for the pure autosave planner
 * (src/lib/autosave.ts). Same self-running convention: no framework, exits
 * non-zero on failure, typechecked by `npm run build`.
 *
 * Run with: npm test
 */

import {
  AUTOSAVE_DEBOUNCE_MS,
  aggregateAutosave,
  autosaveBackoffMs,
  autosaveReducer,
  dueDirtyItems,
  dueRequeueItems,
  initialAutosaveState,
  shouldAutoRetry,
  type AutosaveState,
} from "./autosave.ts";

let passed = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failures.push(`${label}\n    expected: ${e}\n    actual:   ${a}`);
    console.log(`FAIL  ${label}`);
  }
}

const T0 = 1_000_000;
const ids = ["CP-01", "CP-07", "Q-BUS-01"];

function fresh(): AutosaveState {
  return initialAutosaveState(ids);
}

// ---------------------------------------------------------------------------
// Debounce: a fresh edit is not due immediately; it becomes due after 800ms.
// ---------------------------------------------------------------------------

{
  let s = fresh();
  s = autosaveReducer(s, { type: "edit", id: "CP-01", at: T0 });
  check("fresh edit kind is dirty", s.items["CP-01"].kind, "dirty");
  check("not due before the debounce elapses", dueDirtyItems(s, T0 + AUTOSAVE_DEBOUNCE_MS - 1), []);
  check("due exactly at the debounce", dueDirtyItems(s, T0 + AUTOSAVE_DEBOUNCE_MS), ["CP-01"]);

  s = autosaveReducer(s, { type: "edit", id: "CP-01", at: T0 + 500 });
  check(
    "a newer edit restarts the debounce",
    dueDirtyItems(s, T0 + 999),
    [],
  );
  check(
    "the restarted edit is due 800ms after the last keystroke",
    dueDirtyItems(s, T0 + 500 + AUTOSAVE_DEBOUNCE_MS),
    ["CP-01"],
  );
}

// ---------------------------------------------------------------------------
// Flush -> success, and the late-acknowledgement rule.
// ---------------------------------------------------------------------------

{
  let s = fresh();
  s = autosaveReducer(s, { type: "edit", id: "CP-01", at: T0 });
  s = autosaveReducer(s, { type: "flush", id: "CP-01", at: T0 + AUTOSAVE_DEBOUNCE_MS });
  check("flush moves the item to saving", s.items["CP-01"].kind, "saving");
  check("a saving item is never due for flush", dueDirtyItems(s, T0 + 10_000), []);

  s = autosaveReducer(s, { type: "succeeded", id: "CP-01", savedAt: "2026-09-30T00:00:05Z" });
  check("success marks the item clean with the server timestamp", s.items["CP-01"], {
    kind: "clean",
    savedAt: "2026-09-30T00:00:05Z",
  });

  // Late acknowledgement: the user typed again while the request was in
  // flight; the component dispatches "edit" after comparing the current draft
  // with the acknowledged row, so the item becomes dirty again — never a
  // false "Saved".
  let late = fresh();
  late = autosaveReducer(late, { type: "edit", id: "CP-07", at: T0 });
  late = autosaveReducer(late, { type: "flush", id: "CP-07", at: T0 + AUTOSAVE_DEBOUNCE_MS });
  late = autosaveReducer(late, { type: "edit", id: "CP-07", at: T0 + AUTOSAVE_DEBOUNCE_MS + 50 });
  check("editing while saving keeps the saving state (capture is stale)", late.items["CP-07"].kind, "saving");
  late = autosaveReducer(late, { type: "succeeded", id: "CP-07", savedAt: "2026-09-30T00:00:05Z" });
  late = autosaveReducer(late, { type: "edit", id: "CP-07", at: T0 + AUTOSAVE_DEBOUNCE_MS + 60 });
  check("component re-dirties after a late acknowledgement", late.items["CP-07"].kind, "dirty");
}

// ---------------------------------------------------------------------------
// Bounded failures, backoff, stop, manual retry.
// ---------------------------------------------------------------------------

check("backoff grows 1s then 3s then stops", [
  autosaveBackoffMs(1),
  autosaveBackoffMs(2),
  autosaveBackoffMs(3),
], [1000, 3000, Number.POSITIVE_INFINITY]);

// ---------------------------------------------------------------------------
// D1 (30 September 2026): a draft that fails local validation parks in a
// STABLE "invalid" state — excluded from the automatic queue entirely (no
// debounced re-flush loop, no requests) until a corrected edit or Retry.
// ---------------------------------------------------------------------------

{
  let s = fresh();
  s = autosaveReducer(s, { type: "edit", id: "CP-07", at: T0 });
  s = autosaveReducer(s, { type: "flush", id: "CP-07", at: T0 + AUTOSAVE_DEBOUNCE_MS });
  s = autosaveReducer(s, { type: "invalid", id: "CP-07" });
  check("invalid draft parks in the stable invalid state", s.items["CP-07"].kind, "invalid");
  check("invalid item is never due for an automatic flush", dueDirtyItems(s, T0 + 999_999), []);
  check("invalid item is never requeued", dueRequeueItems(s, T0 + 999_999), []);
  check("invalid item is counted in the aggregate", aggregateAutosave(s), { saving: 0, dirty: 0, failed: 0, invalid: 1 });
  check("invalid event outside a flush is ignored", autosaveReducer(s, { type: "invalid", id: "CP-07" }), s);

  // A corrected edit resumes saving automatically with a fresh budget.
  const resumed = autosaveReducer(s, { type: "edit", id: "CP-07", at: T0 + 4000 });
  check("editing an invalid item re-queues it as dirty", resumed.items["CP-07"], {
    kind: "dirty",
    editedAt: T0 + 4000,
    attempts: 0,
  });
  check("the corrected edit becomes due after the debounce", dueDirtyItems(resumed, T0 + 4000 + AUTOSAVE_DEBOUNCE_MS), ["CP-07"]);

  // Explicit Retry also works from the invalid state.
  const retried = autosaveReducer(s, { type: "retry", id: "CP-07", at: T0 + 5000 });
  check("manual retry from invalid re-queues immediately", retried.items["CP-07"], {
    kind: "dirty",
    editedAt: T0 + 5000,
    attempts: 0,
  });
}

{
  let s = fresh();
  s = autosaveReducer(s, { type: "edit", id: "Q-BUS-01", at: T0 });
  s = autosaveReducer(s, { type: "flush", id: "Q-BUS-01", at: T0 + AUTOSAVE_DEBOUNCE_MS });
  s = autosaveReducer(s, { type: "failed", id: "Q-BUS-01", message: "outage", at: T0 + 2000 });
  check("first failure records attempts=1", (s.items["Q-BUS-01"] as { attempts: number }).attempts, 1);
  check("shouldAutoRetry after the first failure", shouldAutoRetry(s.items["Q-BUS-01"]), true);
  check("not requeued before the 1s backoff", dueRequeueItems(s, T0 + 2500), []);
  check("requeued after the 1s backoff", dueRequeueItems(s, T0 + 3001), ["Q-BUS-01"]);

  // Second failure.
  s = autosaveReducer(s, { type: "requeue", id: "Q-BUS-01", at: T0 + 3001 });
  s = autosaveReducer(s, { type: "flush", id: "Q-BUS-01", at: T0 + 3001 + AUTOSAVE_DEBOUNCE_MS });
  s = autosaveReducer(s, { type: "failed", id: "Q-BUS-01", message: "outage", at: T0 + 5000 });
  check("second failure records attempts=2", (s.items["Q-BUS-01"] as { attempts: number }).attempts, 2);

  // Third failure exhausts the budget: no further automatic flush or requeue.
  s = autosaveReducer(s, { type: "requeue", id: "Q-BUS-01", at: T0 + 9000 });
  s = autosaveReducer(s, { type: "flush", id: "Q-BUS-01", at: T0 + 9000 + AUTOSAVE_DEBOUNCE_MS });
  s = autosaveReducer(s, { type: "failed", id: "Q-BUS-01", message: "outage", at: T0 + 11000 });
  check("third failure records attempts=3 (budget exhausted)", (s.items["Q-BUS-01"] as { attempts: number }).attempts, 3);
  check("no automatic retry once the budget is exhausted", shouldAutoRetry(s.items["Q-BUS-01"]), false);
  check("exhausted item is never requeued", dueRequeueItems(s, T0 + 999_999), []);
  const guarded = autosaveReducer(s, { type: "edit", id: "Q-BUS-01", at: T0 + 12000 });
  check("editing a stopped item keeps the failure banner", guarded.items["Q-BUS-01"].kind, "failed");

  // Manual Retry restarts the cycle with a fresh budget.
  const retried = autosaveReducer(guarded, { type: "retry", id: "Q-BUS-01", at: T0 + 13000 });
  check("manual retry re-queues as dirty with attempts=0", retried.items["Q-BUS-01"], {
    kind: "dirty",
    editedAt: T0 + 13000,
    attempts: 0,
  });
  check("manual retry item is immediately due", dueDirtyItems(retried, T0 + 13000 + AUTOSAVE_DEBOUNCE_MS), ["Q-BUS-01"]);
}

// ---------------------------------------------------------------------------
// Independent per-item budgets, aggregate, reset.
// ---------------------------------------------------------------------------

{
  let s = fresh();
  s = autosaveReducer(s, { type: "edit", id: "CP-01", at: T0 });
  s = autosaveReducer(s, { type: "edit", id: "CP-07", at: T0 + 100 });
  s = autosaveReducer(s, { type: "flush", id: "CP-01", at: T0 + AUTOSAVE_DEBOUNCE_MS });
  check("aggregate counts one saving and one dirty", aggregateAutosave(s), { saving: 1, dirty: 1, failed: 0, invalid: 0 });
  check("the other item is still due independently", dueDirtyItems(s, T0 + 2000), ["CP-07"]);

  s = autosaveReducer(s, { type: "failed", id: "CP-01", message: "x", at: T0 + 2000 });
  check("aggregate counts the failure", aggregateAutosave(s), { saving: 0, dirty: 1, failed: 1, invalid: 0 });

  const reset = autosaveReducer(s, { type: "reset", ids });
  check("reset clears every item to clean", aggregateAutosave(reset), { saving: 0, dirty: 0, failed: 0, invalid: 0 });
  check("reset clears the failure banner", reset.items["CP-01"].kind, "clean");
}

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} check(s) FAILED:\n\n${failures.join("\n\n")}`);
  throw new Error("autosave fixtures failed");
}
console.log(`autosave fixtures: ${passed} check(s) passed, 0 failed`);
