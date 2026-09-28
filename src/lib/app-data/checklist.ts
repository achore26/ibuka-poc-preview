/*
 * Checklist (sample reference data) loading and validation.
 *
 * The persisted assessment only renders when the server's checklist_item rows
 * match the frontend's expected provisional sample: the same four supplied
 * IDs, the same field types/N-A path, and the same sample_version. Any drift
 * is a configuration error shown honestly — never a silently mis-scored form.
 * The rows come from read-only shared reference data (checklist_item) seeded
 * by migration 20260927000200 in the ibuka-supabase worktree.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DemoControl } from "../demo-sample.ts";
import type { AssessmentFieldSpec } from "./answer-state.ts";
import { EXPECTED_SAMPLE_VERSION, type ChecklistItemRow } from "./types.ts";

/** The exact expected sample identity (id -> server field_type). */
export const EXPECTED_SAMPLE: Record<string, ChecklistItemRow["field_type"]> = {
  "CP-07": "date",
  "Q-DIR-01": "yes_no_details",
  "Q-ISS-01": "narrative",
  "Q-OFR-03": "text_na",
};

const CONTROL_BY_FIELD_TYPE: Record<ChecklistItemRow["field_type"], DemoControl> = {
  date: "date",
  yes_no_details: "yes-no",
  narrative: "narrative",
  text_na: "conditional-text",
};

/** Normalized item used by the persisted assessment UI. */
export interface NormalizedChecklistItem extends AssessmentFieldSpec {
  /** Verbatim prompt shown as the question (never a replacement for it). */
  prompt: string;
  /** Short navigation label for gap lists. */
  shortLabel: string;
  /** Source reference shown beside the prompt. */
  source: string;
  /** Server display_order for deterministic ordering. */
  displayOrder: number;
  partyKey: string;
  sampleVersion: string;
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
    typeof row.sample_version === "string"
  );
}

/*
 * Pure validation over fetched rows (also covered by Node fixtures): exact
 * expected id set, matching field types (which imply the N/A path), and one
 * shared expected sample_version. Sorted by server display_order.
 */
export function fetchChecklistFromRows(rows: unknown): ChecklistResult {
  if (!Array.isArray(rows)) {
    return { ok: false, reason: "The sample data returned by the server is not a list." };
  }
  const shaped = rows.filter(isRowShape);
  if (shaped.length !== rows.length) {
    return { ok: false, reason: "The sample data returned by the server has an unexpected shape." };
  }

  const expectedIds = Object.keys(EXPECTED_SAMPLE).sort();
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
    if (row.field_type !== EXPECTED_SAMPLE[row.id]) {
      return {
        ok: false,
        reason:
          `The server sample defines ${row.id} as ${row.field_type}; this build expects ${EXPECTED_SAMPLE[row.id]}.`,
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

  const items: NormalizedChecklistItem[] = shaped
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((row) => ({
      id: row.id,
      prompt: row.question_text,
      shortLabel: row.title,
      source: row.source_reference,
      control: CONTROL_BY_FIELD_TYPE[row.field_type],
      allowsNa: row.allows_na,
      displayOrder: row.display_order,
      partyKey: row.party_key,
      sampleVersion: row.sample_version,
    }));

  return { ok: true, items };
}

/** Loads checklist_item via the Data API (read-only shared reference data). */
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
