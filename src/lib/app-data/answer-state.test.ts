/*
 * Built-in Node fixtures for the persisted-assessment pure helpers
 * (src/lib/app-data/answer-state.ts) over the enabled ten-item sample. Same
 * self-running convention as sample-progress.test.ts: no framework, exits
 * non-zero on failure, and the file is typechecked by `npm run build`.
 *
 * Run with: npm test
 */

import {
  answerAdequate,
  dateValueIssue,
  enabledFields,
  initialSampleAnswer,
  missingForReview,
  numberValueIssue,
  workedExampleAnswers,
  type SampleAnswer,
} from "../enabled-sample.ts";
import { summarizeSampleProgress, type SampleItemState } from "../sample-progress.ts";
import {
  answerDirty,
  answerTextChanged,
  answerWriteIssue,
  applyAnswerUpdate,
  rowToSampleAnswer,
  sampleAnswerToRowFields,
} from "./answer-state.ts";
import { fetchChecklistFromRows } from "./checklist.ts";
import { EXPECTED_SAMPLE_VERSION, type AnswerRow, type ChecklistItemRow } from "./types.ts";

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

const fieldById = Object.fromEntries(enabledFields.map((field) => [field.id, field]));

// ---------------------------------------------------------------------------
// Answer-first state transitions.
// ---------------------------------------------------------------------------

{
  const cp01 = fieldById["CP-01"];
  const cp07 = fieldById["CP-07"];
  const cp16 = fieldById["CP-16"];

  check(
    "typing into a not-started item makes it a Draft",
    applyAnswerUpdate(cp01, initialSampleAnswer(), { text: "Acme" }, true).status,
    "in_progress",
  );
  check(
    "editing a ready item returns it to Draft",
    applyAnswerUpdate(
      cp01,
      { ...initialSampleAnswer(), status: "ready", text: "Acme Ltd" },
      { text: "Acme Limited" },
      true,
    ).status,
    "in_progress",
  );
  check(
    "clearing the answer behind a ready item demotes to Draft",
    applyAnswerUpdate(
      cp07,
      { ...initialSampleAnswer(), status: "ready", dateValue: "2001-02-03" },
      { dateValue: "" },
      true,
    ).status,
    "in_progress",
  );
  check(
    "a state change alone does not advance not-started",
    applyAnswerUpdate(cp07, initialSampleAnswer(), { dateValue: "2001-02-03" }, false).status,
    "not_started",
  );
  check(
    "editing one part of currency_date keeps Draft status until saved",
    applyAnswerUpdate(
      cp16,
      { ...initialSampleAnswer(), status: "in_progress", numberValue: "10", dateValue: "" },
      { dateValue: "2026-06-30" },
      true,
    ).status,
    "in_progress",
  );
}

// ---------------------------------------------------------------------------
// Adequacy and missing-information hints per control.
// ---------------------------------------------------------------------------

