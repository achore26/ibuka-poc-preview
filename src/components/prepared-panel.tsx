/*
 * Shared "prepared for review" progress panel (accepted redesign,
 * 30 September 2026): one narrow right-rail panel (~280px desktop) used by
 * both the anonymous preview and the saved assessment, plus a compact
 * variant for phones. It leads with the actual count ("7 of 10 prepared for
 * review"), a refined segmented bar (one segment per applicable selected
 * item), the percentage at a modest size, and the remaining gaps behind a
 * disclosure so the panel stays quiet. Figures derive from the caller's
 * summary — client state for the preview, server-confirmed rows for the
 * saved form. The note stays truthful: self-reported preparation, never a
 * listing approval.
 */

import type { SampleProgress } from "@/lib/sample-progress";

export interface PreparedGap {
  id: string;
  shortLabel: string;
  statusNote: string;
}

function SegmentedBar({ ready, applicable }: { ready: number; applicable: number }) {
  if (applicable <= 0) return null;
  const segments = Array.from({ length: applicable }, (_, index) => index < ready);
  return (
    <div aria-hidden="true" className="flex gap-1">
      {segments.map((filled, index) => (
        <span
          key={index}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-150 ${
            filled ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

export function PreparedMetric({
  summary,
  compact = false,
}: {
  summary: SampleProgress | null;
  compact?: boolean;
}) {
  if (summary?.kind === "ok") {
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className={`${compact ? "text-xl" : "text-2xl"} font-semibold tracking-tight tabular-nums`}>
            {summary.ready} of {summary.applicable}
            <span className="ms-1 text-sm font-normal text-muted-foreground">prepared</span>
          </p>
          <p className="text-sm tabular-nums text-muted-foreground">{summary.displayPercent}%</p>
        </div>
        <SegmentedBar ready={summary.ready} applicable={summary.applicable} />
      </div>
    );
  }
  if (summary?.kind === "not_applicable") {
    return (
      <p role="status" className="text-sm leading-relaxed text-muted-foreground">
        Not applicable — every configured item is a valid N/A, so no score is shown.
      </p>
    );
  }
  if (summary) {
    return (
      <p role="status" className="text-sm leading-relaxed text-muted-foreground">
        No sample items are configured — no score is shown.
      </p>
    );
  }
  return (
    <p role="status" className="text-sm leading-relaxed text-muted-foreground">
      Loading progress…
    </p>
  );
}

export function GapDisclosure({ gaps }: { gaps: PreparedGap[] }) {
  if (gaps.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        None — every selected item is prepared for review.
      </p>
    );
  }
  return (
    <details className="group/gaps text-xs">
      <summary className="min-h-11 cursor-pointer select-none rounded py-2 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:py-0">
        Remaining items ({gaps.length})
      </summary>
      <ul className="mt-1.5 flex flex-col gap-1 border-l pl-3 leading-relaxed">
        {gaps.map((gap) => (
          <li key={gap.id}>
            <span className="font-medium text-foreground">{gap.shortLabel}</span>
            <span className="text-muted-foreground"> — {gap.statusNote}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function PreparedPanel({
  summary,
  gaps,
  savedNote,
  footer,
}: {
  summary: SampleProgress | null;
  gaps: PreparedGap[];
  savedNote: string;
  footer?: React.ReactNode;
}) {
  return (
    <aside aria-label="Assessment progress" className="panel flex flex-col gap-3.5 p-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Progress</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{savedNote}</p>
      </div>
      <PreparedMetric summary={summary} />
      <div className="border-t pt-3">
        <GapDisclosure gaps={gaps} />
      </div>
      {footer ? <div className="border-t pt-3">{footer}</div> : null}
      <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
        Self-reported preparation for review — not a listing eligibility or
        approval result.
      </p>
    </aside>
  );
}
