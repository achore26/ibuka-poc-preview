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

import { Button } from "@/components/ui/button";
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

export function GapDisclosure({ gaps, onNavigate }: { gaps: PreparedGap[]; onNavigate?: (id: string) => void }) {
  if (gaps.length === 0) return null;
  return (
    <details className="text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center rounded text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">View remaining items ({gaps.length})</summary>
      <ol className="mt-1 flex flex-col border-l pl-3">
        {gaps.map((gap) => (
          <li key={gap.id}>
            <button type="button" className="min-h-11 w-full rounded py-2 text-left text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => onNavigate?.(gap.id)}>
              {gap.shortLabel}<span className="text-muted-foreground"> — {gap.statusNote}</span>
            </button>
          </li>
        ))}
      </ol>
    </details>
  );
}

export function PreparedPanel({ summary, gaps, savedNote, onNavigate, completeAllowed = false, preview = false, firstId }: {
  summary: SampleProgress | null;
  gaps: PreparedGap[];
  savedNote: string;
  onNavigate: (id: string) => void;
  completeAllowed?: boolean;
  preview?: boolean;
  firstId: string;
}) {
  const allReady = summary?.kind === "ok" && summary.ready === summary.applicable && summary.applicable > 0;
  const reviewReady = allReady && completeAllowed && !preview;
  return (
    <aside aria-label="Assessment progress" className="panel flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-sm font-semibold">{preview ? "Preview progress" : "Your progress"}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{savedNote}</p>
      </div>
      <PreparedMetric summary={summary} />
      <div className="border-t pt-4">
        {reviewReady ? (
          <>
            <p className="text-base font-semibold leading-6">Your sample answers are ready for review.</p>
            <Button variant="outline" className="mt-3 h-11 w-full" onClick={() => onNavigate(firstId)}>Review answers</Button>
          </>
        ) : gaps.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">Next</p>
            <p className="mt-1 text-base font-semibold leading-6">{gaps[0].shortLabel}</p>
            <Button className="mt-3 h-11 w-full" onClick={() => onNavigate(gaps[0].id)}>Continue</Button>
            <GapDisclosure gaps={gaps} onNavigate={onNavigate} />
          </>
        ) : allReady ? (
          <p className="text-sm leading-6">{preview ? "All preview items are marked ready. Sign in to start a saved assessment." : "Finish saving your latest changes before reviewing your answers."}</p>
        ) : null}
      </div>
      <p className="border-t pt-4 text-sm leading-5 text-muted-foreground">This records your preparation; it is not a listing eligibility or approval result.</p>
    </aside>
  );
}