{
  checkTrue("text adequate when non-empty", answerAdequate(fieldById["CP-01"], { ...initialSampleAnswer(), text: "Acme Ltd" }));
  checkTrue("date adequate when a valid date is entered", answerAdequate(fieldById["CP-07"], { ...initialSampleAnswer(), dateValue: "1995-06-15" }));
  checkTrue("select adequate when an option is chosen", answerAdequate(fieldById["CP-13"], { ...initialSampleAnswer(), selectValue: "SMEMS" }));
  checkTrue("currency adequate with a finite non-negative number", answerAdequate(fieldById["SC-03"], { ...initialSampleAnswer(), numberValue: "5000000" }));
  checkTrue("currency_date adequate with amount and as-at date", answerAdequate(fieldById["CP-16"], { ...initialSampleAnswer(), numberValue: "120000000", dateValue: "2025-12-31" }));
  checkTrue("narrative adequate when non-empty", answerAdequate(fieldById["Q-BUS-01"], { ...initialSampleAnswer(), text: "We manufacture components." }));

  check("currency NOT adequate when negative", answerAdequate(fieldById["SC-03"], { ...initialSampleAnswer(), numberValue: "-1" }), false);
  check("currency NOT adequate when non-numeric", answerAdequate(fieldById["SC-03"], { ...initialSampleAnswer(), numberValue: "lots" }), false);
  check("currency_date NOT adequate without the as-at date", answerAdequate(fieldById["CP-16"], { ...initialSampleAnswer(), numberValue: "10" }), false);
  check("select NOT adequate when unchosen", answerAdequate(fieldById["CP-13"], initialSampleAnswer()), false);
  check("whitespace-only narrative is NOT adequate", answerAdequate(fieldById["Q-RISK-01"], { ...initialSampleAnswer(), text: "   " }), false);

  check(
    "missing hint names the as-at date when only the amount is present",
    missingForReview(fieldById["CP-16"], { ...initialSampleAnswer(), numberValue: "10" }),
    "Enter the as-at date before marking it ready for review.",
  );
  check(
    "no missing hint when adequate",
    missingForReview(fieldById["CP-13"], { ...initialSampleAnswer(), selectValue: "MIMS" }),
    null,
  );
}

// ---------------------------------------------------------------------------
// Number and date guards (client mirrors of the database checks).
// ---------------------------------------------------------------------------

check("plain number passes", numberValueIssue("5000000.50"), null);
check("negative number rejected", numberValueIssue("-5") !== null, true);
check("non-finite rejected", numberValueIssue("1e999") !== null, true);
check("words rejected", numberValueIssue("five thousand") !== null, true);
check("empty number is not an issue (partial draft)", numberValueIssue(""), null);

check("normal date passes", dateValueIssue("1975-06-15"), null);
check("infinity rejected", dateValueIssue("infinity") !== null, true);
check("9999-99-99 rejected", dateValueIssue("9999-99-99") !== null, true);
check("31 April rejected", dateValueIssue("2026-04-31") !== null, true);
check("29 Feb on non-leap year rejected", dateValueIssue("2025-02-29") !== null, true);
check("29 Feb on leap year accepted", dateValueIssue("2024-02-29"), null);
check("year 1000 out of range", dateValueIssue("1000-01-01") !== null, true);
check("year 3100 out of range", dateValueIssue("3100-01-01") !== null, true);

// ---------------------------------------------------------------------------
// Row <-> draft mapping, round trips, and the worked example through the
// persisted shape (7/10 = 70.00 case stays intact end to end).
// ---------------------------------------------------------------------------

function row(itemId: string, fields_: Partial<AnswerRow> = {}): AnswerRow {
  return {
    company_id: "c1",
    item_id: itemId,
    status: "not_started",
    answer_date: null,
    answer_bool: null,
    answer_text: null,
    answer_number: null,
    answer_select: null,
    na_reason: null,
    updated_at: "2026-09-30T00:00:00Z",
    ...fields_,
  };
}

{
  const worked = workedExampleAnswers();
  const rows = enabledFields.map((field) =>
    row(field.id, sampleAnswerToRowFields(field.control, worked[field.id])),
  );

  check(
    "worked example rows store typed values in the right columns",
    rows.map((r) => [
      r.item_id,
      r.status,
      r.answer_text === null,
      r.answer_date,
      r.answer_number,
      r.answer_select,
    ]),
    [
      ["CP-01", "ready", false, null, null, null],
      ["CP-07", "ready", true, "1970-01-01", null, null],
      ["CP-13", "ready", true, null, null, "MIMS"],
      ["SC-03", "ready", true, null, 5000000, null],
      ["CP-16", "ready", true, "2025-12-31", 120000000, null],
      ["Q-BUS-01", "ready", false, null, null, null],
      ["Q-BUS-03", "in_progress", false, null, null, null],
      ["Q-RISK-01", "not_started", true, null, null, null],
      ["Q-FIN-02", "not_started", true, null, null, null],
      ["Q-FIN-03", "ready", false, null, null, null],
    ],
  );

  const states: SampleItemState[] = rows.map((r) => {
    const field = fieldById[r.item_id];
    const draft = rowToSampleAnswer(r);
    return { id: r.item_id, status: draft.status, allowsNa: field.allowsNa, naReason: draft.naReason };
  });
  const summary = summarizeSampleProgress(states);
  check(
    "worked example scores 7/10 = 70.00% through the persisted shape",
    summary.kind === "ok"
      ? [summary.ready, summary.applicable, summary.displayPercent, summary.gaps]
      : summary,
    [7, 10, "70.00", [
      { id: "Q-BUS-03", status: "in_progress" },
      { id: "Q-RISK-01", status: "not_started" },
      { id: "Q-FIN-02", status: "not_started" },
    ]],
  );

  // Round trip: every worked-example answer maps to row fields and back unchanged.
  const roundTrips = rows.every((r) => {
    const field = fieldById[r.item_id];
    return !answerDirty(rowToSampleAnswer(r), worked[r.item_id]) && field !== undefined;
  });
  checkTrue("row<->draft round trip is lossless for the worked example", roundTrips);
}

