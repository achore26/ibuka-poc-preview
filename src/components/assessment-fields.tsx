/*
 * Shared per-field controls and state actions for the answer-first assessment
 * (UX contract, 30 September 2026). Used identically by the anonymous preview
 * and the signed-in autosaving form so behaviour cannot drift.
 *
 * The user enters the actual information; readiness is an explicit
 * "Ready for review" action gated on adequacy — never inferred from typing.
 * Partial answers stay Draft with a visible missing-information hint.
 */

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  answerAdequate,
  dateValueIssue,
  missingForReview,
  numberValueIssue,
  type SampleAnswer,
} from "@/lib/enabled-sample";

export interface FieldSpecLike {
  id: string;
  prompt: string;
  shortLabel: string;
  source: string;
  control: "text" | "date" | "select" | "currency" | "currency_date" | "narrative" | "yes-no" | "conditional-text";
  allowsNa: boolean;
  selectOptions?: string[];
}

const hintClass = "text-xs leading-relaxed text-muted-foreground";
const controlClass = "h-11 sm:h-9";

export function FieldStatusBadge({ answer }: { answer: SampleAnswer }) {
  if (answer.status === "na") return <Badge variant="secondary">Not applicable</Badge>;
  if (answer.status === "ready")
    return (
      <Badge variant="outline" className="border-primary/35 bg-primary/10 font-medium text-primary">
        Ready for review
      </Badge>
    );
  if (answer.status === "in_progress") return <Badge variant="outline">Draft</Badge>;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not started
    </Badge>
  );
}

function ControlError({ id, issue }: { id: string; issue: string | null }) {
  if (!issue) return null;
  return (
    <p id={id} role="alert" className={hintClass}>
      {issue}
    </p>
  );
}

/*
 * The typed-answer area for one field. Validation messages appear as typed
 * (client mirror of the database rules) and never block editing.
 *
 * Labelling contract (HCI review, 30 September 2026): the article heading IS
 * the verbatim prompt. For short typed controls the heading is the ONE
 * visible label and the control is associated with it via
 * aria-labelledby (no duplicated shortLabel label); long narrative prompts
 * keep a short visible secondary label above the textarea, and compound
 * controls keep a visible label where two inputs must be told apart.
 *
 * aria-describedby contract (D3/D4, 30 September 2026): every describedby
 * target is the id of an issue element that is ACTUALLY RENDERED for that
 * exact control — compound currency_date controls use distinct ids for the
 * amount and the as-at date (never a shared/duplicated id), and the plain
 * text control, which renders no issue element, omits describedby entirely.
 */
