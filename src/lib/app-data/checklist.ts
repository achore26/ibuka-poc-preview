/*
 * Checklist (enabled sample reference data) loading and validation.
 *
 * The persisted assessment only renders when the server's ACTIVE
 * checklist_item rows match the frontend's generated enabled sample exactly:
 * the same ten supplied IDs, the same field types (and select options), and
 * the same sample_version. Any drift is a configuration error shown honestly —
 * never a silently mis-scored form. Inactive legacy rows are hidden by RLS
 * (is_active), so any mismatch means the deployed sample genuinely differs.
 *
 * The rows come from read-only shared reference data (checklist_item) seeded
 * by migrations 20260927000200 + 20260930000100 in the companion DB worktree.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { enabledFields, type EnabledFieldSpec, type SampleControl } from "../enabled-sample.ts";
import type { AssessmentFieldSpec } from "./answer-state.ts";
import { EXPECTED_SAMPLE_VERSION, type ChecklistItemRow } from "./types.ts";

const CONTROL_BY_FIELD_TYPE: Record<ChecklistItemRow["field_type"], SampleControl> = {
  date: "date",
  yes_no_details: "yes-no",
  narrative: "narrative",
  text_na: "conditional-text",
  text: "text",
  select: "select",
  currency: "currency",
  currency_date: "currency_date",
};

/** The exact expected sample identity: id -> control + select options + N/A offer. */
export const EXPECTED_SAMPLE: Record<
  string,
  { control: SampleControl; allowsNa: boolean; selectOptions?: string[] }
> = Object.fromEntries(
  enabledFields.map((field) => [
    field.id,
    field.selectOptions
      ? { control: field.control, allowsNa: field.allowsNa, selectOptions: field.selectOptions }
      : { control: field.control, allowsNa: field.allowsNa },
  ]),
);

export const EXPECTED_IDS: string[] = enabledFields.map((field) => field.id);

/** Normalized item used by the persisted assessment UI. */
export interface NormalizedChecklistItem extends AssessmentFieldSpec {
  /** Verbatim prompt shown as the question (never a replacement for it). */
  prompt: string;
  /** Short navigation label for gap lists. */
  shortLabel: string;
  /** Exact source reference shown beside the prompt. */
  source: string;
  /** Server display_order for deterministic ordering. */
  displayOrder: number;
  partyKey: string;
  sampleVersion: string;
  /** Section grouping from the generated enabled sample. */
  sectionKey: string;
  sectionTitle: string;
  /** Internal: server prompt differed from the verbatim source prompt. */
  promptMismatch?: boolean;
}

export type ChecklistResult =
  | { ok: true; items: NormalizedChecklistItem[] }
  | { ok: false; reason: string };

function isRowShape(value: unknown): value is ChecklistItemRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.question_text === "string" &&
    typeof row.field_type === "string" &&
    typeof row.allows_na === "boolean" &&
    typeof row.party_key === "string" &&
    typeof row.phase_order === "number" &&
    typeof row.display_order === "number" &&
    typeof row.source_reference === "string" &&
    (row.select_options === null || Array.isArray(row.select_options)) &&
    typeof row.sample_version === "string" &&
    typeof row.is_active === "boolean"
  );
}

/*
 * Pure validation over fetched rows (also covered by Node fixtures): exact
 * expected id set, matching field types and select options, prompts matching
 * the verbatim source prompt, and one shared expected sample_version. Sorted
 * by server display_order.
 */
export function fetchChecklistFromRows(rows: unknown): ChecklistResult {
  if (!Array.isArray(rows)) {
    return { ok: false, reason: "The sample data returned by the server is not a list." };
  }
  const shaped = rows.filter(isRowShape);
  if (shaped.length !== rows.length) {
    return { ok: false, reason: "The sample data returned by the server has an unexpected shape." };
  }

  const expectedIds = [...EXPECTED_IDS].sort();
  const gotIds = shaped.map((row) => row.id).sort();
  if (JSON.stringify(gotIds) !== JSON.stringify(expectedIds)) {
    return {
      ok: false,
      reason:
        `The server sample does not match this build's expected sample ` +
        `(expected [${expectedIds.join(", ")}], received [${gotIds.join(", ")}]).`,
    };
  }

  for (const row of shaped) {
    const expected = EXPECTED_SAMPLE[row.id];
    const control = CONTROL_BY_FIELD_TYPE[row.field_type];
    if (control !== expected.control) {
      return {
        ok: false,
        reason:
          `The server sample defines ${row.id} as ${row.field_type}; this build expects the ${expected.control} control.`,
      };
    }
    if (control === "select") {
      const got = row.select_options ?? [];
      if (JSON.stringify(got) !== JSON.stringify(expected.selectOptions ?? [])) {
        return {
          ok: false,
          reason: `The server sample offers options [${got.join(", ")}] for ${row.id}; this build expects [${(expected.selectOptions ?? []).join(", ")}].`,
        };
      }
    }
    /*
     * allows_na equality (D5, 30 September 2026): the N/A offer is part of
     * the reviewed sample configuration, not free-floating server data. A
     * drift (the server offering or withholding applicability where the
     * build expects the opposite) changes which denominator rule the UI
     * applies, so it must reject exactly like a control or version drift —
     * never render a mis-configured applicability path.
     */
    if (row.allows_na !== expected.allowsNa) {
      return {
        ok: false,
        reason: `The server sample ${row.allows_na ? "offers" : "does not offer"} not-applicable for ${row.id}; this build expects the opposite.`,
      };
    }
    if (row.sample_version !== EXPECTED_SAMPLE_VERSION) {
      return {
        ok: false,
        reason:
          `The server sample version for ${row.id} is ${row.sample_version}; this build expects ${EXPECTED_SAMPLE_VERSION}.`,
      };
    }
  }

  const byPrompt = new Map(enabledFields.map((field: EnabledFieldSpec) => [field.id, field.prompt]));
  const items: NormalizedChecklistItem[] = shaped
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((row) => {
      const generated = enabledFields.find((field) => field.id === row.id);
      const promptMismatch = row.question_text !== byPrompt.get(row.id);
      return {
        id: row.id,
        prompt: promptMismatch ? row.question_text : (generated?.prompt ?? row.question_text),
        promptMismatch,
        shortLabel: row.title,
        source: row.source_reference,
        control: CONTROL_BY_FIELD_TYPE[row.field_type],
        allowsNa: row.allows_na,
        selectOptions: row.select_options ?? undefined,
        displayOrder: row.display_order,
        partyKey: row.party_key,
        sampleVersion: row.sample_version,
        sectionKey: generated?.sectionKey ?? "company",
        sectionTitle: generated?.sectionTitle ?? "",
      };
    });

  if (items.some((item) => item.promptMismatch)) {
    return {
      ok: false,
      reason:
        "The server sample wording does not match the supplied source prompts for this build; " +
        "the assessment is not shown to avoid presenting reworded questions.",
    };
  }

  return { ok: true, items };
}

/** Loads the active checklist_item rows via the Data API (read-only reference data). */
export async function fetchChecklist(
  client: SupabaseClient,
): Promise<ChecklistResult> {
  const { data, error } = await client
    .from("checklist_item")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    return {
      ok: false,
      reason: `The sample questions could not be loaded (${error.message}).`,
    };
  }
  return fetchChecklistFromRows(data);
}
