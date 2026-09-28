/*
 * Built-in Node fixtures for the persisted-assessment pure helpers
 * (src/lib/app-data/answer-state.ts). Same self-running convention as
 * sample-progress.test.ts: no framework, exits non-zero on failure, and the
 * file is typechecked by `npm run build`.
 *
 * Run with: npm test
 */

import {
  answerAdequate,
  demoFields,
  initialDemoAnswer,
  workedExampleAnswers,
  type DemoAnswer,
  type DemoFieldSpec,
} from "../demo-sample.ts";
import { summarizeSampleProgress, type SampleItemState } from "../sample-progress.ts";
import {
  answerDirty,
  answerWriteIssue,
  applyAnswerUpdate,
  dateValueIssue,
  demoAnswerToRowFields,
  rowToDemoAnswer,
} from "./answer-state.ts";
import {
  fetchChecklistFromRows,
} from "./checklist.ts";
import { EXPECTED_SAMPLE_VERSION } from "./types.ts";
import type { AnswerRow, ChecklistItemRow } from "./types.ts";

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

function checkTrue(label: string, actual: boolean): void {
  check(label, actual, true);
}

// ---------------------------------------------------------------------------
// Control parity: the four demo fields behave like the shared field specs.
// ---------------------------------------------------------------------------

const fields: DemoFieldSpec[] = JSON.parse(JSON.stringify(demoFields)) as DemoFieldSpec[];

check(
  "demo fields load with the four fixed IDs",
  fields.map((f) => f.id),
  ["CP-07", "Q-DIR-01", "Q-ISS-01", "Q-OFR-03"],
);

// ---------------------------------------------------------------------------
// applyAnswerUpdate parity with the review preview rules (verified against the
// same behavioural cases the preview exercises).
// ---------------------------------------------------------------------------

{
  const cp07 = fields[0];
  const qdir = fields[1];

  check(
    "typed date advances not_started to in_progress",
    applyAnswerUpdate(cp07, initialDemoAnswer(), { dateValue: "2001-02-03" }, true).status,
    "in_progress",
  );
  check(
    "readiness change alone keeps not_started",
    applyAnswerUpdate(cp07, initialDemoAnswer(), { dateValue: "2001-02-03" }, false).status,
    "not_started",
  );
  check(
    "losing the date behind a ready item demotes to in_progress",
    applyAnswerUpdate(cp07, { ...initialDemoAnswer(), status: "ready", dateValue: "2001-02-03" }, { dateValue: "" }, true).status,
    "in_progress",
  );
  check(
    "Yes without details cannot stay ready",
    applyAnswerUpdate(
      qdir,
      { ...initialDemoAnswer(), status: "ready", yesNo: "yes", text: "details" },
      { text: "" },
      true,
    ).status,
    "in_progress",
  );
  check(
    "recorded No stays ready",
    applyAnswerUpdate(
      qdir,
      { ...initialDemoAnswer(), status: "ready", yesNo: "no" },
      {},
      false,
    ).status,
    "ready",
  );
  checkTrue(
    "recorded No is adequate by itself",
    answerAdequate(qdir, { ...initialDemoAnswer(), yesNo: "no" }),
  );
}

// ---------------------------------------------------------------------------
// Row <-> draft mapping, round trips, and the worked example through the
// persisted shape (2/3 = 66.67 case stays intact end to end).
// ---------------------------------------------------------------------------

function row(
  itemId: string,
  fields_: Partial<AnswerRow> = {},
): AnswerRow {
  return {
    company_id: "c1",
    item_id: itemId,
    status: "not_started",
    answer_date: null,
    answer_bool: null,
    answer_text: null,
    na_reason: null,
    updated_at: "2026-09-27T00:00:00Z",
    ...fields_,
  };
}

{
  const worked = workedExampleAnswers();
  const controls = new Map(fields.map((f) => [f.id as string, f.control]));
  const rows = fields.map((f) => {
    const w = demoAnswerToRowFields(f.control, worked[f.id as keyof typeof worked] as DemoAnswer);
    return row(f.id, { ...w, status: w.status });
  });

  check(
    "worked example rows store typed values",
    rows.map((r) => [r.item_id, r.status, r.answer_date, r.answer_bool, r.answer_text === null, r.na_reason === null]),
    [
      ["CP-07", "ready", "1970-01-01", null, true, true],
      ["Q-DIR-01", "ready", null, false, true, true],
      ["Q-ISS-01", "in_progress", null, null, false, true],
      ["Q-OFR-03", "na", null, null, true, false],
    ],
  );

  const states: SampleItemState[] = rows.map((r) => {
    const draft = rowToDemoAnswer(r);
    const field = fields.find((f) => f.id === r.item_id)!;
    return { id: r.item_id, status: draft.status, allowsNa: field.allowsNa, naReason: draft.naReason };
  });
  const summary = summarizeSampleProgress(states);
  check(
    "worked example scores 2/3 = 66.67% through the persisted shape",
    summary.kind === "ok"
      ? [summary.ready, summary.applicable, summary.displayPercent, summary.gaps]
      : summary,
    [2, 3, "66.67", [{ id: "Q-ISS-01", status: "in_progress" }]],
  );

  // Round trip: every worked-example answer maps to row fields and back unchanged.
  const roundTrips = rows.every((r) => {
    const field = fields.find((f) => f.id === r.item_id)!;
    const draft: DemoAnswer = worked[r.item_id as keyof typeof worked];
    return !answerDirty(rowToDemoAnswer(r), draft) && controls.get(r.item_id) === field.control;
  });
  checkTrue("row<->draft round trip is lossless for the worked example", roundTrips);
}

