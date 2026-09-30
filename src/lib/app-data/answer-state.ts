/*
 * Pure mapping helpers between the persisted assessment rows (assessment_answer)
 * and the SampleAnswer shape used by the shared controls/calculator, plus the
 * client-side mirror of the database answer-validity rules. No React/DOM/IO —
 * covered by Node fixtures in answer-state.test.ts.
 *
 * Answer-first state transitions (UX contract, 30 September 2026):
 *  - typing into a not-started item makes it a Draft (in_progress);
 *  - typing into an item that was marked ready for review returns it to Draft
 *    so a changed answer is always reviewed again;
 *  - "Ready for review" is only offered when the typed answer is adequate
 *    (the database enforces the same gate);
 *  - "Not applicable" (configured items only) keeps the typed data so undoing
 *    applicability loses nothing.
 */

import {
  answerAdequate,
  dateValueIssue,
  initialSampleAnswer,
  numberValueIssue,
  parseNumberValue,
  type EnabledFieldSpec,
  type SampleAnswer,
  type SampleControl,
} from "../enabled-sample.ts";
import type { SampleReadinessStatus } from "../sample-progress.ts";
import type { AnswerRow, AnswerStatusValue } from "./types.ts";

export type { SampleAnswer, SampleControl };

/**
 * Structural field spec for the persisted assessment: ids are validated
 * server-supplied strings, not compile-time unions.
 */
export interface AssessmentFieldSpec {
  id: string;
  control: SampleControl;
  allowsNa: boolean;
  selectOptions?: string[];
}

/** Fields of an assessment_answer row a client may supply (id columns aside). */
export interface AnswerWriteFields {
  status: AnswerStatusValue;
  answer_date: string | null;
  answer_bool: boolean | null;
  answer_text: string | null;
  answer_number: number | null;
  answer_select: string | null;
  na_reason: string | null;
}

/*
 * Typed-input changes advance a not-started item to Draft, and a Ready that
 * loses its adequate typed answer returns to Draft so a saved state can never
 * overstate the recorded entry.
 */
export function applyAnswerUpdate(
  field: AssessmentFieldSpec,
  previous: SampleAnswer,
  patch: Partial<SampleAnswer>,
  typed: boolean,
): SampleAnswer {
  const next: SampleAnswer = { ...previous, ...patch };
  const adequate = answerAdequate(field, next);
  if (next.status === "ready" && !adequate) {
    next.status = "in_progress";
  } else if (typed && (next.status === "not_started" || next.status === "ready")) {
    next.status = "in_progress";
  }
  return next;
}

/** Server row -> shared answer shape (missing rows use the initial answer). */
export function rowToSampleAnswer(row: AnswerRow | null | undefined): SampleAnswer {
  if (!row) return initialSampleAnswer();
  return {
    status: row.status as SampleReadinessStatus,
    text: row.answer_text ?? "",
    dateValue: row.answer_date ?? "",
    numberValue: row.answer_number === null || row.answer_number === undefined ? "" : String(row.answer_number),
    selectValue: row.answer_select ?? "",
    yesNo:
      row.answer_bool === null || row.answer_bool === undefined
        ? ""
        : row.answer_bool
          ? "yes"
          : "no",
    naReason: row.na_reason ?? "",
  };
}

/*
 * Sample answer -> writable row fields. Empty strings become NULL; typed values
 * outside the control's shape are never sent (the database would reject them).
 * Typing into a control never stores values in another control's columns.
 */
export function sampleAnswerToRowFields(
  control: SampleControl,
  answer: SampleAnswer,
): AnswerWriteFields {
  const text = answer.text === "" ? null : answer.text;
  return {
    status: answer.status,
    answer_date:
      (control === "date" || control === "currency_date") && answer.dateValue !== ""
        ? answer.dateValue
        : null,
    answer_bool: control === "yes-no" && answer.yesNo !== "" ? answer.yesNo === "yes" : null,
    answer_text: control === "text" || control === "narrative" || control === "yes-no" || control === "conditional-text" ? text : null,
    answer_number:
      control === "currency" || control === "currency_date"
        ? (parseNumberValue(answer.numberValue) ?? null)
        : null,
    answer_select: control === "select" && answer.selectValue !== "" ? answer.selectValue : null,
    na_reason: control === "conditional-text" && answer.naReason !== "" ? answer.naReason : null,
  };
}

