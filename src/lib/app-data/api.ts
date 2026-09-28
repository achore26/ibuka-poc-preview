/*
 * Data-access helpers for the persisted assessment slice. Thin wrappers over
 * supabase-js calls with explicit error normalization; all privilege is
 * enforced by the database (grants + RLS) — nothing here trusts the browser.
 *
 * Write strategy per docs/database-structure.md: INSERT for a new answer,
 * UPDATE for an existing one. A concurrent first insert surfaces Postgres
 * 23505 on the (company_id, item_id) key; that is retried as a read+update
 * instead of a generic upsert, which would need wider column grants than the
 * narrow grants the schema gives the client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssessmentFieldSpec, DemoAnswer } from "./answer-state";
import { demoAnswerToRowFields, type AnswerWriteFields } from "./answer-state";
import type { AnswerRow, CompanyRow } from "./types";

export class ApiError extends Error {
  /** Postgres/PostgREST code when available (e.g. 23505, 23514, PGRST116). */
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

function friendlyWriteError(context: string, error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const err = error as { message?: string; code?: string };
  const code = typeof err?.code === "string" ? err.code : null;
  const detail = err?.message ? `: ${err.message}` : ".";
  return new ApiError(`${context} was not saved${detail}${code ? ` (code ${code})` : ""}`, code);
}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

export async function fetchMyCompany(
  client: SupabaseClient,
): Promise<CompanyRow | null> {
  const { data, error } = await client
    .from("company_account")
    .select("*")
    .limit(1);
  if (error) throw new ApiError(`Your company record could not be loaded: ${error.message}`, error.code ?? null);
  return (data && data.length > 0 ? data[0] : null) as CompanyRow | null;
}

export type CreateCompanyResult =
  | { kind: "created"; company: CompanyRow }
  | { kind: "already-exists"; company: CompanyRow };

/*
 * Creates the caller's one company. The database assigns owner, id and
 * timestamps; only the name is sent. A concurrent onboarding attempt (unique
 * owner) resolves as already-exists by refetching the caller's own record —
 * never by duplicating or replacing ownership.
 */
export async function createCompany(
  client: SupabaseClient,
  name: string,
): Promise<CreateCompanyResult> {
  try {
    const { data, error } = await client
      .from("company_account")
      .insert({ name })
      .select("*")
      .single();
    if (error) throw error;
    return { kind: "created", company: data as CompanyRow };
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "23505") {
      const existing = await fetchMyCompany(client);
      if (existing) return { kind: "already-exists", company: existing };
    }
    throw friendlyWriteError("The company", error);
  }
}

/** Renames the caller's own company (the only mutable company column). */
export async function updateCompanyName(
  client: SupabaseClient,
  companyId: string,
  name: string,
): Promise<CompanyRow> {
  try {
    const { data, error } = await client
      .from("company_account")
      .update({ name })
      .eq("id", companyId)
      .select("*")
      .single();
    if (error) throw error;
    return data as CompanyRow;
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "PGRST116") {
      throw new ApiError("The company could not be found for this account; reload and try again.", "PGRST116");
    }
    throw friendlyWriteError("The company name", error);
  }
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export async function fetchAnswers(
  client: SupabaseClient,
  companyId: string,
): Promise<AnswerRow[]> {
  const { data, error } = await client
    .from("assessment_answer")
    .select("*")
    .eq("company_id", companyId);
  if (error) throw new ApiError(`Your saved answers could not be loaded: ${error.message}`, error.code ?? null);
  return (data ?? []) as AnswerRow[];
}

/*
 * Saves one answer. Insert first; on a concurrent-insert 23505 conflict,
 * refetch the existing own row and update it (narrow column grants permit
 * updating only status + typed values). Returns the server-confirmed row —
 * success is only ever reported from the database response.
 */
export async function saveAnswer(
  client: SupabaseClient,
  companyId: string,
  field: AssessmentFieldSpec,
  answer: DemoAnswer,
): Promise<AnswerRow> {
  const fields: AnswerWriteFields = demoAnswerToRowFields(field.control, answer);
  try {
    const { data, error } = await client
      .from("assessment_answer")
      .insert({ company_id: companyId, item_id: field.id, ...fields })
      .select("*")
      .single();
    if (error) throw error;
    return data as AnswerRow;
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code !== "23505") {
      throw friendlyWriteError(`${field.id}`, error);
    }
  }

  // Conflict: another request inserted this (company, item) first. Refetch
  // and update the caller's own row.
  try {
    const { data: existing, error: selectError } = await client
      .from("assessment_answer")
      .select("*")
      .eq("company_id", companyId)
      .eq("item_id", field.id)
      .maybeSingle();
    if (selectError) throw selectError;
    if (!existing) {
      throw new ApiError(
        `${field.id} was not saved: the existing answer could not be found for this account; reload and try again.`,
        "PGRST116",
      );
    }
    const { data, error } = await client
      .from("assessment_answer")
      .update(fields)
      .eq("company_id", companyId)
      .eq("item_id", field.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as AnswerRow;
  } catch (error) {
    throw friendlyWriteError(`${field.id}`, error);
  }
}