function FieldControl({
  field,
  answer,
  onTypedChange,
}: {
  field: FieldSpecLike;
  answer: SampleAnswer;
  onTypedChange: (patch: Partial<SampleAnswer>) => void;
}) {
  switch (field.control) {
    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          <Input
            id={`${field.id}-text`}
            className={controlClass}
            autoComplete="off"
            value={answer.text}
            onChange={(event) => onTypedChange({ text: event.target.value })}
            aria-labelledby={`${field.id}-prompt`}
          />
        </div>
      );
    case "date": {
      const issue = dateValueIssue(answer.dateValue);
      return (
        <div className="flex flex-col gap-1.5">
          <Input
            id={`${field.id}-date`}
            type="date"
            className={`${controlClass} sm:max-w-56`}
            value={answer.dateValue}
            onChange={(event) => onTypedChange({ dateValue: event.target.value })}
            aria-labelledby={`${field.id}-prompt`}
            aria-describedby={issue ? `${field.id}-date-issue` : undefined}
          />
          <ControlError id={`${field.id}-date-issue`} issue={issue} />
        </div>
      );
    }
    case "select":
      return (
        <div className="flex flex-col gap-1.5">
          <select
            id={`${field.id}-select`}
            className={`${controlClass} w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-56`}
            value={answer.selectValue}
            onChange={(event) => onTypedChange({ selectValue: event.target.value })}
            aria-labelledby={`${field.id}-prompt`}
          >
            <option value="">Choose…</option>
            {(field.selectOptions ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );
    case "currency": {
      const issue = numberValueIssue(answer.numberValue);
      return (
        <div className="flex flex-col gap-1.5">
          <Input
            id={`${field.id}-amount`}
            className={`${controlClass} sm:max-w-56`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={answer.numberValue}
            onChange={(event) => onTypedChange({ numberValue: event.target.value })}
            aria-labelledby={`${field.id}-prompt`}
            aria-describedby={issue ? `${field.id}-amount-issue` : undefined}
          />
          <ControlError id={`${field.id}-amount-issue`} issue={issue} />
        </div>
      );
    }
    case "currency_date": {
      const amountIssue = numberValueIssue(answer.numberValue);
      const dateIssue = dateValueIssue(answer.dateValue);
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Input
              id={`${field.id}-amount`}
              className={`${controlClass} sm:max-w-56`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={answer.numberValue}
              onChange={(event) => onTypedChange({ numberValue: event.target.value })}
              aria-labelledby={`${field.id}-prompt`}
              aria-describedby={amountIssue ? `${field.id}-amount-issue` : undefined}
            />
            <ControlError id={`${field.id}-amount-issue`} issue={amountIssue} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${field.id}-as-at`} className="text-sm font-medium">
              As at (date of the amount above)
            </label>
            <Input
              id={`${field.id}-as-at`}
              type="date"
              className={`${controlClass} sm:max-w-56`}
              value={answer.dateValue}
              onChange={(event) => onTypedChange({ dateValue: event.target.value })}
              aria-describedby={dateIssue ? `${field.id}-as-at-issue` : undefined}
            />
            <ControlError id={`${field.id}-as-at-issue`} issue={dateIssue} />
          </div>
        </div>
      );
    }
    case "narrative":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${field.id}-narrative`} className="text-sm font-medium">
            {field.shortLabel}
          </label>
          <Textarea
            id={`${field.id}-narrative`}
            rows={5}
            value={answer.text}
            onChange={(event) => onTypedChange({ text: event.target.value })}
          />
        </div>
      );
    case "yes-no":
      return (
        <div className="flex flex-col gap-1.5">
          <fieldset>
            <legend className="text-sm font-medium">{field.shortLabel}</legend>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {(["yes", "no"] as const).map((value) => (
                <label key={value} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
                  <input
                    type="radio"
                    className="size-4 accent-primary"
                    name={`${field.id}-yesno`}
                    value={value}
                    checked={answer.yesNo === value}
                    onChange={() => onTypedChange({ yesNo: value })}
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
              />
            </div>
          ) : null}
          <p className={hintClass}>A recorded No is a complete answer; Yes requires the circumstances above.</p>
        </div>
      );
    case "conditional-text":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${field.id}-text`} className="text-sm font-medium">
            {field.shortLabel}
          </label>
          <Textarea
            id={`${field.id}-text`}
            rows={3}
            value={answer.text}
            onChange={(event) => onTypedChange({ text: event.target.value })}
          />
        </div>
      );
  }
}

/*
 * One assessment field: verbatim prompt heading (the single visible label for
 * short typed controls — see FieldControl), a secondary "Source" disclosure
 * holding the supplied ID, the exact source reference and the verbatim source
 * question (provenance stays available without printing it on every card),
 * the typed control, and the explicit state actions. `statusSlot` carries the
 * per-item autosave indicator in the saved form.
 */
export function AssessmentField({
  field,
  answer,
  onTypedChange,
  onMarkReady,
  onReturnToDraft,
  onMarkNotApplicable,
  onUndoNotApplicable,
  statusSlot,
}: {
  field: FieldSpecLike;
  answer: SampleAnswer;
  onTypedChange: (patch: Partial<SampleAnswer>) => void;
  onMarkReady: () => void;
  onReturnToDraft: () => void;
  onMarkNotApplicable: () => void;
  onUndoNotApplicable: () => void;
  statusSlot?: ReactNode;
}) {
  const adequate = answerAdequate(field, answer);
  const missing = missingForReview(field, answer);
  const markingNotApplicable = answer.status === "na";

  return (
    <article aria-label={field.shortLabel}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h4 id={`${field.id}-prompt`} className="text-pretty text-[15px] font-semibold leading-snug">
          {field.prompt}
        </h4>
        <span className="ms-auto flex items-center gap-2">
          <FieldStatusBadge answer={answer} />
          {statusSlot}
        </span>
      </div>
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="min-h-11 cursor-pointer select-none rounded py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:py-0">
          Source
        </summary>
        <div className="mt-1 flex flex-col gap-0.5 border-l pl-3 leading-relaxed">
          <p>
            Supplied ID <span className="font-mono">{field.id}</span> · Source ref{" "}
            <span className="font-mono">{field.source}</span>
          </p>
          <p>Verbatim source question: “{field.prompt}”</p>
        </div>
      </details>

      <div className="mt-4 flex flex-col gap-4">
        {markingNotApplicable ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${field.id}-na-reason`} className="text-sm font-medium">
              Reason this does not apply
            </label>
            <Textarea
              id={`${field.id}-na-reason`}
              rows={2}
              value={answer.naReason}
              onChange={(event) => onTypedChange({ naReason: event.target.value })}
            />
            {answer.naReason.trim() === "" ? (
              <p className={hintClass}>
                A recorded reason is required before this can be saved — until then the item stays in the
                progress denominator as a gap.
              </p>
            ) : (
              <p className={hintClass}>Reason recorded — this item is excluded from the progress calculation.</p>
            )}
            <div>
              <Button variant="outline" className="h-11 sm:h-9" onClick={onUndoNotApplicable}>
                Undo not applicable
              </Button>
            </div>
          </div>
        ) : (
          <>
            <FieldControl field={field} answer={answer} onTypedChange={onTypedChange} />
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:gap-3">
              {answer.status === "ready" ? (
                <>
                  <p className="text-sm text-muted-foreground" role="status">
                    Marked ready for review.
                  </p>
                  <Button
                    variant="outline"
                    className="h-11 sm:ms-auto sm:h-9"
                    onClick={onReturnToDraft}
                  >
                    Return to draft
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="h-11 sm:h-9"
                    disabled={!adequate}
                    aria-describedby={adequate ? undefined : `${field.id}-missing`}
                    onClick={onMarkReady}
                  >
                    Ready for review
                  </Button>
                  {field.allowsNa ? (
                    <Button variant="outline" className="h-11 sm:h-9" onClick={onMarkNotApplicable}>
                      Not applicable…
                    </Button>
                  ) : null}
                  <p id={`${field.id}-missing`} className={`${hintClass} sm:ms-auto sm:text-right`}>
                    {missing}
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
