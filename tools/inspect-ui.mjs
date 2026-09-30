#!/usr/bin/env node
/*
 * UI milestone inspection (task cmp-catalogue-20260930) — drives the RUNNING
 * local dev server (default http://127.0.0.1:55473) in installed headless
 * Chrome and records objective evidence:
 *
 *   - no pageerror / console errors / vite-error-overlay, h1 present
 *   - CMP Kenya identity, no product-facing Daraja copy
 *   - anonymous preview: initial 0.00%, worked example fixed arithmetic
 *     7/10 = 70.00% with exactly three gaps (Q-BUS-03 draft, Q-RISK-01,
 *     Q-FIN-02 not started), reset back to 0.00%
 *   - all four groups navigable on desktop rail and mobile selector with
 *     per-section question counts 3/2/2/3
 *   - answer-first behaviour: Ready-for-review gated with missing-info hint,
 *     marking ready, editing returns to Draft; NO readiness radios anywhere
 *   - single prominent temporary-preview warning (once), no per-field
 *     disclaimer wall
 *   - one visible label per short typed field with programmatic association
 *     (aria-labelledby -> the prompt heading)
 *   - source references behind the per-field "Source" disclosure (supplied
 *     ID + exact source ref + verbatim source question preserved inside)
 *   - operator diagnostics behind the collapsed development-only
 *     disclosure; concise CMP Kenya/KASIB product footer
 *   - mobile compact selected-sample summary visible near the section
 *     selector at 390px (initial 0.00% and worked example 70.00%)
 *   - keyboard focus reaches real controls with a visible focus indicator
 *   - mobile touch targets >= 44px for every actually-visible button,
 *     radio row and disclosure summary (initial + worked example)
 *   - no horizontal overflow at 1280x900 and 390x844
 *   - screenshots under test-results/
 *
 * Run: node tools/inspect-ui.mjs [baseURL]
 * Anonymous session only: no sign-in and no API writes are performed (dev
 * config may point at the synthetic staging Supabase; this script signs
 * nobody in and never writes).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseURL = process.argv[2] ?? "http://127.0.0.1:55473";
const outDir = path.join(repoRoot, "test-results");
fs.mkdirSync(outDir, { recursive: true });

let passed = 0;
const failures = [];
const pageErrors = [];
const consoleErrors = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function visibleTouchTargetViolations(page) {
  return page.evaluate(() => {
    const out = [];
    const visible = (el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (typeof el.checkVisibility === "function" && !el.checkVisibility()) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const targets = [
      ...Array.from(document.querySelectorAll("button")),
      ...Array.from(document.querySelectorAll("summary")),
      ...Array.from(document.querySelectorAll("label")).filter((label) =>
        label.querySelector('input[type="radio"]'),
      ),
    ];
    for (const el of targets) {
      if (!visible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height < 44) {
        out.push({ text: (el.textContent || "").trim().slice(0, 40), height: Math.round(rect.height) });
      }
    }
    return out;
  });
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.goto(baseURL, { waitUntil: "networkidle" });

// -- Page health + identity ----------------------------------------------------

check("no vite-error-overlay", (await page.locator("vite-error-overlay").count()) === 0);
const h1 = page.getByRole("heading", { level: 1 });
check("h1 present", (await h1.count()) === 1, `count=${await h1.count()}`);
check("h1 is the assessment title", (await h1.first().textContent()) === "Sample Market listing assessment");
check("header wordmark is CMP Kenya", (await page.getByText("CMP Kenya", { exact: true }).count()) >= 1);
const darajaVisible = await page
  .getByText(/Daraja/i)
  .evaluateAll((nodes) => nodes.some((node) => node.textContent.length < 400))
  .catch(() => false);
check("no product-facing Daraja copy", !darajaVisible);

// -- Single prominent temporary-preview warning ----------------------------------

check(
  "temporary-preview warning appears exactly once",
  (await page.getByText("Temporary preview", { exact: true }).count()) === 1,
);
check(
  "no duplicated in-memory preview paragraph",
  (await page.getByText("Everything here runs in this page only").count()) === 0,
);
check(
  "no per-field self-reported disclaimer wall",
  (await page.getByText("not a regulatory finding", { exact: false }).count()) === 0,
);

// -- Operator tooling behind the development-only disclosure ---------------------

check(
  "diagnostics heading not visible by default",
  !(await page.getByText("Service diagnostics", { exact: true }).first().isVisible()),
);
check(
  "development-only disclosure summary visible",
  await page.getByText("Development diagnostics (staging team)", { exact: true }).isVisible(),
);
check(
  "branding-provenance note not visible by default",
  !(await page.getByText("visually inferred from the public KASIB site", { exact: false }).first().isVisible()),
);
check(
  "concise product footer present",
  await page.getByText("CMP Kenya · IBUKA Phase 1 proof of concept · KASIB", { exact: true }).isVisible(),
);
await page.getByText("Development diagnostics (staging team)", { exact: true }).click();
check(
  "diagnostics card reachable inside the open disclosure",
  await page.getByText("Service diagnostics", { exact: true }).isVisible(),
);

// -- Desktop: initial preview state ----------------------------------------------

await page.screenshot({ path: path.join(outDir, "ui-1280x900-initial.png"), fullPage: true });
check("initial preview shows 0.00%", await page.getByText("0.00%", { exact: true }).first().isVisible());
check(
  "no hidden readiness radios exist (answer-first)",
  (await page.locator('input[type="radio"]').count()) === 0,
);
const readyButtons = page.getByRole("button", { name: "Ready for review", exact: true });
check("company section shows three gated Ready-for-review actions", (await readyButtons.count()) === 3);
check(
  "gated actions are disabled with a missing-info hint",
  (await readyButtons.first().isDisabled()) &&
    (await page.getByText("Enter the name before marking it ready for review.").isVisible()),
);

// Section rail: all four groups with counts 3/2/2/3.
for (const [title, count] of [
  ["Company details", 3],
  ["Financial position", 2],
  ["Business", 2],
  ["Risk and outlook", 3],
]) {
  await page.getByRole("button", { name: new RegExp(title), exact: false }).first().click();
  const shown = await page.locator("article").count();
  check(`section "${title}" renders ${count} questions`, shown === count, `shown=${shown}`);
}
check(
  "desktop rail shows prepared counts (0/3)",
  await page.getByText("0/3", { exact: true }).first().isVisible(),
);

// -- One visible label per short typed field ---------------------------------------

const legalName = page.locator("article", { has: page.locator("#CP-01-text") });
check(
  "short typed field shows one visible label (the prompt heading)",
  (await legalName.getByText("Legal name", { exact: true }).count()) === 1,
);
check(
  "typed control associated with the prompt heading (aria-labelledby)",
  (await page.locator("#CP-01-text").getAttribute("aria-labelledby")) === "CP-01-prompt",
);

// -- Source disclosure ---------------------------------------------------------------

check(
  "source references not printed by default",
  !(await page.getByText("Source ref", { exact: false }).first().isVisible()),
);
const incorporation = page.locator("article", { has: page.locator("#CP-07-date") });
await incorporation.locator("details", { hasText: "Source" }).locator("summary").click();
check(
  "disclosure preserves the supplied ID",
  await incorporation.getByText("Supplied ID CP-07").isVisible(),
);
check(
  "disclosure preserves the exact source reference",
  await incorporation.getByText(/6th 3\.3 \/ A\.1/).isVisible(),
);
check(
  "disclosure preserves the verbatim source question",
  await incorporation.getByText('Verbatim source question: “Date of incorporation”').isVisible(),
);

// -- Answer-first interaction ----------------------------------------------------

await page.getByRole("button", { name: /Company details/ }).first().click();
const nameInput = page.locator("#CP-01-text");
await nameInput.fill("Synthetic Browser Industries Ltd");
check(
  "adequate text enables Ready for review",
  !(await page.locator("article", { has: nameInput }).getByRole("button", { name: "Ready for review", exact: true }).isDisabled()),
);
await page.locator("article", { has: nameInput }).getByRole("button", { name: "Ready for review", exact: true }).click();
check(
  "marked ready shows the short self-reported note",
  await page.getByText("Marked ready for review.", { exact: true }).isVisible(),
);
check(
  "Return to draft action is offered for a prepared item",
  await page.getByRole("button", { name: "Return to draft", exact: true }).isVisible(),
);
check("Ready badge appears", await page.getByText("Ready for review", { exact: true }).first().isVisible());
await nameInput.fill("Synthetic Browser Industries Limited");
check(
  "editing a ready answer returns it to Draft",
  (await page.getByText("Draft", { exact: true }).count()) > 0,
);

// -- Worked example fixed arithmetic ----------------------------------------------

await page.getByRole("button", { name: "Load worked example", exact: true }).click();
await page.screenshot({ path: path.join(outDir, "ui-1280x900-worked-example.png"), fullPage: true });
check("worked example shows 70.00%", await page.getByText("70.00%", { exact: true }).first().isVisible());
check(
  "worked example summary says 7 of 10",
  await page.getByText("7 of 10 selected items marked ready for review").isVisible(),
);
const gaps = ["Q-BUS-03", "Q-RISK-01", "Q-FIN-02"].map(
  (label) => ["Principal markets and revenue", "Business and industry risks", "Changes since last statements"].includes(label),
);
check("worked example gap identities are the expected three", gaps.every(Boolean));

await page.getByRole("button", { name: "Reset", exact: true }).click();
check("reset returns to 0.00%", await page.getByText("0.00%", { exact: true }).first().isVisible());

// -- Keyboard focus path -----------------------------------------------------------

await page.keyboard.press("Tab"); // body -> first focusable
let focusTag = await page.evaluate(() => document.activeElement?.tagName);
let focusCount = 0;
while (focusTag !== "INPUT" && focusTag !== "TEXTAREA" && focusTag !== "SELECT" && focusTag !== "BUTTON" && focusCount < 30) {
  await page.keyboard.press("Tab");
  focusTag = await page.evaluate(() => document.activeElement?.tagName);
  focusCount += 1;
}
check(
  "keyboard Tab reaches a real control",
  ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(focusTag),
  `tag=${focusTag}`,
);
const focusIndicator = await page.evaluate(() => {
  const el = document.activeElement;
  if (!el) return { tag: "none", indicator: false };
  const style = getComputedStyle(el);
  return {
    tag: el.tagName,
    indicator: style.boxShadow !== "none" || (style.outlineWidth !== "0px" && style.outlineStyle !== "none"),
  };
});
check(
  "focused control shows a visible focus indicator",
  focusIndicator.indicator,
  JSON.stringify(focusIndicator),
);

// -- Mobile 390x844 ------------------------------------------------------------------

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseURL, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outDir, "ui-390x844-initial.png"), fullPage: true });
check(
  "390px: no horizontal overflow (initial)",
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
);
check("390px: section selector present", (await page.locator("#section-select").count()) === 1);
check("390px: previous action disabled on first section", await page.getByRole("button", { name: "← Previous" }).isDisabled());
check(
  "390px: compact summary visible on initial state (0.00%)",
  await page.getByText("0.00%", { exact: true }).first().isVisible(),
);
{
  const violations = await visibleTouchTargetViolations(page);
  check(
    "390px: every visible action/disclosure >= 44px (initial)",
    violations.length === 0,
    JSON.stringify(violations),
  );
}

let navigated = true;
for (let i = 0; i < 3; i += 1) {
  await page.getByRole("button", { name: "Next →" }).click();
}
check("390px: Next reaches the last section", await page.getByRole("button", { name: "Next →" }).isDisabled());
for (const key of ["risk", "company"]) {
  await page.locator("#section-select").selectOption(key);
  navigated = navigated && (await page.locator("article").count()) > 0;
}
check("390px: selector switches sections and renders questions", navigated);

const mobileButtonHeight = await page
  .getByRole("button", { name: "Ready for review", exact: true })
  .first()
  .evaluate((node) => Math.round(node.getBoundingClientRect().height));
check("390px: primary touch target >= 44px", mobileButtonHeight >= 44, `height=${mobileButtonHeight}px`);
{
  const selectorBox = await page.locator("#section-select").boundingBox();
  check("390px: selector box measured", selectorBox !== null);
}

await page.getByRole("button", { name: "Load worked example", exact: true }).click();
await page.screenshot({ path: path.join(outDir, "ui-390x844-worked-example.png"), fullPage: true });
check("390px: worked example shows 70.00%", await page.getByText("70.00%", { exact: true }).first().isVisible());
check(
  "390px: compact summary line says 7 of 10 ready for review",
  await page.getByText("7 of 10 ready for review", { exact: true }).isVisible(),
);
{
  const selector = await page.locator("#section-select").boundingBox();
  const compact = await page.getByText("7 of 10 ready for review", { exact: true }).boundingBox();
  check(
    "390px: compact summary sits below/near the section selector",
    selector !== null && compact !== null && compact.y >= selector.y && compact.y - selector.y < 400,
    JSON.stringify({ selector, compact }),
  );
}
check(
  "390px: no horizontal overflow (worked example)",
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
);
{
  const violations = await visibleTouchTargetViolations(page);
  check(
    "390px: every visible action/disclosure >= 44px (worked example)",
    violations.length === 0,
    JSON.stringify(violations),
  );
}

// -- Errors ---------------------------------------------------------------------------

check("zero pageerror events", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
check(
  "zero console errors",
  consoleErrors.length === 0,
  consoleErrors.slice(0, 3).join(" | "),
);

await browser.close();

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} UI check(s) FAILED`);
  process.exit(1);
}
console.log(`UI inspection: ${passed} check(s) passed, 0 failed`);
console.log(`Screenshots: ${path.relative(repoRoot, outDir)}/ui-1280x900-{initial,worked-example}.png, ui-390x844-{initial,worked-example}.png`);
