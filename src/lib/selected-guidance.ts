/*
 * Selected-question plain-language guidance (test-only release, 30 September
 * 2026). Separately authored product help keyed by the TEN ENABLED field IDs
 * of sample 2026-09-cmp-sample-2 — it is NOT part of the generated sample,
 * the source catalogue or the generator pipeline, and it deliberately knows
 * nothing about any other catalogue item. Prompts, IDs, option values, data
 * writes, validation and source disclosures are unchanged by this module.
 *
 * Status: PROPOSED product help (what to enter), authored for this task.
 * It is not Trevor-validated content, not regulatory advice and not a
 * listing-eligibility determination. The MIMS/SMEMS acronym expansions are
 * the only sourced statements (CMA Capital Markets Annual Supervision Report,
 * market-segments section, observed 30 September 2026,
 * https://www.cmarcp.or.ke/images/2026/CAPITALMARKETSANNUALSUPERVISIONREPORT.pdf
 * ) — no other claim is taken from that source.
 *
 * Currency discipline: the source contract does NOT define currency units,
 * so the guidance never asserts KES, converts or formats: plain numbers in
 * full units (example 2500000.50), no commas or symbols, 0 is valid.
 */

/** The ten enabled IDs this module is authored for (kept in display order). */
export const SELECTED_GUIDANCE_IDS = [
  "CP-01",
  "CP-07",
  "CP-13",
  "SC-03",
  "CP-16",
  "Q-BUS-01",
  "Q-BUS-03",
  "Q-RISK-01",
  "Q-FIN-02",
  "Q-FIN-03",
] as const;

export type SelectedGuidanceId = (typeof SELECTED_GUIDANCE_IDS)[number];

export interface SelectedFieldGuidance {
  /** One concise plain-language sentence shown directly under the prompt. */
  intro: string;
  /** Optional short bullets/examples (kept brief; shown under the intro). */
  bullets?: readonly string[];
  /**
   * Expanded visible label for select options. Keys are the STORED option
   * values (unchanged); the expanded text is display-only.
   */
  selectOptionLabels?: Readonly<Record<string, string>>;
  /**
   * Always-visible note lines rendered under the control (e.g. both segment
   * definitions for CP-13, regardless of the current selection).
   */
  controlNote?: readonly string[];
}

const CURRENCY_BULLETS: readonly string[] = [
  "Plain number in full units, e.g. 2500000.50 — no commas or symbols; 0 is valid.",
  "Currency units are not set by the source form: enter the full amount in the units your statements use.",
];

export const selectedGuidance: Readonly<Record<SelectedGuidanceId, SelectedFieldGuidance>> = {
  "CP-01": {
    intro:
      "The company’s exact registered legal name as recorded on its incorporation documents — for this test workspace, use a fictional equivalent rather than any real company.",
  },
  "CP-07": {
    intro: "Enter the incorporation date. This is separate from continuous operating history.",
    bullets: ["If your documents show different dates, leave this as Draft and confirm the discrepancy with your adviser."],
  },
  "CP-13": {
    intro: "The Nairobi Securities Exchange market segment being considered for the listing.",
    selectOptionLabels: {
      MIMS: "MIMS — Main Investment Market Segment",
      SMEMS: "SMEMS — Small and Medium Enterprises Market Segment",
    },
    controlNote: [
      "MIMS — Main Investment Market Segment.",
      "SMEMS — Small and Medium Enterprises Market Segment.",
      "If you are unsure which segment applies, leave this as a Draft and confirm with your adviser — this form does not determine eligibility or recommend a segment.",
    ],
  },
  "SC-03": {
    intro:
      "The paid-up amount: what shareholders have actually paid for the issued shares — not the authorised share capital and not unpaid amounts.",
    bullets: CURRENCY_BULLETS,
  },
  "CP-16": {
    intro:
      "From the statement of financial position you choose: the total-assets figure, entered together with that same statement’s as-at date.",
    bullets: CURRENCY_BULLETS,
    controlNote: [
      "Use the figures of one chosen statement and its own statement date, so the amount and the as-at date always belong together.",
    ],
  },
  "Q-BUS-01": {
    intro: "Name each material product or service and explain its relative importance to revenue.",
    bullets: ["A few short paragraphs are enough; name the main revenue contributors."],
  },
  "Q-BUS-03": {
    intro:
      "Describe the principal markets and revenue by business segment and geography for the most recent historical financial period reported.",
    bullets: [
      "Name that reporting period and use it consistently for each revenue split.",
      "Label any estimate as an estimate rather than presenting it as audited data.",
    ],
  },
  "Q-RISK-01": {
    intro:
      "List the key risks specific to the business or industry, pairing each risk with the mitigation measure the board has put in place for it.",
    bullets: ["Aim for one risk–mitigation pair per risk so nothing is listed without its mitigation."],
  },
  "Q-FIN-02": {
    intro:
      "Describe any significant change in the financial or trading position since the latest published statements — with its effect and timing — or say explicitly that there has been none.",
    bullets: ["“None” is a complete answer when nothing significant has changed — state it plainly."],
  },
  "Q-FIN-03": {
    intro:
      "State whether issued capital — including any amounts to be raised — is adequate for at least the next 9 months, based on the source date you rely on.",
    bullets: [
      "If it is adequate, say so and name the period you assessed.",
      "If it is not adequate, give the shortfall and the funding plan, including the proposed raise.",
    ],
  },
};

/** Guidance lookup for an enabled field id; null for anything unknown. */
export function getSelectedGuidance(id: string): SelectedFieldGuidance | null {
  const entry = (selectedGuidance as Record<string, SelectedFieldGuidance | undefined>)[id];
  return entry ?? null;
}
