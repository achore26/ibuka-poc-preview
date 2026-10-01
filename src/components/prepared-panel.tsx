/* Saved-only preparation count, linear track and remaining-item links.
 * Desktop presentation lives in the navy rail; mobile uses a compact row.
 * Preview is separately labelled and cannot imply persistence or approval.
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
  return <div aria-hidden="true" className="progress-track h-1 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary" style={{ width: `${ready / applicable * 100}%` }} /></div>;
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
        <p className={`${compact ? "text-sm" : "text-base"} font-medium leading-6 tabular-nums`}>{summary.ready} of {summary.applicable} ready for review</p>
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
      <p className="mt-3 text-xs leading-5 text-muted-foreground lg:hidden">Self-reported preparation, not eligibility or approval.</p>
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
    <aside aria-label="Assessment progress" className="progress-block flex flex-col gap-3">
      <div className="progress-intro">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em]">{preview ? "Preview progress" : "Your progress"}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{savedNote}</p>
      </div>
      <PreparedMetric summary={summary} />
      <div className="progress-actions pt-1">
        {reviewReady ? (
          <>
            <p className="border-l-2 border-brand-gold pl-3 text-base font-semibold leading-6">Your sample answers are ready for review.</p>
            <Button variant="outline" className="mt-3 h-11 w-full" onClick={() => onNavigate(firstId)}>Review answers</Button>
          </>
        ) : gaps.length > 0 ? (
          <GapDisclosure gaps={gaps} onNavigate={onNavigate} />
        ) : allReady ? (
          <p className="text-sm leading-6">{preview ? "All preview items are marked ready. Sign in to start a saved assessment." : "Finish saving your latest changes before reviewing your answers."}</p>
        ) : null}
      </div>
      <p className={`${gaps.length > 0 ? "hidden lg:block" : "col-span-2"} text-xs leading-5 text-muted-foreground`}>Self-reported preparation, not eligibility or approval.</p>
    </aside>
  );
}