{
  // Dirty detection across each typed field of the draft.
  const base: SampleAnswer = initialSampleAnswer();
  const saved = rowToSampleAnswer(row("SC-03", { status: "in_progress", answer_number: 5 }));
  checkTrue("same draft is not dirty", !answerDirty({ ...base, status: "in_progress", numberValue: "5" }, saved));
  checkTrue("number change is dirty", answerDirty({ ...base, status: "in_progress", numberValue: "6" }, saved));
  checkTrue("status change is dirty", answerDirty({ ...base, status: "ready", numberValue: "5" }, saved));
  checkTrue("changed draft vs missing row is dirty", answerDirty({ ...base, status: "in_progress" }, rowToSampleAnswer(null)));
  checkTrue("empty initial draft vs missing row is not dirty", !answerDirty(base, rowToSampleAnswer(null)));
}

{
  /*
   * Acknowledged-row numeric canonicalisation (30 September 2026 regression):
   * the saved row stores answer_number as a canonical numeric, so "1.00"
   * round-trips as "1". Equal-number drafts must be CLEAN after the
   * acknowledgement — never endlessly rewritten — while invalid/empty
   * amounts stay distinguishable so validation remains visible.
   */
  const base: SampleAnswer = initialSampleAnswer();
  const savedOne = rowToSampleAnswer(row("SC-03", { status: "in_progress", answer_number: 1 }));
  checkTrue(
    "draft 1.00 vs acknowledged 1 is clean (numeric equivalence)",
    !answerDirty({ ...base, status: "in_progress", numberValue: "1.00" }, savedOne),
  );
  checkTrue(
    "draft 1.0 vs acknowledged 1 is clean",
    !answerDirty({ ...base, status: "in_progress", numberValue: "1.0" }, savedOne),
  );
  checkTrue(
    "draft with padded  1  vs acknowledged 1 is clean",
    !answerDirty({ ...base, status: "in_progress", numberValue: " 1 " }, savedOne),
  );
  checkTrue(
    "draft 1.01 vs acknowledged 1 is still dirty",
    answerDirty({ ...base, status: "in_progress", numberValue: "1.01" }, savedOne),
  );
  checkTrue(
    "empty draft vs acknowledged 1 is dirty (cleared answer)",
    answerDirty({ ...base, status: "in_progress", numberValue: "" }, savedOne),
  );
  const savedEmpty = rowToSampleAnswer(row("SC-03", { status: "in_progress", answer_number: null }));
  checkTrue(
    "invalid amount vs empty saved row stays dirty (validation stays visible)",
    answerDirty({ ...base, status: "in_progress", numberValue: "lots" }, savedEmpty),
  );
  checkTrue(
    "invalid amount vs empty draft-vs-row both empty is clean",
    !answerDirty({ ...base, status: "in_progress", numberValue: "" }, savedEmpty),
  );
  checkTrue(
    "negative amount is never equivalent to a saved canonical number",
    answerDirty({ ...base, status: "in_progress", numberValue: "-1" }, savedOne),
  );
  checkTrue(
    "full save->row->draft cycle of 1.00 is clean including the write fields",
    (() => {
      const draft: SampleAnswer = { ...base, status: "in_progress", numberValue: "1.00" };
      const persisted = row("SC-03", sampleAnswerToRowFields("currency", draft));
      return !answerDirty(draft, rowToSampleAnswer(persisted));
    })(),
  );
}

