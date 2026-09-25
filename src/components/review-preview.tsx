import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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

const hintClass = "text-xs leading-relaxed text-muted-foreground";

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

/*
 * Small status chip per item so the four readiness states stay scannable
 * without reading each control. Neutral variants only: the red accent stays
 * reserved for the primary action, the progress fill and focus.
 */
function StatusBadge({ field, answer }: { field: DemoFieldSpec; answer: DemoAnswer }) {
  const naValid = isValidNa({
    id: field.id,
    status: answer.status,
    allowsNa: field.allowsNa,
    naReason: answer.naReason,
  });
  if (answer.status === "na") {
    return naValid ? (
      <Badge variant="secondary">N/A</Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        N/A — reason required
      </Badge>
    );
  }
  switch (answer.status) {
    case "ready":
      return <Badge variant="secondary">Ready</Badge>;
    case "in_progress":
      return <Badge variant="outline">In progress</Badge>;
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not started
        </Badge>
      );
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
    <fieldset className="mt-5 border-t pt-4">
      <legend className="text-sm font-medium">Readiness</legend>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
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
      {!adequate && answer.status !== "na" ? (
        <p className={`${hintClass} mt-2`}>
          Ready becomes available once an adequate answer is recorded above.
        </p>
      ) : null}
      {answer.status === "na" && field.allowsNa ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor={`${field.id}-na-reason`} className="text-sm font-medium">
            Reason this is not a foreign listing
          </label>
          <Textarea
            id={`${field.id}-na-reason`}
            rows={2}
            value={answer.naReason}
            onChange={(event) => onTypedChange({ naReason: event.target.value })}
            placeholder="Record why this item does not apply"
          />
          {answer.naReason.trim() === "" ? (
            <p className={hintClass}>
              A recorded reason is required for a valid N/A — until then the
              item stays in the progress denominator and counts as a gap.
            </p>
          ) : (
            <p className={hintClass}>
              Reason recorded — this item is excluded from the progress
              calculation.
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
    <li>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="font-mono text-xs font-medium text-muted-foreground">
              {field.id}
            </span>
            <StatusBadge field={field} answer={answer} />
          </div>
          <CardTitle className="mt-1 text-pretty leading-snug">
            {field.prompt}
          </CardTitle>
          <CardDescription className="text-xs">
            Source: {field.source}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {field.control === "date" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${field.id}-date`} className="text-sm font-medium">
                {field.shortLabel}
              </label>
              <Input
                type="date"
                id={`${field.id}-date`}
                value={answer.dateValue}
                onChange={(event) => onTypedChange({ dateValue: event.target.value })}
                className="h-9 sm:max-w-56"
              />
            </div>
          ) : null}

          {field.control === "yes-no" ? (
            <div className="flex flex-col gap-1.5">
              <fieldset>
                <legend className="text-sm font-medium">{field.shortLabel}</legend>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
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
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${field.id}-details`} className="text-sm font-medium">
                    Circumstances and any concerns raised
                  </label>
                  <Textarea
                    id={`${field.id}-details`}
                    rows={3}
                    value={answer.text}
                    onChange={(event) => onTypedChange({ text: event.target.value })}
                    placeholder="Describe the circumstances and any concerns raised"
                  />
                </div>
              ) : null}
              <p className={hintClass}>
                A recorded No is a complete answer; Yes requires the
                circumstances above.
              </p>
            </div>
          ) : null}

          {field.control === "narrative" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${field.id}-narrative`} className="text-sm font-medium">
                {field.shortLabel}
              </label>
              <Textarea
                id={`${field.id}-narrative`}
                rows={4}
                value={answer.text}
                onChange={(event) => onTypedChange({ text: event.target.value })}
                placeholder="Describe the principal objects and activities"
              />
            </div>
          ) : null}

          {field.control === "conditional-text" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${field.id}-text`} className="text-sm font-medium">
                {field.shortLabel}
              </label>
              <Textarea
                id={`${field.id}-text`}
                rows={3}
                value={answer.text}
                onChange={(event) => onTypedChange({ text: event.target.value })}
                placeholder="Describe the arrangements, or record N/A with a reason below"
              />
              <p className={hintClass}>
                N/A with a recorded reason is offered only for this item.
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
        </CardContent>
      </Card>
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
  const percent = summary.kind === "ok" ? (100 * summary.ready) / summary.applicable : 0;

  return (
    <section aria-label="Sample assessment" className="mt-6 lg:mt-8">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Self-reported sample progress
              </CardTitle>
              <CardDescription className="text-xs">
                Not a listing eligibility or approval result.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {summary.kind === "ok" ? (
                <div role="status" aria-live="polite" className="flex flex-col gap-4">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight tabular-nums">
                      {summary.displayPercent}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.ready} of {summary.applicable} applicable items
                      marked ready
                      {summary.validNa > 0
                        ? ` · ${summary.validNa} valid N/A excluded`
                        : ""}
                    </p>
                  </div>
                  <Progress
                    value={percent}
                    aria-valuenow={Number(percent.toFixed(2))}
                    className="h-2"
                    aria-label="Self-reported sample progress"
                  />
                </div>
              ) : summary.kind === "not_applicable" ? (
                <p role="status" className="text-sm leading-relaxed text-muted-foreground">
                  Not applicable — every configured item is a valid N/A, so no
                  percentage is shown.
                </p>
              ) : (
                <p role="status" className="text-sm leading-relaxed text-muted-foreground">
                  No sample items are configured — no score is shown.
                </p>
              )}
              <div className="flex flex-col gap-2.5 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={loadWorkedExample}>Load worked example</Button>
                  <Button variant="outline" onClick={resetDemo}>
                    Reset
                  </Button>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Entries are held in this page only and reset on reload.
                </p>
              </div>
              {summary.kind === "ok" ? (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Gaps
                  </h3>
                  {summary.gaps.length > 0 ? (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {summary.gaps.map((gap) => (
                        <li key={gap.id} className="text-xs leading-relaxed">
                          <span className="font-mono font-medium">{gap.id}</span>{" "}
                          <span className="text-muted-foreground">
                            —{" "}
                            {fieldById.get(gap.id as DemoFieldId)?.shortLabel} ·{" "}
                            {gapStatusLabel(gap.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      No gaps — every applicable item is marked ready.
                    </p>
                  )}
                  {validNaIds.length > 0 ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Excluded as valid N/A (reason recorded):{" "}
                      <span className="font-mono">{validNaIds.join(", ")}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <ol className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
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
      </div>
    </section>
  );
}
