/*
 * Built-in Node fixtures for the pure sample-progress calculator.
 *
 * Expected values come from the fixed test table in the B02 sample and
 * acceptance proposal (docs/sample-and-acceptance.md in the ibuka-b02-sample
 * worktree) — they are stated independently of the implementation.
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
  demoFields,
  workedExampleAnswers,
} from "./demo-sample.ts";

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

/* The proposed four-item sample in source/display order. */
function fourItemSample(): SampleItemState[] {
  return [
    item("CP-07", "not_started"),
    item("Q-DIR-01", "not_started"),
    item("Q-ISS-01", "not_started"),
    item("Q-OFR-03", "not_started", true, ""),
  ];
}

/* B02 fixed case 1: CP-07 and Q-DIR-01 ready (the latter answered No),
 * Q-ISS-01 in progress, Q-OFR-03 valid N/A -> 2 / 3 = 66.67%; one gap. */
{
  const items = fourItemSample();
  items[0] = item("CP-07", "ready");
  items[1] = item("Q-DIR-01", "ready");
  items[2] = item("Q-ISS-01", "in_progress");
  items[3] = item("Q-OFR-03", "na", true, "Domestic (NSE) listing only");
  const s = summarizeSampleProgress(items);
  check("B02 fixed 1: kind", s.kind, "ok");
  if (s.kind === "ok") {
    check("B02 fixed 1: 2 / 3 counted", [s.ready, s.applicable], [2, 3]);
    check("B02 fixed 1: display 66.67%", s.displayPercent, "66.67");
    check("B02 fixed 1: one gap (Q-ISS-01)", s.gaps, [
      { id: "Q-ISS-01", status: "in_progress" },
    ]);
  }
}

/* B02 fixed case 2: all not started -> 0 / 4 = 0.00%; four gaps in
 * source order. */
{
  const s = summarizeSampleProgress(fourItemSample());
  check("B02 fixed 2: kind", s.kind, "ok");
  if (s.kind === "ok") {
    check("B02 fixed 2: 0 / 4 counted", [s.ready, s.applicable], [0, 4]);
    check("B02 fixed 2: display 0.00%", s.displayPercent, "0.00");
    check("B02 fixed 2: four ordered gaps", s.gaps, [
      { id: "CP-07", status: "not_started" },
      { id: "Q-DIR-01", status: "not_started" },
      { id: "Q-ISS-01", status: "not_started" },
      { id: "Q-OFR-03", status: "not_started" },
    ]);
  }
}

/* Invalid N/A cannot shrink the denominator: Q-OFR-03 set to N/A without a
 * recorded reason stays in the denominator (applicable 4, not 3) and is a
 * gap alongside Q-ISS-01 in progress. 2 ready / 4 = 50.00%. */
{
  const items = fourItemSample();
  items[0] = item("CP-07", "ready");
  items[1] = item("Q-DIR-01", "ready");
  items[2] = item("Q-ISS-01", "in_progress");
  items[3] = item("Q-OFR-03", "na", true, "");
  const s = summarizeSampleProgress(items);
  check("invalid N/A: kind", s.kind, "ok");
  if (s.kind === "ok") {
    check("invalid N/A: valid N/A count", s.validNa, 0);
    check("invalid N/A: denominator stays 4", s.applicable, 4);
    check("invalid N/A: display 50.00%", s.displayPercent, "50.00");
    check("invalid N/A: gaps include the invalid na in order", s.gaps, [
      { id: "Q-ISS-01", status: "in_progress" },
      { id: "Q-OFR-03", status: "na" },
    ]);
  }
}

/* A whitespace-only reason is not a recorded reason. */
{
  const probe = item("Q-OFR-03", "na", true, "   ");
  check("whitespace N/A reason is invalid", isValidNa(probe), false);
}

/* N/A on an item without a proposed applicability path is invalid even with
 * a reason: only Q-OFR-03's valid N/A is excluded (denominator 3, not 2),
 * and the pathless na stays in the denominator as a gap. */
{
  const items = fourItemSample();
  items[2] = item("Q-ISS-01", "na", false, "Not applicable to this issuer");
  items[3] = item("Q-OFR-03", "na", true, "Domestic listing only");
  const s = summarizeSampleProgress(items);
  check("na without path: kind", s.kind, "ok");
  if (s.kind === "ok") {
    check("na without path: only the valid N/A excluded (3, not 2)", [
      s.validNa,
      s.applicable,
    ], [1, 3]);
    check("na without path: gap present", s.gaps, [
      { id: "CP-07", status: "not_started" },
      { id: "Q-DIR-01", status: "not_started" },
      { id: "Q-ISS-01", status: "na" },
    ]);
  }
}

