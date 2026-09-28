/*
 * Pure mapping helpers between the persisted assessment rows (assessment_answer)
 * and the demo-answer shape used by the shared controls/calculator, plus the
 * client-side mirror of the database answer-validity rules. No React/DOM/IO —
 * covered by Node fixtures in answer-state.test.ts.
 *
 * Behavioural parity with the review preview is deliberate and tested: the
 * persisted assessment must preserve the exact current four sample IDs,
 * prompts, typed values, readiness states and demotion rules.
 */

import {
  answerAdequate,
  type DemoAnswer,
  type DemoControl,
} from "../demo-sample.ts";
import type { SampleReadinessStatus } from "../sample-progress.ts";
import type { AnswerRow, AnswerStatusValue } from "./types.ts";

export type { DemoAnswer };

/**
 * Structural field spec for the persisted assessment: ids are validated
 * server-supplied strings, not the compile-time demo union.
 */
export interface AssessmentFieldSpec {
  id: string;
  control: DemoControl;
  allowsNa: boolean;
}

/** Fields of an assessment_answer row a client may supply (id columns aside). */
export interface AnswerWriteFields {
  status: AnswerStatusValue;
  answer_date: string | null;
  answer_bool: boolean | null;
  answer_text: string | null;
  na_reason: string | null;
}

/*
 * Mirrors the review preview's applyUpdate: typed-input changes advance a
 * not-started item to in progress, and a Ready that loses its adequate typed
 * answer is demoted to in progress so a saved state can never overstate the
 * recorded entry.
 */
export function applyAnswerUpdate(
  field: AssessmentFieldSpec,
  previous: DemoAnswer,
  patch: Partial<DemoAnswer>,
  typed: boolean,
): DemoAnswer {
  const next: DemoAnswer = { ...previous, ...patch };
  const adequate = answerAdequate(field, next);
  if (next.status === "ready" && !adequate) {
    next.status = "in_progress";
  } else if (typed && next.status === "not_started") {
    next.status = "in_progress";
  }
  return next;
}

/** Server row -> shared demo-answer shape (missing rows use the initial answer). */
export function rowToDemoAnswer(row: AnswerRow | null | undefined): DemoAnswer {
  if (!row) {
    return {
      status: "not_started",
      dateValue: "",
      yesNo: "",
      text: "",
      naReason: "",
    };
  }
  return {
    status: row.status as SampleReadinessStatus,
    dateValue: row.answer_date ?? "",
    yesNo: row.answer_bool === null || row.answer_bool === undefined ? "" : row.answer_bool ? "yes" : "no",
    text: row.answer_text ?? "",
    naReason: row.na_reason ?? "",
  };
}

/*
 * Demo answer -> writable row fields. Empty strings become NULL; typed values
 * outside the control's shape are never sent (the database would reject them).
 * A hidden Yes/No details draft is preserved rather than silently dropped.
 */
export function demoAnswerToRowFields(
  control: DemoControl,
  answer: DemoAnswer,
): AnswerWriteFields {
  const text = answer.text === "" ? null : answer.text;
  return {
    status: answer.status,
    answer_date: control === "date" && answer.dateValue !== "" ? answer.dateValue : null,
    answer_bool:
      control === "yes-no" && answer.yesNo !== ""
        ? answer.yesNo === "yes"
        : null,
    answer_text: control === "date" ? null : text,
    na_reason: control === "conditional-text" && answer.naReason !== "" ? answer.naReason : null,
  };
}

/** Whether the draft differs from the server-confirmed snapshot for one item. */
export function answerDirty(draft: DemoAnswer, saved: DemoAnswer): boolean {
  return (
    draft.status !== saved.status ||
    draft.dateValue !== saved.dateValue ||
    draft.yesNo !== saved.yesNo ||
    draft.text !== saved.text ||
    draft.naReason !== saved.naReason
  );
}

/*
 * Client-side date guard mirroring the database check
 * (isfinite + between 1600-01-01 and 3000-01-01). Returns a user-facing issue
 * or null. The <input type="date"> control already limits typing, but the API
 * boundary must also fail gracefully with the draft preserved.
 */
const SANE_DATE_MIN = "1600-01-01";
const SANE_DATE_MAX = "3000-01-01";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function dateValueIssue(dateValue: string): string | null {
  if (dateValue === "") return null;
  if (!ISO_DATE.test(dateValue)) {
    return "Enter a real calendar date (YYYY-MM-DD); special values such as “infinity” are not accepted.";
  }
  const parts = dateValue.split("-").map((part) => Number(part));
  const candidate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (
    candidate.getUTCFullYear() !== parts[0] ||
    candidate.getUTCMonth() !== parts[1] - 1 ||
    candidate.getUTCDate() !== parts[2]
  ) {
    return "That date does not exist on the calendar (for example 31 April or 29 February on a non-leap year).";
  }
  if (dateValue < SANE_DATE_MIN || dateValue > SANE_DATE_MAX) {
    return `Enter a date between ${SANE_DATE_MIN} and ${SANE_DATE_MAX}.`;
  }
  return null;
}

/*
 * Client-side save validation for one item, mirroring the database trigger:
 * returns a user-facing issue string, or null when the row is acceptable.
 * The database remains the enforcer; this only produces a graceful failure
 * with the draft preserved instead of a raw constraint error.
 */
export function answerWriteIssue(
  field: AssessmentFieldSpec,
  answer: DemoAnswer,
): string | null {
  if (field.control === "date") {
    const dateIssue = dateValueIssue(answer.dateValue);
    if (dateIssue) return dateIssue;
  }
  if (answer.status === "ready" && !answerAdequate(field, answer)) {
    return `${field.id} cannot be saved as ready without an adequate recorded answer.`;
  }
  if (answer.status === "na") {
    if (!field.allowsNa) {
      return `N/A is not offered for ${field.id}.`;
    }
    if (answer.naReason.trim() === "") {
      return `N/A for ${field.id} requires a recorded reason before it can be saved.`;
    }
  }
  return null;
}

/** Round-trip helper used after server confirmation: row -> equality-safe draft. */
export function rowToSavedDraft(row: AnswerRow): DemoAnswer {
  return rowToDemoAnswer(row);
}
