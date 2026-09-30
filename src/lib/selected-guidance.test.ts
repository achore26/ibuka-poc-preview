/*
 * Built-in Node fixtures: the separately authored selected-only guidance is
 * keyed by EXACTLY the ten enabled field IDs of the generated sample — no
 * missing helper, no extra key (an extra key would mean the module knows
 * about an item that is not enabled), and CP-13's expanded labels cover the
 * stored option values verbatim. Run with: npm test
 */

import { enabledFields } from "./enabled-sample.ts";
import { SELECTED_GUIDANCE_IDS, getSelectedGuidance, selectedGuidance } from "./selected-guidance.ts";

let failures = 0;
function check(condition: boolean, note: string): void {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${note}`);
  }
}

const enabledIds = enabledFields.map((field) => field.id);
const guidanceIds = [...SELECTED_GUIDANCE_IDS];

check(
  enabledIds.length === 10 && guidanceIds.length === 10,
  `expected exactly ten enabled items and ten guidance keys (got ${enabledIds.length}/${guidanceIds.length})`,
);

for (const id of enabledIds) {
  const guidance = getSelectedGuidance(id);
  check(guidance !== null, `missing guidance for enabled id ${id}`);
  if (guidance) {
    check(guidance.intro.trim().length > 0, `empty intro for ${id}`);
    check(guidance.intro.length <= 320, `intro for ${id} is too long for a concise helper (${guidance.intro.length} chars)`);
  }
}

for (const id of guidanceIds) {
  check(enabledIds.includes(id), `guidance key ${id} is not an enabled field id`);
}

const extraKeys = Object.keys(selectedGuidance).filter((key) => !guidanceIds.includes(key as never));
check(extraKeys.length === 0, `guidance module carries extra keys: ${extraKeys.join(", ")}`);

// CP-13: expanded display labels exist for each STORED option value, and the
// stored values themselves are untouched by this module.
const cp13 = enabledFields.find((field) => field.id === "CP-13");
check(cp13 !== undefined, "CP-13 not found in the enabled sample");
if (cp13 && cp13.control === "select" && cp13.selectOptions) {
  const labels = getSelectedGuidance("CP-13")?.selectOptionLabels;
  check(labels !== undefined, "CP-13 guidance has no selectOptionLabels");
  if (labels) {
    for (const option of cp13.selectOptions) {
      check(Object.prototype.hasOwnProperty.call(labels, option), `CP-13 option ${option} has no expanded label`);
    }
    const labelKeys = Object.keys(labels);
    check(
      labelKeys.length === cp13.selectOptions.length,
      `CP-13 expanded-label keys ${labelKeys.join(",")} do not match the stored options`,
    );
  }
}

// The acronym expansions are present and visible regardless of selection.
const cp13Note = getSelectedGuidance("CP-13")?.controlNote ?? [];
check(
  Object.values(getSelectedGuidance("CP-13")?.selectOptionLabels ?? {}).some((line) => line.includes("Main Investment Market Segment")),
  "CP-13 visible option label does not spell out MIMS",
);
check(
  Object.values(getSelectedGuidance("CP-13")?.selectOptionLabels ?? {}).some((line) => line.includes("Small and Medium Enterprises Market Segment")),
  "CP-13 visible option label does not spell out SMEMS",
);
check(
  cp13Note.some((line) => /draft/i.test(line) && /adviser/i.test(line)),
  "CP-13 control note does not direct unsure users to keep Draft and confirm with an adviser",
);

// Currency guidance never asserts a currency, converts or formats.
for (const id of ["SC-03", "CP-16"] as const) {
  const text = [getSelectedGuidance(id)?.intro ?? "", ...(getSelectedGuidance(id)?.bullets ?? [])].join(" ");
  check(!/KES|Kenyan shilling|₹|\$|€|£/i.test(text), `${id} guidance asserts a currency`);
  check(text.includes("2500000.50"), `${id} guidance lacks the plain-number example`);
}

if (failures > 0) {
  throw new Error(`selected-guidance.test: ${failures} failure(s)`);
}
console.log("selected-guidance.test: all checks pass");
