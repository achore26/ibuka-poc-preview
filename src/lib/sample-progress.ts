/*
 * Pure self-reported sample-progress calculator for the proposed four-item
 * Phase 1 sample (B02 proposal). No React, no DOM, no I/O — testable in Node.
 *
 * Rules (from docs/sample-and-acceptance.md in the B02 worktree, proposed,
 * awaiting Trevor's validation via ClickUp C03):
 * - T = configured items, N = valid N/A items, R = items marked ready.
 * - If T > 0 and T - N > 0: score = 100 * R / (T - N), rounded only at
 *   display time to two decimals.
 * - `not_started` and `in_progress` are gaps, in source/display order.
 * - `ready` and valid `na` are not gaps.
 * - `na` is valid only for an item with an approved applicability path
 *   (`allowsNa`) AND a recorded non-empty reason. An invalid N/A is a gap
 *   and stays in the denominator — it never shrinks it.
 * - If all configured items are valid N/A: "Not applicable", no percentage.
 * - If no items are configured: configuration error, never 100%.
 *
 * This is a self-reported progress measure. It is not a regulatory pass/fail,
 * listing eligibility, or approval finding.
 */

export type SampleReadinessStatus = "not_started" | "in_progress" | "ready" | "na";

export interface SampleItemState {
  /** Stable supplied ID, e.g. "CP-07". */
  id: string;
  /** Recorded readiness state; separate data from the typed answer. */
  status: SampleReadinessStatus;
  /** Whether this item has a proposed applicability (N/A) path. */
  allowsNa: boolean;
  /** Recorded reason when status is "na"; a valid N/A requires it non-empty. */
  naReason: string;
}

export interface SampleGap {
  id: string;
  status: Exclude<SampleReadinessStatus, "ready">;
}

export type SampleProgress =
  | {
      kind: "ok";
      /** T — configured items. */
      total: number;
      /** N — valid N/A items. */
      validNa: number;
      /** R — items marked ready. */
      ready: number;
      /** T - N. */
      applicable: number;
      /** 100 * R / (T - N), formatted to two decimals for display only. */
      displayPercent: string;
      /** not_started / in_progress / invalid-na items in source order. */
      gaps: SampleGap[];
    }
  | {
      kind: "not_applicable";
      total: number;
      validNa: number;
      gaps: [];
    }
  | {
      kind: "configuration_error";
      gaps: [];
    };

export function isValidNa(item: SampleItemState): boolean {
  return item.status === "na" && item.allowsNa && item.naReason.trim() !== "";
}

export function summarizeSampleProgress(items: SampleItemState[]): SampleProgress {
  const total = items.length;
  if (total === 0) {
    return { kind: "configuration_error", gaps: [] };
  }

  const validNa = items.filter((item) => isValidNa(item)).length;
  const applicable = total - validNa;
  if (applicable === 0) {
    return { kind: "not_applicable", total, validNa, gaps: [] };
  }

  const ready = items.filter((item) => item.status === "ready").length;
  const gaps: SampleGap[] = [];
  for (const item of items) {
    if (item.status === "ready" || isValidNa(item)) continue;
    gaps.push({ id: item.id, status: item.status });
  }

  return {
    kind: "ok",
    total,
    validNa,
    ready,
    applicable,
    displayPercent: ((100 * ready) / applicable).toFixed(2),
    gaps,
  };
}
