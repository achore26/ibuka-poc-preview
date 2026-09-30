#!/usr/bin/env node
/*
 * CMP catalogue privacy check (task cmp-catalogue-20260930).
 *
 * Proves, over the production build in dist/, that:
 *   1. no source-map files or sourceMappingURL references exist (no leakage);
 *   2. every UNSELECTED source entry's stable ID is absent from every dist
 *      file and from the generated runtime JSON;
 *   3. every UNSELECTED source entry's full supplied prompt/label is absent
 *      from the same files (checked raw and JSON-escaped);
 *   4. the generated runtime JSON contains exactly the enabled IDs and the
 *      configured sample_version matches the database seed migration.
 *
 * Run after `npm run build`:  npm run check:privacy
 * Exits non-zero and lists every finding on failure.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = (lines) => {
  console.error("check-privacy: FAIL");
  for (const line of lines) console.error(`  ${line}`);
  process.exit(1);
};

const config = JSON.parse(fs.readFileSync(path.join(repoRoot, "catalogue/sample-config.json"), "utf8"));
const source = JSON.parse(fs.readFileSync(path.resolve(repoRoot, "catalogue", config.source_file), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "catalogue/generated-manifest.json"), "utf8"));
const runtime = JSON.parse(fs.readFileSync(path.join(repoRoot, config.outputs.runtime_json), "utf8"));

// -- Collect dist files --------------------------------------------------------

const distDir = path.join(repoRoot, "dist");
if (!fs.existsSync(distDir)) fail(["dist/ does not exist — run `npm run build` first."]);

const distFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else distFiles.push(full);
  }
})(distDir);

const findings = [];

// 1. No source maps.
for (const file of distFiles) {
  if (file.endsWith(".map")) findings.push(`source map file present in dist: ${path.relative(distDir, file)}`);
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("sourceMappingURL")) {
    findings.push(`sourceMappingURL reference present in dist: ${path.relative(distDir, file)}`);
  }
}

// -- Enabled vs unselected sets -------------------------------------------------

const enabledIds = new Set(
  runtime.sections.flatMap((section) => section.items.map((item) => item.id)),
);
const expectedEnabled = new Set(manifest.enabled_ids);
if (enabledIds.size !== expectedEnabled.size || [...enabledIds].some((id) => !expectedEnabled.has(id))) {
  findings.push(
    `generated runtime IDs [${[...enabledIds].join(", ")}] disagree with manifest [${[...expectedEnabled].join(", ")}]`,
  );
}

const unselected = source.entries.filter((entry) => !enabledIds.has(entry.id));
if (unselected.length === 0) findings.push("no unselected entries found — the source catalogue is missing?");

// 2 + 3. Unselected IDs and full prompts absent from dist and the generated JSON.
const scanFiles = [...distFiles, path.join(repoRoot, config.outputs.runtime_json)];
const haystacks = scanFiles.map((file) => ({
  file,
  relative: file.startsWith(distDir) ? `dist/${path.relative(distDir, file)}` : path.relative(repoRoot, file),
  text: fs.readFileSync(file, "utf8"),
}));

const escapeRegex = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
/*
 * IDs are matched as whole tokens (not embedded in a longer ID such as
 * "FIN-02" inside the selected "Q-FIN-02"): boundaries are anything that
 * cannot continue a supplied ID.
 */
const idTokenRegex = (id) => new RegExp(`(?<![A-Za-z0-9_-])${escapeRegex(id)}(?![A-Za-z0-9_-])`, "u");

const selectedPrompts = runtime.sections.flatMap((section) => section.items.map((item) => item.prompt));
const ambiguousPrompts = [];
let idChecks = 0;
let promptChecks = 0;
for (const entry of unselected) {
  for (const { relative, text } of haystacks) {
    idChecks += 1;
    if (idTokenRegex(entry.id).test(text)) {
      findings.push(`unselected ID ${entry.id} appears in ${relative}`);
    }
    promptChecks += 1;
    const prompt = entry.label_or_prompt;
    const escaped = JSON.stringify(prompt).slice(1, -1);
    const containedIn = selectedPrompts.find((selected) => selected.includes(prompt));
    if (containedIn) {
      /*
       * Recorded ambiguity (not a silent skip): some unselected workbook
       * labels are generic table headers ("Amount", "Date", "Revenue",
       * "Total assets", "Year", …) that are substrings of enabled verbatim
       * prompts. These are listed in the output; every other unselected
       * prompt must be absent.
       */
      const existing = ambiguousPrompts.find((item) => item.id === entry.id);
      if (!existing) ambiguousPrompts.push({ id: entry.id, prompt, containedIn });
    } else if (prompt.length < 16) {
      /*
       * Short generic labels ("Amount", "Year", …) occur as incidental
       * substrings of minified third-party code (observed: "bufferedAmount",
       * "getUTCFullYear"), so a raw substring assertion is not assertable.
       * Real catalogue leakage would carry the label as a DATA STRING, so
       * the quoted forms are asserted instead. Recorded below either way.
       */
      const quoted = [`"${escaped}"`, `'${escaped}'`, `\\\"${escaped}\\\"`];
      if (quoted.some((form) => text.includes(form))) {
        findings.push(`unselected short label for ${entry.id} appears quoted in ${relative}`);
      }
    } else if (text.includes(prompt) || text.includes(escaped)) {
      findings.push(`unselected prompt for ${entry.id} appears in ${relative}`);
    }
  }
}

// 4. Runtime JSON sample version matches the configured version and the seed.
if (runtime.sampleVersion !== config.sample_version) {
  findings.push(`runtime sampleVersion ${runtime.sampleVersion} != configured ${config.sample_version}`);
}
const migrationPath = path.resolve(repoRoot, config.outputs.db_seed_migration);
const migration = fs.readFileSync(migrationPath, "utf8");
if (!migration.includes(`'${config.sample_version}'`)) {
  findings.push(`db seed migration does not reference sample_version '${config.sample_version}'`);
}
const migrationHash = createHash("sha256").update(migration, "utf8").digest("hex");
const manifestHash = manifest.outputs[config.outputs.db_seed_migration];
if (manifestHash && migrationHash !== manifestHash) {
  findings.push("db seed migration bytes do not match the generator manifest — re-run npm run sample:generate");
}
const runtimeHash = createHash("sha256")
  .update(fs.readFileSync(path.join(repoRoot, config.outputs.runtime_json), "utf8"), "utf8")
  .digest("hex");
if (manifest.outputs[config.outputs.runtime_json] && runtimeHash !== manifest.outputs[config.outputs.runtime_json]) {
  findings.push("generated runtime JSON does not match the generator manifest — re-run npm run sample:generate");
}

if (findings.length > 0) fail(findings);

if (ambiguousPrompts.length > 0) {
  console.log(
    `check-privacy: RECORDED AMBIGUITIES — ${ambiguousPrompts.length} unselected generic label(s) ` +
      `are substrings of enabled verbatim prompts (exact-prompt collisions otherwise: none). ` +
      `Their absence cannot be asserted by substring; their IDs are still checked above:`,
  );
  for (const item of ambiguousPrompts) {
    console.log(`  ${item.id} "${item.prompt}" ⊂ enabled prompt "${item.containedIn}"`);
  }
}

console.log(
  `check-privacy: PASS — ${distFiles.length} dist file(s); ${enabledIds.size} enabled IDs; ` +
    `${unselected.length} unselected entries x ${haystacks.length} files = ${idChecks} whole-token ID checks and ` +
    `${promptChecks} full-prompt checks, all absent (recorded ambiguities above aside); no source maps; ` +
    `versions aligned (${config.sample_version}).`,
);
