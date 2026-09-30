/*
 * Anonymous review preview of the enabled ten-item sample: purely transient
 * React state, no persistence, no API writes, no storage, no sign-in. Reload
 * resets everything. The signed-in form shares the exact field controls and
 * rules via assessment-fields/assessment-form so behaviour cannot drift.
 * Signing in moved to the header dialog (sign-in-dialog.tsx); this preview
 * IS the page's lead content.
 */

import { useMemo, useState } from "react";
import { WorkspaceProgress } from "@/components/workspace-slots";
import { Button } from "@/components/ui/button";
import { AssessmentForm, type FormSection } from "@/components/assessment-form";
import { PreparedPanel, type PreparedGap } from "@/components/prepared-panel";
import {
  enabledFields,
  enabledSections,
  fieldById,
  initialSampleAnswer,
  workedExampleAnswers,
  type SampleAnswer,
} from "@/lib/enabled-sample";
import { useQuestionNavigation } from "@/components/use-question-navigation";
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
  const { activeKey, setActiveKey, navigateTo } = useQuestionNavigation();

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
      <div role="note" aria-label="Temporary preview warning" className="text-sm leading-6 text-muted-foreground">
        <p><span className="font-semibold text-foreground">Temporary preview.</span> Entries are not saved, sent or transferred when you sign in. Reloading clears them.</p>
        <details className="mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded font-medium focus-visible:outline-2 focus-visible:outline-ring">Preview tools</summary>
          <p className="pb-2">The worked example contains fictional company information.</p>
          <div className="flex flex-wrap gap-2 pb-2">
            <Button variant="outline" className="h-11" onClick={() => setAnswers(workedExampleAnswers())}>Load worked example (sample)</Button>
            <Button variant="ghost" className="h-11" onClick={() => setAnswers(makeInitialAnswers())}>Reset</Button>
          </div>
        </details>
      </div>
      <div className="flex flex-col gap-5">
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
            <WorkspaceProgress>
              <PreparedPanel summary={summary} gaps={gaps} savedNote="In-memory figures — nothing saved." onNavigate={navigateTo} preview firstId={enabledFields[0].id} />
            </WorkspaceProgress>
          }
        />


      </div>
    </div>
  );
}
