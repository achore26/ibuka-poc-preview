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
import { getSelectedGuidance } from "@/lib/selected-guidance";

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
const controlClass = "h-[52px] bg-background/60 px-4 text-[18px] md:text-[18px] shadow-none";
/* Guidance is modest muted readable help (14px), a size up from the 12px
 * validation hints so "what to enter" stays easier to read than errors. */
const helpClass = "text-sm leading-relaxed text-muted-foreground";

/*
 * ids of the elements ALWAYS RENDERED for this field that describe its
 * controls: the guidance block (rendered for every enabled id) and, when
 * authored, the always-visible control note (e.g. both segment definitions
 * for CP-13). Issue-element ids are appended per control only while that
 * issue element is actually rendered.
 */
function fieldHelpIds(field: FieldSpecLike): string[] {
  const guidance = getSelectedGuidance(field.id);
  if (!guidance) return [];
  const ids = [`${field.id}-help`];
  if (guidance.controlNote) ids.push(`${field.id}-note`);
  if (field.control === "currency" || field.control === "currency_date") ids.push(`${field.id}-format`);
  return ids;
}

function joinDescribed(ids: string[]): string | undefined {
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function FieldStatusBadge({ answer }: { answer: SampleAnswer }) {
  if (answer.status === "na") return <Badge variant="secondary">Not applicable</Badge>;
  if (answer.status === "ready") return <span><span aria-hidden="true">✓ </span><span>Ready for review</span></span>;
  if (answer.status === "in_progress") return <span>Draft</span>;
  return null;
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
 * label the textarea directly through the prompt heading, and compound
 * controls keep a visible label where two inputs must be told apart.
 *
 * aria-describedby contract (D3/D4 + guidance task, 30 September 2026): every
 * describedby target is the id of an element that is ACTUALLY RENDERED for
 * that exact control. Each actual input/select/textarea references its
 * rendered guidance (and the field's always-rendered control note when
 * authored) plus its OWN rendered issue element — compound currency_date
 * controls use distinct ids for the amount and the as-at date (never a
 * shared/duplicated id). A control with neither guidance nor a rendered
 * issue omits describedby entirely.
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
  const baseIds = fieldHelpIds(field);
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
            aria-describedby={joinDescribed(baseIds)}
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
            className={controlClass}
            value={answer.dateValue}
            onChange={(event) => onTypedChange({ dateValue: event.target.value })}
            aria-labelledby={`${field.id}-prompt`}
            aria-describedby={joinDescribed(issue ? [...baseIds, `${field.id}-date-issue`] : baseIds)}
          />
          <ControlError id={`${field.id}-date-issue`} issue={issue} />
        </div>
      );
    }
    case "select": {
      const guidance = getSelectedGuidance(field.id);
      return (
        <fieldset aria-labelledby={`${field.id}-prompt`} aria-describedby={joinDescribed(baseIds)} className="grid gap-3">
          {(field.selectOptions ?? []).map((option) => (
            <label key={option} className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm leading-5 ${answer.selectValue === option ? "border-foreground/50 bg-background" : "border-input hover:bg-background/60"}`}>
              <input id={`${field.id}-${option}`} type="radio" name={`${field.id}-segment`} value={option} checked={answer.selectValue === option} onChange={() => onTypedChange({ selectValue: option })} aria-describedby={joinDescribed(baseIds)} className="size-4 shrink-0 accent-primary" />
              <span>{guidance?.selectOptionLabels?.[option] ?? option}</span>
            </label>
          ))}
        </fieldset>
      );
    }
    case "currency": {
      const issue = numberValueIssue(answer.numberValue);
      return (
        <div className="flex flex-col gap-1.5">
          <Input
            id={`${field.id}-amount`}
            className={controlClass}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Enter amount"
            value={answer.numberValue}
            onChange={(event) => onTypedChange({ numberValue: event.target.value })}
            aria-labelledby={`${field.id}-prompt`}
            aria-describedby={joinDescribed(issue ? [...baseIds, `${field.id}-amount-issue`] : baseIds)}
          />
          <ControlError id={`${field.id}-amount-issue`} issue={issue} />
        </div>
      );
    }
    case "currency_date": {
      const amountIssue = numberValueIssue(answer.numberValue);
      const dateIssue = dateValueIssue(answer.dateValue);
      return (
        <div className="grid gap-4 sm:max-w-lg sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label id={`${field.id}-amount-label`} htmlFor={`${field.id}-amount`} className="text-sm font-medium">Asset amount</label>
            <Input
              id={`${field.id}-amount`}
              className={controlClass}
              inputMode="decimal"
              autoComplete="off"
              placeholder="Enter amount"
              value={answer.numberValue}
              onChange={(event) => onTypedChange({ numberValue: event.target.value })}
              aria-labelledby={`${field.id}-prompt ${field.id}-amount-label`}
              aria-describedby={joinDescribed(
                amountIssue ? [...baseIds, `${field.id}-amount-issue`] : baseIds,
              )}
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
              className={controlClass}
              value={answer.dateValue}
              onChange={(event) => onTypedChange({ dateValue: event.target.value })}
              aria-describedby={joinDescribed(
                dateIssue ? [...baseIds, `${field.id}-as-at-issue`] : baseIds,
              )}
            />
            <ControlError id={`${field.id}-as-at-issue`} issue={dateIssue} />
          </div>
        </div>
      );
    }
    case "narrative":
      return (
        <div className="flex flex-col gap-1.5">

          <Textarea
            id={`${field.id}-narrative`}
            aria-labelledby={`${field.id}-prompt`}
            className="min-h-[180px] bg-background/40 px-4 py-3 text-base leading-7 shadow-none"
            rows={5}
            value={answer.text}
            onChange={(event) => onTypedChange({ text: event.target.value })}
            aria-describedby={joinDescribed(baseIds)}
          />
        </div>
      );
    case "yes-no":
      return (
        <div className="flex flex-col gap-1.5">
          <fieldset aria-describedby={joinDescribed(baseIds)}>
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
                aria-describedby={joinDescribed(baseIds)}
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
            aria-describedby={joinDescribed(baseIds)}
          />
        </div>
      );
  }
}

/*
 * The proposed plain-language guidance for one enabled field: rendered
 * DIRECTLY UNDER the verbatim prompt heading, always visible — never behind
 * the Source disclosure and never only a control placeholder. Proposed
 * product help, not validated content (see src/lib/selected-guidance.ts).
 * The id is stable per field so every control references it through
 * aria-describedby.
 */
function FieldGuidanceBlock({ field }: { field: FieldSpecLike }) {
  const guidance = getSelectedGuidance(field.id);
  if (!guidance) return null;
  return <p id={`${field.id}-help`} className={`mt-1.5 text-pretty ${helpClass}`}><span className="sr-only">Guidance: </span>{guidance.intro}</p>;
}

/*
 * One assessment field: verbatim prompt heading (the single visible label for
 * short typed controls — see FieldControl), the always-visible proposed
 * guidance (FieldGuidanceBlock), a secondary "Source" disclosure
 * holding the supplied ID, the exact source reference and the verbatim source
 * question (provenance stays available without printing it on every card),
 * the typed control plus the always-visible control note (e.g. both CP-13
 * segment definitions), and the explicit state actions. `statusSlot` carries
 * the per-item autosave indicator in the saved form.
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
  const controlNote = getSelectedGuidance(field.id)?.controlNote;
  const inputIssue = (field.control === "currency" || field.control === "currency_date") && numberValueIssue(answer.numberValue)
    || (field.control === "date" || field.control === "currency_date") && dateValueIssue(answer.dateValue);
  const showMissing = !adequate && answer.status !== "not_started" && !inputIssue;

  return (
    <article id={`question-${field.id}`} aria-label={field.shortLabel} className={`scroll-mt-24 ${field.control === "narrative" ? "narrative-row" : "grid gap-5 lg:grid-cols-[minmax(0,32fr)_minmax(0,68fr)] lg:gap-8"}`}>
      <div className="question-prompt">
        <p className="mb-2 font-mono text-[11px] tracking-wide text-muted-foreground">{field.id}</p>
        <h4 id={`${field.id}-prompt`} className={`text-pretty font-semibold ${field.control === "narrative" ? "text-[21px] leading-[29px]" : "text-[18px] leading-6"}`}>{field.prompt}</h4>
        <FieldGuidanceBlock field={field} />
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">Guidance and source</summary>
          <div className="space-y-2 border-l pl-3 leading-5">
            {getSelectedGuidance(field.id)?.bullets?.map((tip) => <p key={tip}>{tip}</p>)}
            <p>Supplied ID <span className="font-mono">{field.id}</span> · Source ref <span className="font-mono">{field.source}</span></p>
            <p>Verbatim source question: “{field.prompt}”</p>
          </div>
        </details>
      </div>
      <div className={`flex min-w-0 flex-col gap-4 ${field.control === "narrative" ? "mt-4" : ""}`}>
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
              <Button variant="outline" className="h-11" onClick={onUndoNotApplicable}>
                Undo not applicable
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <FieldControl field={field} answer={answer} onTypedChange={onTypedChange} />
              {field.control === "currency" || field.control === "currency_date" ? <p id={`${field.id}-format`} className={hintClass}>Full units · no commas or symbols · 0 is valid</p> : null}
              {controlNote && controlNote.length > 0 ? (
                <div id={`${field.id}-note`} className={`flex flex-col gap-0.5 ${helpClass}`}>
                  {controlNote.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
              {answer.status !== "not_started" || statusSlot ? <span className="flex items-center gap-2 text-xs text-muted-foreground"><FieldStatusBadge answer={answer} />{statusSlot}</span> : null}
              {answer.status === "ready" ? (
                <>
                  <Button
                    variant="ghost"
                    className="h-11 ms-auto"
                    onClick={onReturnToDraft}
                  >
                    Return to draft
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={!adequate}
                    aria-describedby={showMissing ? `${field.id}-missing` : undefined}
                    onClick={onMarkReady}
                  >
                    Mark ready for review
                  </Button>
                  {field.allowsNa ? (
                    <Button variant="outline" className="h-11" onClick={onMarkNotApplicable}>
                      Not applicable…
                    </Button>
                  ) : null}
                  {showMissing ? <p id={`${field.id}-missing`} className={`${hintClass} sm:ms-auto sm:text-right`}>{missing}</p> : null}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