/* B02 synthetic three-item conditional fixture: one ready, one valid N/A,
 * one in progress -> 1 / 2 = 50.00%; one gap. */
{
  const s = summarizeSampleProgress([
    item("A-01", "ready"),
    item("A-02", "na", true, "Condition not met"),
    item("A-03", "in_progress"),
  ]);
  check("B02 synthetic 3: kind", s.kind, "ok");
  if (s.kind === "ok") {
    check("B02 synthetic 3: 1 / 2 counted", [s.ready, s.applicable], [1, 2]);
    check("B02 synthetic 3: display 50.00%", s.displayPercent, "50.00");
    check("B02 synthetic 3: one gap", s.gaps, [{ id: "A-03", status: "in_progress" }]);
  }
}

/* B02 synthetic two-item conditional fixture: both valid N/A -> Not
 * applicable; no percentage; zero gaps. (Unreachable from the four-item UI,
 * where only Q-OFR-03 has the N/A path; covered here per B02.) */
{
  const s = summarizeSampleProgress([
    item("B-01", "na", true, "Condition not met"),
    item("B-02", "na", true, "Condition also not met"),
  ]);
  check("B02 synthetic 2 all N/A: kind", s.kind, "not_applicable");
  check("B02 synthetic 2 all N/A: zero gaps", s.gaps, []);
}

/* B02 empty sample: configuration error, never a percentage or 100%. */
{
  const s = summarizeSampleProgress([]);
  check("B02 empty: kind", s.kind, "configuration_error");
  check("B02 empty: zero gaps", s.gaps, []);
}

/* Rounding happens only at display: thirds display as 33.33 / 66.67, and a
 * fully ready four-item sample shows 100.00 with no gaps. */
{
  const third = summarizeSampleProgress([
    item("C-01", "ready"),
    item("C-02", "in_progress"),
    item("C-03", "in_progress"),
  ]);
  if (third.kind === "ok") {
    check("rounding: 1/3 displays 33.33", third.displayPercent, "33.33");
  }
  const all = fourItemSample().map((i) => ({ ...i, status: "ready" as const }));
  const done = summarizeSampleProgress(all);
  check("all ready: kind", done.kind, "ok");
  if (done.kind === "ok") {
    check("all ready: display 100.00%", done.displayPercent, "100.00");
    check("all ready: no gaps", done.gaps, []);
  }
}

/* Shipped "Load worked example" data must reproduce the B02 fixed case:
 * 2 / 3 = 66.67% with exactly Q-ISS-01 as the gap. Also guards that both
 * ready items carry adequate answers (the UI would otherwise demote them)
 * and that the Q-OFR-03 N/A is valid (reason recorded). */
{
  const worked = workedExampleAnswers();
  const states: SampleItemState[] = demoFields.map((field) => ({
    id: field.id,
    status: worked[field.id].status,
    allowsNa: field.allowsNa,
    naReason: worked[field.id].naReason,
  }));
  check(
    "worked example: every ready item has an adequate answer",
    demoFields
      .filter((field) => worked[field.id].status === "ready")
      .map((field) => answerAdequate(field, worked[field.id])),
    [true, true],
  );
  const naItems = states.filter((state) => state.status === "na");
  check("worked example: the N/A item is valid", naItems.map(isValidNa), [true]);
  const s = summarizeSampleProgress(states);
  check("worked example: kind", s.kind, "ok");
  if (s.kind === "ok") {
    check("worked example: 2 / 3 counted", [s.ready, s.applicable], [2, 3]);
    check("worked example: display 66.67%", s.displayPercent, "66.67");
    check("worked example: exactly Q-ISS-01 as the gap", s.gaps, [
      { id: "Q-ISS-01", status: "in_progress" },
    ]);
  }
}

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} check(s) FAILED:\n\n${failures.join("\n\n")}`);
  throw new Error("sample-progress fixtures failed");
}
console.log(`sample-progress fixtures: ${passed} check(s) passed, 0 failed`);
