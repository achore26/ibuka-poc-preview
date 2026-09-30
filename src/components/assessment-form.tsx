/*
 * Sectioned assessment form shell (UX contract, 30 September 2026), shared by
 * the anonymous preview and the signed-in autosaving form.
 *
 * Four navigable groups — Company details, Financial position, Business, Risk
 * and outlook — one section in focus at a time. The DESKTOP navy section
 * rail is app chrome rendered by the shared shell (section-rail.tsx); this
 * form reports its live groups, per-group prepared counts and the active
 * group to that rail through the section-nav context, so the rail is always
 * driven by the real form state. On phones an accessible section selector
 * with obvious Previous/Next actions replaces the rail, and `mobileSummary`
 * renders a compact summary directly under the selector so the
 * selected-sample progress stays visible. Selected questions only; nothing
 * about the private full catalogue (no counts, IDs or prompts of disabled
 * items) is revealed. Navigating between groups keeps current values and
 * pending saves because all state lives in the parent.
 */

import { useEffect, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AssessmentField, type FieldSpecLike } from "@/components/assessment-fields";
import { useReportSectionNav } from "@/components/section-rail";
import type { SampleAnswer } from "@/lib/enabled-sample";

export interface FormSection {
  key: string;
  title: string;
  items: FieldSpecLike[];
}

export interface SectionProgress {
  ready: number;
  total: number;
}

export function AssessmentForm({
  sections,
  progress,
  answers,
  activeKey,
  onSelectSection,
  onTypedChange,
  onMarkReady,
  onReturnToDraft,
  onMarkNotApplicable,
  onUndoNotApplicable,
  statusSlot,
  navSuffix,
  mobileSummary,
}: {
  sections: FormSection[];
  progress: (sectionKey: string) => SectionProgress;
  answers: Record<string, SampleAnswer>;
  activeKey: string;
  onSelectSection: (key: string) => void;
  onTypedChange: (id: string, patch: Partial<SampleAnswer>) => void;
  onMarkReady: (id: string) => void;
  onReturnToDraft: (id: string) => void;
  onMarkNotApplicable: (id: string) => void;
  onUndoNotApplicable: (id: string) => void;
  statusSlot?: (id: string) => ReactNode;
  navSuffix?: ReactNode;
  mobileSummary?: ReactNode;
}) {
  const activeIndex = Math.max(0, sections.findIndex((section) => section.key === activeKey));
  const active = sections[activeIndex];
  const reportNav = useReportSectionNav();

  // Live rail config: groups with counts, the active group and its selector.
  const groups = useMemo(
    () => sections.map((section) => ({ key: section.key, title: section.title, ...progress(section.key) })),
    [sections, progress, answers],
  );
  const signature = JSON.stringify({ activeKey, groups });
  useEffect(() => {
    reportNav({ activeKey, groups, onSelect: onSelectSection });
    // Signature carries every value the rail renders; the stable callbacks
    // (reportNav/onSelectSection) are intentionally not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  useEffect(() => {
    return () => reportNav(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Mobile section selector + compact selected-sample summary */}
      <div className="lg:hidden">
        <label htmlFor="section-select" className="text-sm font-medium">
          Section
        </label>
        <select
          id="section-select"
          className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={activeKey}
          onChange={(event) => onSelectSection(event.target.value)}
        >
          {sections.map((section, index) => {
            const { ready, total } = progress(section.key);
            return (
              <option key={section.key} value={section.key}>
                {index + 1}. {section.title} — {ready}/{total} prepared
              </option>
            );
          })}
        </select>
        {mobileSummary ? <div className="mt-4">{mobileSummary}</div> : null}
      </div>

      <section aria-label={active.title} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-0.5">
          <h3 className="text-lg font-semibold tracking-tight">{active.title}</h3>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {progress(active.key).ready}/{progress(active.key).total} prepared for review
          </p>
        </div>
        <div className="panel flex flex-col gap-0 px-4 sm:px-6">
          {active.items.map((field, index) => (
            <div key={field.id} className={index > 0 ? "border-t py-6" : "py-6"}>
              <AssessmentField
                field={field}
                answer={answers[field.id]}
                onTypedChange={(patch) => onTypedChange(field.id, patch)}
                onMarkReady={() => onMarkReady(field.id)}
                onReturnToDraft={() => onReturnToDraft(field.id)}
                onMarkNotApplicable={() => onMarkNotApplicable(field.id)}
                onUndoNotApplicable={() => onUndoNotApplicable(field.id)}
                statusSlot={statusSlot ? statusSlot(field.id) : undefined}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Mobile previous/next */}
      <nav aria-label="Section navigation" className="flex items-center justify-between gap-3 lg:hidden">
        <Button
          variant="outline"
          className="h-11"
          disabled={activeIndex === 0}
          onClick={() => onSelectSection(sections[activeIndex - 1].key)}
        >
          ← Previous
        </Button>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {activeIndex + 1} / {sections.length}
        </span>
        <Button
          variant="outline"
          className="h-11"
          disabled={activeIndex === sections.length - 1}
          onClick={() => onSelectSection(sections[activeIndex + 1].key)}
        >
          Next →
        </Button>
      </nav>
      {navSuffix}
    </div>
  );
}
