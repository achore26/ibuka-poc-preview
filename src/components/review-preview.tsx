/*
 * Anonymous review preview of the enabled ten-item sample: purely transient
 * React state, no persistence, no API writes, no storage, no sign-in. Reload
 * resets everything. The signed-in form shares the exact field controls and
 * rules via assessment-fields/assessment-form so behaviour cannot drift.
 * Signing in moved to the header dialog (sign-in-dialog.tsx); this preview
 * IS the page's lead content.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AssessmentForm, type FormSection } from "@/components/assessment-form";
import { PreparedMetric, PreparedPanel, type PreparedGap } from "@/components/prepared-panel";
import {
  enabledFields,
  enabledSections,
  fieldById,
  initialSampleAnswer,
  workedExampleAnswers,
  type SampleAnswer,
} from "@/lib/enabled-sample";
import { applyAnswerUpdate } from "@/lib/app-data/answer-state";
import { summarizeSampleProgress, type SampleItemState } from "@/lib/sample-progress";

function makeInitialAnswers(): Record<string, SampleAnswer> {
  const answers: Record<string, SampleAnswer> = {};
  for (const field of enabledFields) answers[field.id] = initialSampleAnswer();
  return answers;
}

const sections: FormSection[] = enabledSections.map((section) => ({
  key: section.key,
  title: section.title,
  items: section.items.map((item) => ({
    id: item.id,
    prompt: item.prompt,
    shortLabel: item.shortLabel,
    source: item.sourceRef,
    control: item.control,
    allowsNa: item.allowsNa,
    selectOptions: item.selectOptions,
  })),
}));

const GAP_NOTES: Record<string, string> = {
  not_started: "not started",
  in_progress: "draft",
  na: "N/A without a recorded reason",
};

export function ReviewPreview() {
  const [answers, setAnswers] = useState<Record<string, SampleAnswer>>(makeInitialAnswers);
  const [activeKey, setActiveKey] = useState(sections[0].key);

  const update = (id: string, patch: Partial<SampleAnswer>, typed: boolean) => {
    setAnswers((previous) => ({
      ...previous,
      [id]: applyAnswerUpdate(fieldById.get(id)!, previous[id], patch, typed),
    }));
  };

  const itemStates: SampleItemState[] = enabledFields.map((field) => ({
    id: field.id,
    status: answers[field.id].status,
    allowsNa: field.allowsNa,
    naReason: answers[field.id].naReason,
  }));
  const summary = useMemo(() => summarizeSampleProgress(itemStates), [itemStates]);

  const gaps: PreparedGap[] =
    summary.kind === "ok"
      ? summary.gaps.map((gap) => ({
          id: gap.id,
          shortLabel: fieldById.get(gap.id)?.shortLabel ?? gap.id,
          statusNote: GAP_NOTES[gap.status] ?? gap.status,
        }))
      : [];

  const sectionProgress = (key: string) => {
    const items = sections.find((section) => section.key === key)!.items;
    return {
      ready: items.filter((item) => answers[item.id].status === "ready").length,
      total: items.length,
    };
  };

  return (
    <div className="flex flex-col gap-5">
      {/* The single prominent temporary-preview note (stated once here —
          not repeated per field). The worked-example loader is a secondary
          action explicitly labelled as sample data. */}
      <div
        role="note"
        aria-label="Temporary preview warning"
        className="panel flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--status-warn)" }}>
            Temporary preview
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Nothing is saved or sent, and reloading the page resets every
            entry — entries made here are not transferred. Use the
            header&rsquo;s <span className="font-medium text-foreground">Sign in</span> action
            to start a saved assessment for a synthetic test company.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:ms-auto sm:shrink-0">
          <Button variant="outline" className="h-11 sm:h-9" onClick={() => setAnswers(workedExampleAnswers())}>
            Load worked example (sample)
          </Button>
          <Button variant="ghost" className="h-11 sm:h-9" onClick={() => setAnswers(makeInitialAnswers())}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <AssessmentForm
          sections={sections}
          progress={sectionProgress}
          answers={answers}
          activeKey={activeKey}
          onSelectSection={setActiveKey}
          onTypedChange={(id, patch) => update(id, patch, true)}
          onMarkReady={(id) => update(id, { status: "ready" }, false)}
          onReturnToDraft={(id) => update(id, { status: "in_progress" }, false)}
          onMarkNotApplicable={(id) => update(id, { status: "na" }, false)}
          onUndoNotApplicable={(id) => update(id, { status: "in_progress" }, false)}
          mobileSummary={
            <div className="panel p-4">
              <PreparedMetric summary={summary} compact />
            </div>
          }
        />

        <div className="hidden lg:sticky lg:top-20 lg:block">
            <PreparedPanel
              summary={summary}
              gaps={gaps}
              savedNote="In-memory figures — nothing saved."
            />
        </div>
      </div>
    </div>
  );
}
