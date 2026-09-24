import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  answerAdequate,
  demoFields,
  initialDemoAnswer,
  workedExampleAnswers,
  type DemoAnswer,
  type DemoFieldId,
  type DemoFieldSpec,
} from "@/lib/demo-sample";
import {
  isValidNa,
  summarizeSampleProgress,
  type SampleItemState,
  type SampleReadinessStatus,
} from "@/lib/sample-progress";

type Answers = Record<DemoFieldId, DemoAnswer>;

const fieldById: ReadonlyMap<DemoFieldId, DemoFieldSpec> = new Map(
  demoFields.map((field) => [field.id, field] as const),
);

function makeInitialAnswers(): Answers {
  const answers = {} as Answers;
  for (const field of demoFields) {
    answers[field.id] = initialDemoAnswer();
  }
  return answers;
}

const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

const hintClass = "mt-1.5 text-xs leading-relaxed text-muted-foreground";

const legendClass =
  "font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground";

const radioClass = "size-4 accent-primary";

/*
 * Updates one demo answer. Typed-input changes advance a not-started item to
 * in progress (a partial draft exists), and a recorded Ready that loses its
 * adequate answer is demoted to in progress so the recorded state never
 * overstates the entry. Readiness radio changes pass typed = false.
 */
function applyUpdate(
  field: DemoFieldSpec,
  previous: DemoAnswer,
  patch: Partial<DemoAnswer>,
  typed: boolean,
): DemoAnswer {
  const next: DemoAnswer = { ...previous, ...patch };
  const adequate = answerAdequate(field, next);
  if (next.status === "ready" && !adequate) {
    next.status = "in_progress";
  } else if (typed && next.status === "not_started") {
    next.status = "in_progress";
  }
  return next;
}

function gapStatusLabel(status: Exclude<SampleReadinessStatus, "ready">): string {
  switch (status) {
    case "not_started":
      return "not started";
    case "in_progress":
      return "in progress";
    case "na":
      return "N/A without a recorded reason — not valid";
  }
}

function ReadinessGroup({
  field,
  answer,
  adequate,
  onStatusChange,
  onTypedChange,
}: {
  field: DemoFieldSpec;
  answer: DemoAnswer;
  adequate: boolean;
  onStatusChange: (patch: Partial<DemoAnswer>) => void;
  onTypedChange: (patch: Partial<DemoAnswer>) => void;
}) {
  const options: Array<{
    value: SampleReadinessStatus;
    label: string;
    disabled: boolean;
  }> = [
    { value: "not_started", label: "Not started", disabled: false },
    { value: "in_progress", label: "In progress", disabled: false },
    { value: "ready", label: "Ready", disabled: !adequate },
    ...(field.allowsNa
      ? [{ value: "na" as const, label: "N/A — not a foreign listing", disabled: false }]
      : []),
  ];

  return (
    <fieldset className="mt-5">
      <legend className={legendClass}>Readiness state</legend>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`${field.id}-readiness`}
              value={option.value}
              checked={answer.status === option.value}
              disabled={option.disabled}
              onChange={() => onStatusChange({ status: option.value })}
              className={radioClass}
            />
            <span
              className={option.disabled ? "text-muted-foreground/70" : "text-foreground"}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {!adequate ? (
        <p className={hintClass}>
          Ready is unavailable until an adequate demo answer is recorded. A
          recorded answer and its readiness state are separate data.
        </p>
      ) : null}
      {answer.status === "na" && field.allowsNa ? (
        <div className="mt-3">
          <label htmlFor={`${field.id}-na-reason`} className="text-sm font-medium">
            Recorded reason this is not a foreign listing — required for a valid
            N/A (demo placeholder)
          </label>
          <textarea
            id={`${field.id}-na-reason`}
            rows={2}
            value={answer.naReason}
            onChange={(event) => onTypedChange({ naReason: event.target.value })}
            placeholder="Demo placeholder — reason text"
            className={inputClass}
          />
          {answer.naReason.trim() === "" ? (
            <p className={hintClass}>
              Until a reason is recorded, this N/A is not valid: the item stays
              in the denominator and remains a gap.
            </p>
          ) : (
            <p className={hintClass}>
              Reason recorded — this N/A is valid and is excluded from the
              progress denominator.
            </p>
          )}
        </div>
      ) : null}
    </fieldset>
  );
}

