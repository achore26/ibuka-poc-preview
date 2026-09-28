/*
 * The proposed four-item demo sample for the review preview, defined once so
 * the exact supplied IDs, verbatim prompts and source references are shown on
 * the page for inspection (B02 proposal — awaiting Trevor's validation, see
 * ClickUp C03). This is the full extent of the sample: the wider field
 * dictionary is later scope and is deliberately not included.
 *
 * Demo answers are transient placeholders held in page memory only. They are
 * never saved, sent anywhere, or shown to be real company data.
 */

import type { SampleReadinessStatus } from "./sample-progress";

export type DemoFieldId = "CP-07" | "Q-DIR-01" | "Q-ISS-01" | "Q-OFR-03";

export type DemoControl = "date" | "yes-no" | "narrative" | "conditional-text";

export interface DemoFieldSpec {
  id: DemoFieldId;
  /** Verbatim prompt/label from the B02 proposal. Do not reword. */
  prompt: string;
  /** Short navigation label for gap lists; never a replacement for the prompt. */
  shortLabel: string;
  /** Source reference shown beside the prompt (B02 source column). */
  source: string;
  control: DemoControl;
  /** Only Q-OFR-03 has a proposed applicability (N/A) path. */
  allowsNa: boolean;
}

export const demoFields: readonly DemoFieldSpec[] = [
  {
    id: "CP-07",
    prompt: "Date of incorporation",
    shortLabel: "Date of incorporation",
    source: "Field Dictionary, Company Profile; First Schedule A.1 / 6th Sch. 3.3",
    control: "date",
    allowsNa: false,
  },
  {
    id: "Q-DIR-01",
    prompt:
      "Has any auditor resigned, been removed, or not been reappointed in the last 3 years? If yes, describe the circumstances and any concerns they raised.",
    shortLabel: "Auditor changes in the last 3 years",
    source: "Field Dictionary, Narrative Drafting Question Bank; 6th Sch. 1.4",
    control: "yes-no",
    allowsNa: false,
  },
  {
    id: "Q-ISS-01",
    prompt:
      "Describe the company's principal objects and activities. Are there any government protection or investment-encouragement laws that specifically benefit your business?",
    shortLabel: "Principal objects and activities",
    source: "Field Dictionary, Narrative Drafting Question Bank; 6th Sch. 3.5",
    control: "narrative",
    allowsNa: false,
  },
  {
    id: "Q-OFR-03",
    prompt:
      "If applicable to a foreign listing, describe any exchange-traded call option arrangements.",
    shortLabel: "Call option arrangements (foreign listing)",
    source: "Field Dictionary, Narrative Drafting Question Bank; 6th Sch. 13.25",
    control: "conditional-text",
    allowsNa: true,
  },
];

/** Transient demo answer for one field. Held in React state only. */
export interface DemoAnswer {
  /** Recorded readiness state, separate from the typed answer. */
  status: SampleReadinessStatus;
  /** CP-07 typed value (empty string or a date input value). */
  dateValue: string;
  /** Q-DIR-01 Yes/No choice; "" until a button is chosen. */
  yesNo: "" | "yes" | "no";
  /** Narrative / conditional-details text. */
  text: string;
  /** Recorded N/A reason (Q-OFR-03 only). */
  naReason: string;
}

export function initialDemoAnswer(): DemoAnswer {
  return { status: "not_started", dateValue: "", yesNo: "", text: "", naReason: "" };
}

/*
 * Whether the typed demo answer is adequate for the field to be marked
 * ready. A recorded No to Q-DIR-01 is a complete answer on its own; Yes
 * requires the circumstances/details text. Text adequacy in this demo means
 * non-empty; real adequacy review is Trevor's (C03), not this rule.
 * (The parameter is structurally typed so the saved assessment, whose field
 * ids are validated server-supplied strings, can share this exact rule.)
 */
export function answerAdequate(
  field: Pick<DemoFieldSpec, "control">,
  answer: DemoAnswer,
): boolean {
  switch (field.control) {
    case "date":
      return answer.dateValue.trim() !== "";
    case "yes-no":
      return (
        answer.yesNo === "no" || (answer.yesNo === "yes" && answer.text.trim() !== "")
      );
    case "narrative":
    case "conditional-text":
      return answer.text.trim() !== "";
  }
}

/*
 * The "Load worked example" presenter affordance: purely synthetic in-memory
 * values matching the B02 fixed case (CP-07 ready, Q-DIR-01 answered No and
 * ready, Q-ISS-01 in progress, Q-OFR-03 N/A with a recorded reason →
 * 2 / 3 = 66.67% with Q-ISS-01 as the only gap). No real company, date or
 * narrative; everything stays transient page state like hand-typed entries.
 */
export function workedExampleAnswers(): Record<DemoFieldId, DemoAnswer> {
  return {
    "CP-07": {
      ...initialDemoAnswer(),
      status: "ready",
      dateValue: "1970-01-01", // unmistakably a demo epoch date, not a real incorporation
    },
    "Q-DIR-01": {
      ...initialDemoAnswer(),
      status: "ready",
      yesNo: "no",
    },
    "Q-ISS-01": {
      ...initialDemoAnswer(),
      status: "in_progress",
      text: "Demo placeholder: a fictional company operates demonstration facilities for this preview; no real government protection or investment-encouragement laws are described.",
    },
    "Q-OFR-03": {
      ...initialDemoAnswer(),
      status: "na",
      naReason:
        "Demo placeholder: this worked example treats the listing as domestic (NSE only), not a foreign listing, so the call-option arrangement question does not apply.",
    },
  };
}