{
  // Dirty detection across each field of the draft.
  const base: DemoAnswer = initialDemoAnswer();
  const saved = rowToDemoAnswer(row("Q-ISS-01", { status: "in_progress", answer_text: "draft" }));
  checkTrue("same draft is not dirty", !answerDirty({ ...base, status: "in_progress", text: "draft" }, saved));
  checkTrue("status change is dirty", answerDirty({ ...base, status: "ready", text: "draft" }, saved));
  checkTrue("text change is dirty", answerDirty({ ...base, status: "in_progress", text: "draft2" }, saved));
  checkTrue("changed draft vs missing row is dirty", answerDirty({ ...base, status: "in_progress" }, rowToDemoAnswer(null)));
  checkTrue("empty initial draft vs missing row is not dirty", !answerDirty(base, rowToDemoAnswer(null)));
}

// ---------------------------------------------------------------------------
// Date guards: infinity, impossible calendar dates, out-of-range years.
// ---------------------------------------------------------------------------

check("normal date passes", dateValueIssue("1975-06-15"), null);
check("infinity rejected", dateValueIssue("infinity") !== null, true);
check("9999-99-99 rejected", dateValueIssue("9999-99-99") !== null, true);
check("31 April rejected", dateValueIssue("2026-04-31") !== null, true);
check("29 Feb on non-leap year rejected", dateValueIssue("2025-02-29") !== null, true);
check("29 Feb on leap year accepted", dateValueIssue("2024-02-29"), null);
check("year 1000 out of range", dateValueIssue("1000-01-01") !== null, true);
check("year 3100 out of range", dateValueIssue("3100-01-01") !== null, true);
check("empty date is not an issue", dateValueIssue(""), null);

// ---------------------------------------------------------------------------
// Save validation mirrors the database trigger rules.
// ---------------------------------------------------------------------------

{
  const cp07 = fields[0];
  const qdir = fields[1];
  const qofr = fields[3];

  check("ready date item without date is a save issue", answerWriteIssue(cp07, { ...initialDemoAnswer(), status: "ready" }) !== null, true);
  check("ready date item with date is fine", answerWriteIssue(cp07, { ...initialDemoAnswer(), status: "ready", dateValue: "1999-12-31" }), null);
  check("na on a non-N/A item is a save issue", answerWriteIssue(qdir, { ...initialDemoAnswer(), status: "na", naReason: "r" }) !== null, true);
  check("na without reason is a save issue", answerWriteIssue(qofr, { ...initialDemoAnswer(), status: "na", naReason: "" }) !== null, true);
  check("na with reason is fine", answerWriteIssue(qofr, { ...initialDemoAnswer(), status: "na", naReason: "domestic listing" }), null);
  check("bad date on a draft is a save issue", answerWriteIssue(cp07, { ...initialDemoAnswer(), status: "in_progress", dateValue: "infinity" }) !== null, true);
  check("partial yes/no draft saves as in_progress", answerWriteIssue(qdir, { ...initialDemoAnswer(), status: "in_progress", yesNo: "yes", text: "" }), null);
}

// ---------------------------------------------------------------------------
// Checklist validation against the seeded provisional sample.
// ---------------------------------------------------------------------------

function itemRow(id: string, field_type: ChecklistItemRow["field_type"], overrides: Partial<ChecklistItemRow> = {}): ChecklistItemRow {
  return {
    id,
    title: `t-${id}`,
    question_text: `q-${id}`,
    field_type,
    allows_na: field_type === "text_na",
    party_key: "company",
    phase_order: 1,
    display_order: 1,
    source_reference: "src",
    sample_version: EXPECTED_SAMPLE_VERSION,
    created_at: "2026-09-27T00:00:00Z",
    ...overrides,
  };
}

{
  const seeded = [
    itemRow("CP-07", "date", { display_order: 1 }),
    itemRow("Q-DIR-01", "yes_no_details", { display_order: 2 }),
    itemRow("Q-ISS-01", "narrative", { display_order: 3 }),
    itemRow("Q-OFR-03", "text_na", { display_order: 4 }),
  ];
  const result = fetchChecklistFromRows(seeded);
  checkTrue("seeded sample validates", result.ok);
  if (result.ok) {
    check(
      "validated items keep ids/prompts mapping and order",
      result.items.map((i) => [i.id, i.control, i.allowsNa]),
      [
        ["CP-07", "date", false],
        ["Q-DIR-01", "yes-no", false],
        ["Q-ISS-01", "narrative", false],
        ["Q-OFR-03", "conditional-text", true],
      ],
    );
  }

  checkTrue(
    "wrong sample_version is rejected",
    !fetchChecklistFromRows([itemRow("CP-07", "date", { sample_version: "other" })]).ok,
  );
  checkTrue(
    "unknown item id is rejected",
    !fetchChecklistFromRows(seeded.map((r, i) => (i === 0 ? itemRow("Q-XXX-99", "date") : r))).ok,
  );
  checkTrue(
    "field-type change is rejected",
    !fetchChecklistFromRows(seeded.map((r, i) => (i === 0 ? itemRow("CP-07", "narrative") : r))).ok,
  );
  checkTrue(
    "missing item is rejected",
    !fetchChecklistFromRows(seeded.slice(0, 3)).ok,
  );
  checkTrue(
    "extra item is rejected",
    !fetchChecklistFromRows([...seeded, itemRow("Q-EXTRA", "narrative", { display_order: 5 })]).ok,
  );
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED:\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  throw new Error("answer-state fixtures failed");
}
console.log(`\nAll ${passed} answer-state checks passed.`);