function DemoField({
  field,
  answer,
  onTypedChange,
  onStatusChange,
}: {
  field: DemoFieldSpec;
  answer: DemoAnswer;
  onTypedChange: (patch: Partial<DemoAnswer>) => void;
  onStatusChange: (patch: Partial<DemoAnswer>) => void;
}) {
  const adequate = answerAdequate(field, answer);

  return (
    <li className="border-t border-foreground/10 pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
          {field.id}
        </span>
        <span className="font-mono text-[11px] tracking-[0.02em] text-muted-foreground">
          Source: {field.source}
        </span>
      </div>
      <p className="mt-2 text-pretty text-[15px] font-medium leading-relaxed text-foreground">
        {field.prompt}
      </p>

      {field.control === "date" ? (
        <div className="mt-3">
          <label htmlFor={`${field.id}-date`} className="text-sm font-medium">
            Date (demo placeholder — do not enter a real company&rsquo;s date)
          </label>
          <input
            type="date"
            id={`${field.id}-date`}
            value={answer.dateValue}
            onChange={(event) => onTypedChange({ dateValue: event.target.value })}
            className={inputClass}
          />
          <p className={hintClass}>A recorded date is required before Ready.</p>
        </div>
      ) : null}

      {field.control === "yes-no" ? (
        <div className="mt-3">
          <fieldset>
            <legend className={legendClass}>Response</legend>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {(["yes", "no"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`${field.id}-yesno`}
                    value={value}
                    checked={answer.yesNo === value}
                    onChange={() => onTypedChange({ yesNo: value })}
                    className={radioClass}
                  />
                  <span className="capitalize">{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {answer.yesNo === "yes" ? (
            <div className="mt-3">
              <label htmlFor={`${field.id}-details`} className="text-sm font-medium">
                Circumstances and any concerns raised — required when Yes is
                recorded (demo placeholder)
              </label>
              <textarea
                id={`${field.id}-details`}
                rows={3}
                value={answer.text}
                onChange={(event) => onTypedChange({ text: event.target.value })}
                placeholder="Demo placeholder — circumstances and concerns text"
                className={inputClass}
              />
            </div>
          ) : null}
          <p className={hintClass}>
            A recorded No is a complete answer by itself; Yes requires the
            circumstances/details text before Ready.
          </p>
        </div>
      ) : null}

      {field.control === "narrative" ? (
        <div className="mt-3">
          <label htmlFor={`${field.id}-narrative`} className="text-sm font-medium">
            Narrative (demo placeholder — do not enter real company information)
          </label>
          <textarea
            id={`${field.id}-narrative`}
            rows={3}
            value={answer.text}
            onChange={(event) => onTypedChange({ text: event.target.value })}
            placeholder="Demo placeholder — narrative text"
            className={inputClass}
          />
          <p className={hintClass}>
            Narrative text is required before Ready; adequacy of real narrative
            answers is a later review concern.
          </p>
        </div>
      ) : null}

      {field.control === "conditional-text" ? (
        <div className="mt-3">
          <label htmlFor={`${field.id}-text`} className="text-sm font-medium">
            Exchange-traded call option arrangements, if applicable (demo
            placeholder)
          </label>
          <textarea
            id={`${field.id}-text`}
            rows={3}
            value={answer.text}
            onChange={(event) => onTypedChange({ text: event.target.value })}
            placeholder="Demo placeholder — arrangement description"
            className={inputClass}
          />
          <p className={hintClass}>
            Proposed paths: describe the arrangements (Ready), or record N/A
            with a reason below. N/A is proposed only for this item.
          </p>
        </div>
      ) : null}

      <ReadinessGroup
        field={field}
        answer={answer}
        adequate={adequate}
        onStatusChange={onStatusChange}
        onTypedChange={onTypedChange}
      />
    </li>
  );
}

export function ReviewPreview() {
  const [answers, setAnswers] = useState<Answers>(makeInitialAnswers);

  function updateField(id: DemoFieldId, patch: Partial<DemoAnswer>, typed: boolean) {
    setAnswers((previous) => ({
      ...previous,
      [id]: applyUpdate(fieldById.get(id)!, previous[id], patch, typed),
    }));
  }

  function resetDemo() {
    setAnswers(makeInitialAnswers());
  }

  function loadWorkedExample() {
    setAnswers(workedExampleAnswers());
  }

  const itemStates: SampleItemState[] = demoFields.map((field) => ({
    id: field.id,
    status: answers[field.id].status,
    allowsNa: field.allowsNa,
    naReason: answers[field.id].naReason,
  }));
  const summary = summarizeSampleProgress(itemStates);
  const validNaIds = demoFields
    .filter((field) => isValidNa(itemStates.find((item) => item.id === field.id)!))
    .map((field) => field.id);

  return (
    <section aria-labelledby="review-preview-heading" className="mt-16">
      <h2
        id="review-preview-heading"
        className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
      >
        Review preview — proposed sample
      </h2>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Sample Market listing assessment — review preview
          </CardTitle>
          {/*
           * Badge and actions are a full-width block below the description
           * (not CardAction): the vendored CardHeader would otherwise force a
           * [1fr auto] two-column grid that squeezes the title/description to
           * ~90px on a 390px viewport.
           */}
          <CardDescription className="max-w-[38em] leading-relaxed">
            A proposed four-item sample from the B02 sample and acceptance
            proposal, shown here with its supplied field IDs, verbatim prompts
            and source references for inspection. The sample, wording, typed
            controls and scoring rule are proposals awaiting Trevor&rsquo;s
            validation (ClickUp C03). All entries are demo placeholders held
            only in this page&rsquo;s memory: nothing is saved or sent, there
            is no sign-in, and answers reset on reload. No real company data is
            requested. This is not a saved company record and produces no
            regulatory, listing-eligibility or approval finding.
          </CardDescription>
          <div className="mt-3 flex flex-col gap-3 border-t border-foreground/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              For review · not validated · not saved
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={loadWorkedExample}>
                Load worked example
              </Button>
              <Button variant="outline" onClick={resetDemo}>
                Reset demo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-6">
            {demoFields.map((field) => (
              <DemoField
                key={field.id}
                field={field}
                answer={answers[field.id]}
                onTypedChange={(patch) => updateField(field.id, patch, true)}
                onStatusChange={(patch) => updateField(field.id, patch, false)}
              />
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Self-reported sample progress
          </CardTitle>
          <CardDescription className="max-w-[38em] leading-relaxed">
            Derived live from the four demo entries as
            100 × ready ÷ (4 − valid N/A), rounded only for display. It
            measures which demo items are marked ready — it is not a regulatory
            pass/fail result, listing eligibility, or approval, and no score is
            saved anywhere.
          </CardDescription>
          {/* Full-width line, not CardAction, to keep this header one column
           * on narrow viewports (same mobile fix as the card above). */}
          <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Derived live · not saved
          </span>
        </CardHeader>
        <CardContent>
          {summary.kind === "ok" ? (
            <div role="status" aria-live="polite">
              <p className="font-serif text-3xl leading-tight text-foreground">
                {summary.ready} / {summary.applicable} = {summary.displayPercent}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                items marked ready ÷ applicable items ({summary.total} configured
                {summary.validNa > 0
                  ? `, ${summary.validNa} valid N/A excluded`
                  : ", none excluded"}
                )
              </p>
              <h3 className="mt-5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Gaps in source order
              </h3>
              {summary.gaps.length > 0 ? (
                <ol className="mt-2 flex flex-col gap-1.5">
                  {summary.gaps.map((gap, index) => (
                    <li key={gap.id} className="text-sm">
                      <span className="font-mono text-muted-foreground">
                        {index + 1}.
                      </span>{" "}
                      <span className="font-mono text-[12px] text-foreground">
                        {gap.id}
                      </span>{" "}
                      — {fieldById.get(gap.id as DemoFieldId)?.shortLabel} —{" "}
                      <span className="text-muted-foreground">
                        {gapStatusLabel(gap.status)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No gaps: every applicable item is marked ready.
                </p>
              )}
              {validNaIds.length > 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Excluded as valid N/A (reason recorded):{" "}
                  <span className="font-mono text-[12px] text-foreground">
                    {validNaIds.join(", ")}
                  </span>
                </p>
              ) : null}
            </div>
          ) : summary.kind === "not_applicable" ? (
            <p role="status" className="text-sm text-muted-foreground">
              Not applicable — every configured item is a valid N/A, so no
              percentage is shown. (Not reachable from the four fields above,
              where only Q-OFR-03 has the N/A path.)
            </p>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              Configuration error — no sample items are configured. A score is
              never shown in this state.
            </p>
          )}
          <p className="mt-5 max-w-[46em] text-xs leading-relaxed text-muted-foreground">
            Answers reset on reload. The proposed wording, controls, N/A path
            and this progress rule await Trevor&rsquo;s validation (ClickUp
            C03); the saved assessment (B06) additionally depends on sign-in
            (B05) and the Supabase data model.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
