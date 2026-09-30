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

const SECTION_HELP: Record<string, string> = {
  company: "Record your company’s identity and intended listing segment.",
  financial: "Record the amounts and dates from your company’s financial information.",
  business: "Explain what the business does and the markets it serves.",
  risk: "Describe the business risks, recent changes and capital outlook.",
};

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
  persisted = false,
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
  persisted?: boolean;
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
    <div className="flex min-w-0 flex-col gap-3 lg:gap-4">
      {/* Mobile section selector + compact selected-sample summary */}
      <div className="lg:hidden">
        <label htmlFor="section-select" className="text-sm font-medium">
          Section {activeIndex + 1} of {sections.length}
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
        {mobileSummary ? <div className="mt-2">{mobileSummary}</div> : null}
      </div>

      <section aria-label={active.title} className="flex flex-col gap-3 lg:gap-4">
        <div className="section-heading">
          <p className="mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"><span aria-hidden="true" className="h-0.5 w-7 bg-primary" />Assessment / {String(activeIndex + 1).padStart(2, "0")} of {String(sections.length).padStart(2, "0")}</p>
          <h3 className="text-[28px] font-semibold leading-[34px] tracking-tight lg:text-[40px] lg:leading-[46px]">{active.title}</h3>
          <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground lg:text-base">{SECTION_HELP[active.key]}</p>
        </div>
        <details aria-label="How answer status works" className="text-sm text-muted-foreground">
          <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-ring">How Draft and Ready work</summary>
          <p className="max-w-prose pb-3 leading-relaxed">
            Draft answers may be incomplete. {persisted
              ? "Valid changes save automatically; check the save message before leaving."
              : "Preview edits are temporary and are not saved."} Ready for review means you consider the answer complete for review. It is
            not a submission, approval or listing eligibility decision. Editing a Ready answer returns it to Draft.
          </p>
        </details>
        <div className="assessment-document overflow-hidden rounded-lg border bg-white">
          {active.items.map((field, index) => (
            <div key={field.id} className={index > 0 ? "border-t px-5 py-6 lg:p-8" : "px-5 py-6 lg:p-8"}>
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
          <nav aria-label="Section navigation" className="grid grid-cols-2 items-center gap-3 border-t bg-background/50 px-5 py-5 sm:flex sm:justify-between lg:px-8">
            <Button variant="ghost" className="h-11 min-w-0 whitespace-normal text-xs leading-4 sm:text-sm" disabled={activeIndex === 0} onClick={() => onSelectSection(sections[activeIndex - 1].key)}>← Previous section</Button>
            {activeIndex < sections.length - 1 ? <Button className="h-11 min-w-0 whitespace-normal text-xs leading-4 sm:text-sm" onClick={() => onSelectSection(sections[activeIndex + 1].key)}>Next: {sections[activeIndex + 1].title} →</Button> : <span className="text-xs text-muted-foreground">Final section</span>}
          </nav>
        </div>
      </section>

      {navSuffix}
    </div>
  );
}
