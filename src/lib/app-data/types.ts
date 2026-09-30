/*
 * Shared row types for the CMP Kenya persisted assessment slice and the
 * enabled-sample identity. These describe the Supabase tables created by
 * migrations 20260927000100 + 20260927000200 (four-item provisional sample)
 * and extended, non-destructively, by 20260930000100 (active sample v2 with
 * is_active, select_options, answer_number and answer_select).
 *
 * The frontend validates the server sample against EXPECTED_SAMPLE_VERSION
 * (sourced from the generated enabled sample) on load and refuses to render
 * the persisted assessment when they disagree — the honest failure, never a
 * silently mis-scored form.
 */

/** Sourced from src/lib/generated/enabled-sample.json (generated; do not edit). */
export type SampleVersion = "2026-09-cmp-sample-2";

import type { EnabledFieldSpec, SampleAnswer } from "../enabled-sample.ts";

export type { EnabledFieldSpec, SampleAnswer };
export { EXPECTED_SAMPLE_VERSION } from "../enabled-sample.ts";

export type ChecklistFieldType =
  | "date"
  | "yes_no_details"
  | "narrative"
  | "text_na"
  | "text"
  | "select"
  | "currency"
  | "currency_date";

export interface ChecklistItemRow {
  id: string;
  title: string;
  question_text: string;
  field_type: ChecklistFieldType;
  allows_na: boolean;
  party_key: string;
  phase_order: number;
  display_order: number;
  source_reference: string;
  select_options: string[] | null;
  sample_version: string;
  is_active: boolean;
  created_at: string;
}

export interface CompanyRow {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type AnswerStatusValue = "not_started" | "in_progress" | "ready" | "na";

export interface AnswerRow {
  company_id: string;
  item_id: string;
  status: AnswerStatusValue;
  answer_date: string | null;
  answer_bool: boolean | null;
  answer_text: string | null;
  answer_number: number | null;
  answer_select: string | null;
  na_reason: string | null;
  updated_at: string;
}