{
  /*
   * D2 (30 September 2026): UI-change detection is TEXTUAL against the prior
   * draft, so a saved "5000" followed by typing "5000 " keeps the typed
   * string and re-enters the save queue — while numeric semantic equality
   * stays confined to the draft-vs-saved acknowledgement comparison above.
   */
  const base: SampleAnswer = initialSampleAnswer();
  const prior: SampleAnswer = { ...base, status: "in_progress", numberValue: "5000" };
  checkTrue(
    "typing a trailing space is a textual UI change (re-enters the queue)",
    answerTextChanged({ ...prior, numberValue: "5000 " }, prior),
  );
  checkTrue(
    "typing a leading zero is a textual UI change",
    answerTextChanged({ ...prior, numberValue: "05000" }, prior),
  );
  checkTrue(
    "numerically equal but differently typed decimals are still textual changes",
    answerTextChanged({ ...prior, numberValue: "5000.00" }, prior),
  );
  checkTrue(
    "an identical draft is not a textual change",
    !answerTextChanged(prior, prior),
  );
  checkTrue(
    "invalid vs empty amounts are textually distinguishable",
    answerTextChanged({ ...prior, numberValue: "abc" }, { ...prior, numberValue: "" }),
  );
  checkTrue(
    "a status action alone is a textual change",
    answerTextChanged({ ...prior, status: "ready" }, prior),
  );
}

// ---------------------------------------------------------------------------
// Save validation mirrors the database trigger rules.
// ---------------------------------------------------------------------------

{
  const cp01 = fieldById["CP-01"];
  const cp07 = fieldById["CP-07"];
  const cp13 = fieldById["CP-13"];
  const sc03 = fieldById["SC-03"];
  const cp16 = fieldById["CP-16"];

  check("ready without an answer is a save issue", answerWriteIssue(cp01, { ...initialSampleAnswer(), status: "ready" }) !== null, true);
  check("ready with the answer is fine", answerWriteIssue(cp01, { ...initialSampleAnswer(), status: "ready", text: "Acme Ltd" }), null);
  check("bad date on a draft is a save issue", answerWriteIssue(cp07, { ...initialSampleAnswer(), status: "in_progress", dateValue: "infinity" }) !== null, true);
  check("negative amount is a save issue", answerWriteIssue(sc03, { ...initialSampleAnswer(), status: "in_progress", numberValue: "-3" }) !== null, true);
  check("select outside the offered options is a save issue", answerWriteIssue(cp13, { ...initialSampleAnswer(), status: "in_progress", selectValue: "GEMS" }) !== null, true);
  check("offered select option is fine", answerWriteIssue(cp13, { ...initialSampleAnswer(), status: "ready", selectValue: "SMEMS" }), null);
  check("currency_date ready without the as-at date is a save issue", answerWriteIssue(cp16, { ...initialSampleAnswer(), status: "ready", numberValue: "10" }) !== null, true);
  check("currency_date ready with amount and date is fine", answerWriteIssue(cp16, { ...initialSampleAnswer(), status: "ready", numberValue: "10", dateValue: "2026-06-30" }), null);
  check("na is not offered for the selected items", answerWriteIssue(cp01, { ...initialSampleAnswer(), status: "na", naReason: "r" }) !== null, true);
}

// ---------------------------------------------------------------------------
// Checklist validation against the generated enabled sample.
// ---------------------------------------------------------------------------