/*
 * Number-equivalence for dirty detection. The database canonicalises the
 * typed amount (numeric column), so an acknowledged row round-trips
 * "1.00" as 1 -> "1". Comparing raw strings would re-dirty such an item
 * forever (endless rewrites of an already-saved value). Two amount strings
 * are therefore equivalent when they are equal raw, OR when both parse as
 * the same valid finite non-negative number. Invalid/empty strings never
 * become equivalent to anything else, so a draft needing validation stays
 * visibly dirty and distinguishable.
 */
function numberValueEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  const pa = parseNumberValue(a);
  const pb = parseNumberValue(b);
  return pa !== null && pb !== null && pa === pb;
}

/*
 * Strict TEXTUAL change detection between two draft snapshots (D2,
 * 30 September 2026). This is what governs whether a UI interaction is a
 * meaningful change: it must be textual so a saved "5000" followed by typing
 * "5000 " keeps the typed string and re-enters the save queue. Numeric
 * semantic equality belongs ONLY to the draft-vs-saved acknowledgement
 * comparison (answerDirty below) so an acknowledged "1.00" vs saved 1
 * settles without endless rewrites.
 */
export function answerTextChanged(a: SampleAnswer, b: SampleAnswer): boolean {
  return (
    a.status !== b.status ||
    a.dateValue !== b.dateValue ||
    a.numberValue !== b.numberValue ||
    a.selectValue !== b.selectValue ||
    a.yesNo !== b.yesNo ||
    a.text !== b.text ||
    a.naReason !== b.naReason
  );
}

/** Whether the draft differs from the server-confirmed snapshot for one item. */
export function answerDirty(draft: SampleAnswer, saved: SampleAnswer): boolean {
  return (
    draft.status !== saved.status ||
    draft.dateValue !== saved.dateValue ||
    !numberValueEquivalent(draft.numberValue, saved.numberValue) ||
    draft.selectValue !== saved.selectValue ||
    draft.yesNo !== saved.yesNo ||
    draft.text !== saved.text ||
    draft.naReason !== saved.naReason
  );
}

/*
 * Client-side save validation for one item, mirroring the database trigger:
 * returns a user-facing issue string, or null when the row is acceptable.
 * Invalid drafts show validation and are never posted as invalid rows; the
 * database remains the enforcer either way.
 */
export function answerWriteIssue(
  field: AssessmentFieldSpec,
  answer: SampleAnswer,
): string | null {
  if (field.control === "date" || field.control === "currency_date") {
    const dateIssue = dateValueIssue(answer.dateValue);
    if (dateIssue) return `${field.id}: ${dateIssue}`;
  }
  if (field.control === "currency" || field.control === "currency_date") {
    const numberIssue = numberValueIssue(answer.numberValue);
    if (numberIssue) return `${field.id}: ${numberIssue}`;
  }
  if (field.control === "select" && answer.selectValue !== "") {
    const options = field.selectOptions ?? [];
    if (!options.includes(answer.selectValue)) {
      return `${field.id}: choose one of the offered options (${options.join(", ")}).`;
    }
  }
  if (answer.status === "ready" && !answerAdequate(field, answer)) {
    return `${field.id} cannot be marked ready for review without an adequate recorded answer.`;
  }
  if (answer.status === "na") {
    if (!field.allowsNa) {
      return `N/A is not offered for ${field.id}.`;
    }
    if (answer.naReason.trim() === "") {
      return `Marking ${field.id} not applicable requires a recorded reason.`;
    }
  }
  return null;
}

/** Round-trip helper used after server confirmation: row -> equality-safe draft. */
export function rowToSavedDraft(row: AnswerRow): SampleAnswer {
  return rowToSampleAnswer(row);
}

export type { EnabledFieldSpec };
