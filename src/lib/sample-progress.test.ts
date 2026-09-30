/*
 * Built-in Node fixtures for the pure sample-progress calculator, updated for
 * the enabled ten-item sample (CMP Kenya, task cmp-catalogue-20260930).
 * Expected values are stated independently of the implementation.
 *
 * Run with: npm test   (Node >= 22.18 / 23.6 runs .ts directly; older 22.x
 * needs --experimental-strip-types). No test framework is imported; the file
 * self-runs and exits non-zero on any failure. `tsc --noEmit` (part of
 * `npm run build`) also typechecks this file.
 */

import {
  isValidNa,
  summarizeSampleProgress,
  type SampleItemState,
} from "./sample-progress.ts";
import {
  answerAdequate,
  enabledFields,
  workedExampleAnswers,
} from "./enabled-sample.ts";

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

function item(
  id: string,
  status: SampleItemState["status"],
  allowsNa = false,
  naReason = "",
): SampleItemState {
  return { id, status, allowsNa, naReason };
}

/* The enabled ten-item sample in source/display order (no N/A items configured). */
function tenItemSample(): SampleItemState[] {
  return enabledFields.map((field) => item(field.id, "not_started", field.allowsNa));
}

check(
  "enabled sample is the ten selected IDs in exact order",
  enabledFields.map((field) => field.id),
  ["CP-01", "CP-07", "CP-13", "SC-03", "CP-16", "Q-BUS-01", "Q-BUS-03", "Q-RISK-01", "Q-FIN-02", "Q-FIN-03"],
);

check(
  "enabled sample sections group identity, financial facts, business, risk/outlook",
  [...new Set(enabledFields.map((field) => field.sectionTitle))],
  ["Company details", "Financial position", "Business", "Risk and outlook"],
);

/* Fixed case A: all not started -> 0 / 10 = 0.00%; ten gaps in source order. */
{
  const s = summarizeSampleProgress(tenItemSample());
  check("fixed A: kind", s.kind, "ok");
  if (s.kind === "ok") {
    check("fixed A: 0 / 10 counted", [s.ready, s.applicable], [0, 10]);
    check("fixed A: display 0.00%", s.displayPercent, "0.00");
    check("fixed A: ten ordered gaps", s.gaps.map((gap) => gap.id), [
      "CP-01", "CP-07", "CP-13", "SC-03", "CP-16", "Q-BUS-01", "Q-BUS-03", "Q-RISK-01", "Q-FIN-02", "Q-FIN-03",
    ]);
  }
}

/*
 * Worked example (fixed arithmetic): CP-01, CP-07, CP-13, SC-03, CP-16,
 * Q-BUS-01, Q-FIN-03 ready; Q-BUS-03 draft; Q-RISK-01 and Q-FIN-02 not
 * started -> 7 / 10 = 70.00% with exactly those three gaps.
 */
{
  const worked = workedExampleAnswers();
  const states: SampleItemState[] = enabledFields.map((field) => ({
    id: field.id,
    status: worked[field.id].status,
    allowsNa: field.allowsNa,
    naReason: worked[field.id].naReason,
  }));
  check(
    "worked example: every ready item has an adequate answer",
    enabledFields
      .filter((field) => worked[field.id].status === "ready")
      .map((field) => answerAdequate(field, worked[field.id])),
    [true, true, true, true, true, true, true],
  );
  const s = summarizeSampleProgress(states);
  check("worked example: kind", s.kind, "ok");
  if (s.kind === "ok") {
    check("worked example: 7 / 10 counted", [s.ready, s.applicable], [7, 10]);
    check("worked example: display 70.00%", s.displayPercent, "70.00");
    check("worked example: exactly three gaps", s.gaps, [
      { id: "Q-BUS-03", status: "in_progress" },
      { id: "Q-RISK-01", status: "not_started" },
      { id: "Q-FIN-02", status: "not_started" },
    ]);
  }
}

/* Fixed case B: 3 ready, 7 not started -> 30.00%. */
{
  const items = tenItemSample();
  items[0] = item("CP-01", "ready");
  items[1] = item("CP-07", "ready");
  items[2] = item("CP-13", "ready");
  const s = summarizeSampleProgress(items);
  if (s.kind === "ok") {
    check("fixed B: 3 / 10 counted", [s.ready, s.applicable], [3, 10]);
    check("fixed B: display 30.00%", s.displayPercent, "30.00");
  }
}

/* Invalid N/A cannot shrink the denominator (generic rule, guarded item). */
{
  const s = summarizeSampleProgress([
    item("A-01", "ready"),
    item("A-02", "in_progress"),
    item("A-03", "na", true, ""),
    item("A-04", "ready"),
  ]);
  if (s.kind === "ok") {
    check("invalid N/A: valid N/A count", s.validNa, 0);
    check("invalid N/A: denominator stays 4", s.applicable, 4);
    check("invalid N/A: display 50.00%", s.displayPercent, "50.00");
    check("invalid N/A: gaps include the invalid na in order", s.gaps, [
      { id: "A-02", status: "in_progress" },
      { id: "A-03", status: "na" },
    ]);
  }
}

/* A whitespace-only reason is not a recorded reason. */
{
  const probe = item("A-03", "na", true, "   ");
  check("whitespace N/A reason is invalid", isValidNa(probe), false);
}

/* N/A on an item without an applicability path is invalid even with a reason. */
{
  const s = summarizeSampleProgress([
    item("A-01", "na", false, "Not applicable to this issuer"),
    item("A-02", "na", true, "Condition not met"),
    item("A-03", "in_progress"),
  ]);
  if (s.kind === "ok") {
    check("na without path: only the valid N/A excluded (2, not 1)", [s.validNa, s.applicable], [1, 2]);
    check("na without path: gap present", s.gaps, [
      { id: "A-01", status: "na" },
      { id: "A-03", status: "in_progress" },
    ]);
  }
}

/* Synthetic all-N/A ("Not applicable") and empty ("configuration error"). */
{
  const all = summarizeSampleProgress([
    item("B-01", "na", true, "Condition not met"),
    item("B-02", "na", true, "Condition also not met"),
  ]);
  check("synthetic all N/A: kind", all.kind, "not_applicable");
  check("synthetic all N/A: zero gaps", all.gaps, []);
  const empty = summarizeSampleProgress([]);
  check("empty sample: kind", empty.kind, "configuration_error");
  check("empty sample: zero gaps", empty.gaps, []);
}

/* Rounding happens only at display; a fully ready sample shows 100.00. */
{
  const all = tenItemSample().map((i) => ({ ...i, status: "ready" as const }));
  const done = summarizeSampleProgress(all);
  check("all ready: kind", done.kind, "ok");
  if (done.kind === "ok") {
    check("all ready: display 100.00%", done.displayPercent, "100.00");
    check("all ready: no gaps", done.gaps, []);
  }
  const third = summarizeSampleProgress([
    item("C-01", "ready"),
    item("C-02", "in_progress"),
    item("C-03", "in_progress"),
  ]);
  if (third.kind === "ok") {
    check("rounding: 1/3 displays 33.33", third.displayPercent, "33.33");
  }
}

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} check(s) FAILED:\n\n${failures.join("\n\n")}`);
  throw new Error("sample-progress fixtures failed");
}
console.log(`sample-progress fixtures: ${passed} check(s) passed, 0 failed`);
