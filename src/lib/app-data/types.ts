/*
 * Shared row types for the Daraja persisted assessment slice and the
 * expected provisional sample identity. These describe the Supabase
 * tables created by migration 20260927000100 + seed 20260927000200 in the
 * ibuka-supabase worktree. The frontend validates the server sample against
 * EXPECTED_SAMPLE_VERSION on load and refuses to render the persisted
 * assessment when they disagree (the honest failure is a configuration
 * message, never a wrong score).
 */

export type SampleVersion = "2026-09-b02-provisional-1";

export const EXPECTED_SAMPLE_VERSION: SampleVersion = "2026-09-b02-provisional-1";

export interface ChecklistItemRow {
  id: string;
  title: string;
  question_text: string;
  field_type: "date" | "yes_no_details" | "narrative" | "text_na";
  allows_na: boolean;
  party_key: string;
  phase_order: number;
  display_order: number;
  source_reference: string;
  sample_version: string;
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
  na_reason: string | null;
  updated_at: string;
}