function itemRow(
  id: string,
  overrides: Partial<ChecklistItemRow> = {},
): ChecklistItemRow {
  const generated = enabledFields.find((field) => field.id === id);
  const fieldTypeByControl: Record<string, ChecklistItemRow["field_type"]> = {
    text: "text",
    date: "date",
    select: "select",
    currency: "currency",
    currency_date: "currency_date",
    narrative: "narrative",
    "yes-no": "yes_no_details",
    "conditional-text": "text_na",
  };
  return {
    id,
    title: generated?.shortLabel ?? `t-${id}`,
    question_text: generated?.prompt ?? `q-${id}`,
    field_type: generated ? fieldTypeByControl[generated.control] : "narrative",
    allows_na: generated?.allowsNa ?? false,
    party_key: "company",
    phase_order: 1,
    display_order: generated?.displayOrder ?? 99,
    source_reference: generated?.sourceRef ?? "src",
    select_options: generated?.selectOptions ?? null,
    sample_version: EXPECTED_SAMPLE_VERSION,
    is_active: true,
    created_at: "2026-09-30T00:00:00Z",
    ...overrides,
  };
}

{
  const seeded = enabledFields.map((field) => itemRow(field.id));
  const result = fetchChecklistFromRows(seeded);
  checkTrue("seeded sample validates", result.ok);
  if (result.ok) {
    check(
      "validated items keep ids/controls/options and order",
      result.items.map((i) => [i.id, i.control, i.allowsNa, i.selectOptions ?? null]),
      enabledFields.map((f) => [f.id, f.control, f.allowsNa, f.selectOptions ?? null]),
    );
    check(
      "validated items carry their section grouping",
      result.items.map((i) => i.sectionKey),
      ["company", "company", "company", "financial", "financial", "business", "business", "risk", "risk", "risk"],
    );
  }

  checkTrue(
    "wrong sample_version is rejected",
    !fetchChecklistFromRows(seeded.map((r) => (r.id === "CP-01" ? itemRow("CP-01", { sample_version: "other" }) : r))).ok,
  );
  checkTrue(
    "unknown item id is rejected",
    !fetchChecklistFromRows(seeded.map((r) => (r.id === "CP-01" ? itemRow("Q-XXX-99") : r))).ok,
  );
  checkTrue(
    "field-type change is rejected",
    !fetchChecklistFromRows(seeded.map((r) => (r.id === "SC-03" ? itemRow("SC-03", { field_type: "narrative" }) : r))).ok,
  );
  checkTrue(
    "select options change is rejected",
    !fetchChecklistFromRows(seeded.map((r) => (r.id === "CP-13" ? itemRow("CP-13", { select_options: ["MIMS", "GEMS"] }) : r))).ok,
  );
  checkTrue(
    "reworded prompt is rejected",
    !fetchChecklistFromRows(seeded.map((r) => (r.id === "CP-07" ? itemRow("CP-07", { question_text: "When was it formed?" }) : r))).ok,
  );
  checkTrue(
    "missing item is rejected",
    !fetchChecklistFromRows(seeded.slice(0, 9)).ok,
  );
  checkTrue(
    "extra item is rejected",
    !fetchChecklistFromRows([...seeded, itemRow("Q-EXTRA")]).ok,
  );
  // D5 (30 September 2026): the N/A offer is part of the reviewed sample
  // configuration — a server/config allows_na drift must reject, in either
  // direction (here the sample intentionally configures zero N/A items).
  checkTrue(
    "allows_na drift to true is rejected",
    !fetchChecklistFromRows(seeded.map((r) => (r.id === "Q-BUS-01" ? itemRow("Q-BUS-01", { allows_na: true }) : r))).ok,
  );
  checkTrue(
    "allows_na drift on a conditional-text item is rejected",
    !fetchChecklistFromRows(seeded.map((r) => (r.id === "Q-RISK-01" ? itemRow("Q-RISK-01", { allows_na: true }) : r))).ok,
  );
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED:\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  throw new Error("answer-state fixtures failed");
}
console.log(`\nAll ${passed} answer-state checks passed.`);
