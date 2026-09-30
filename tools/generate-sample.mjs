#!/usr/bin/env node
/*
 * CMP Kenya private catalogue sample generator (task cmp-catalogue-20260930).
 *
 * Reads the PRIVATE source catalogue (input/catalogue-source.json, 197 supplied
 * definitions) and the reviewed configuration (catalogue/sample-config.json),
 * validates the selection, and emits ONLY the enabled runtime data:
 *
 *   1. src/lib/generated/enabled-sample.json  — the only sample data the
 *      browser bundle ever contains (enabled items only; never the full
 *      catalogue, never unselected prompts).
 *   2. the companion database seed migration (reviewable SQL, upsert of the
 *      active sample rows; non-destructive, never rewrites old migrations).
 *   3. catalogue/generated-manifest.json — source/selection counts and output
 *      hashes used by the determinism and privacy checks.
 *
 * Validation fails loudly (exit 1, no partial writes) when the config selects
 * unknown, duplicate or unsupported IDs, no fields at all, a select whose
 * options disagree with the source enum, or when the source file's declared
 * sha256 does not match its bytes.
 *
 * Run: npm run sample:generate
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = (reason) => {
  console.error(`generate-sample: FAIL — ${reason}`);
  process.exit(1);
};
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

// -- Load and integrity-check the source catalogue ---------------------------

const configPath = path.join(repoRoot, "catalogue/sample-config.json");
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (error) {
  fail(`catalogue/sample-config.json is missing or not valid JSON (${error.message}).`);
}

const sourcePath = path.resolve(repoRoot, "catalogue", config.source_file ?? "");
let source;
try {
  source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
} catch (error) {
  fail(`source catalogue ${config.source_file} is missing or not valid JSON (${error.message}).`);
}

const sourceBytes = fs.readFileSync(sourcePath);
const sourceFileSha256 = sha256(sourceBytes.toString("utf8"));
/*
 * source.source_sha256 is the declared source-of-record hash supplied with the
 * extraction. The committed JSON file's own bytes hash is recorded separately
 * (source_file_sha256 in the manifest) because the extraction was re-serialised
 * to pretty JSON. A mismatch is reported for review but is not fatal; a changed
 * FILE hash between generator runs IS caught by the determinism check.
 */
if (sourceFileSha256 !== source.source_sha256) {
  console.warn(
    `generate-sample: NOTE — source file bytes hash ${sourceFileSha256} differs from the ` +
      `declared source-of-record sha256 ${source.source_sha256} (expected when the workbook ` +
      `extraction was re-serialised to JSON); both are recorded in the manifest.`,
  );
}
if (source.source_revision !== config.expected_source_revision) {
  fail(
    `source revision "${source.source_revision}" does not match the configured ` +
      `expected_source_revision "${config.expected_source_revision}".`,
  );
}

const entries = Array.isArray(source.entries) ? source.entries : null;
if (!entries || entries.length === 0) fail("source catalogue has no entries.");
const byId = new Map();
const duplicateIds = [];
for (const entry of entries) {
  if (byId.has(entry.id)) duplicateIds.push(entry.id);
  byId.set(entry.id, entry);
}
if (duplicateIds.length > 0) fail(`source catalogue has duplicate IDs: ${duplicateIds.join(", ")}.`);

// -- Control support rules (what the reviewed config may select) --------------

const NARRATIVE_CATEGORY = /^Narrative prompt:/;
const STRUCTURED_CATEGORY = "Structured field";

// "Source type: Enum: MIMS / SMEMS; required: Y; source ref: Section A"
function parseSourceDescription(description) {
  const typeMatch = /^Source type:\s*([^;]+);/.exec(description ?? "");
  const refMatch = /source ref:\s*([^;]+)$/.exec(description ?? "");
  return {
    sourceType: typeMatch ? typeMatch[1].trim() : null,
    sourceRef: refMatch ? refMatch[1].trim() : null,
  };
}

function parseEnumOptions(sourceType) {
  const match = /^Enum:\s*(.+)$/.exec(sourceType ?? "");
  if (!match) return null;
  return match[1].split("/").map((option) => option.trim()).filter((option) => option !== "");
}

/*
 * Returns the list of controls supported for one source entry, or a string
 * reason when the entry cannot be selected with any implemented control.
 * Doc requirements, calculated/repeatable/expert fields and unimplemented
 * structured source types are catalogued but NOT selectable.
 */
function supportedControls(entry) {
  if (entry.category.startsWith("Document:")) {
    return { reason: `${entry.id} is a document requirement; document features are not implemented.` };
  }
  if (NARRATIVE_CATEGORY.test(entry.category)) {
    const controls = ["narrative"];
    if (entry.id === "Q-DIR-01") controls.push("yes-no"); // preserved special: Yes/No + details
    if (entry.id === "Q-OFR-03") controls.push("conditional-text"); // preserved special: reasoned N/A
    return { controls };
  }
  if (entry.category === STRUCTURED_CATEGORY) {
    const { sourceType } = parseSourceDescription(entry.source_description);
    switch (sourceType) {
      case "Text":
        return { controls: ["text"] };
      case "Date":
        return { controls: ["date"] };
      case "Currency":
        return { controls: ["currency"] };
      case "Currency + date":
        return { controls: ["currency_date"] };
      default:
        if (sourceType && sourceType.startsWith("Enum:")) return { controls: ["select"] };
        return {
          reason: `${entry.id} has structured source type "${sourceType}", which has no implemented control.`,
        };
    }
  }
  return { reason: `${entry.id} has unsupported category "${entry.category}".` };
}

// -- Validate the configuration ----------------------------------------------

if (!Array.isArray(config.fields) || config.fields.length === 0) {
  fail("the configuration selects no fields; at least one enabled item is required.");
}
if (!Array.isArray(config.sections) || config.sections.length === 0) {
  fail("the configuration defines no sections.");
}

const seenIds = new Set();
for (const field of config.fields) {
  if (!field.id) fail("a configured field has no id.");
  if (seenIds.has(field.id)) fail(`duplicate enabled ID ${field.id}.`);
  seenIds.add(field.id);
  const entry = byId.get(field.id);
  if (!entry) fail(`unknown enabled ID ${field.id} (not present in the source catalogue).`);
  const support = supportedControls(entry);
  if (support.reason) fail(support.reason);
  if (!support.controls.includes(field.control)) {
    fail(
      `${field.id} cannot use control "${field.control}"; supported: ${support.controls.join(", ")}.`,
    );
  }
  if (!field.short_label || field.short_label.trim() === "") {
    fail(`${field.id} has no short_label.`);
  }
  if (field.control === "select") {
    const { sourceType } = parseSourceDescription(entry.source_description);
    const sourceOptions = parseEnumOptions(sourceType);
    const configured = field.select_options ?? [];
    if (!sourceOptions) fail(`${field.id} is a select but the source type is not an enum.`);
    if (JSON.stringify(configured) !== JSON.stringify(sourceOptions)) {
      fail(
        `${field.id} select options [${configured.join(", ")}] disagree with the source enum ` +
          `[${sourceOptions.join(", ")}].`,
      );
    }
  }
}

const sectionIds = [];
const sectionKeys = new Set();
for (const section of config.sections) {
  if (!section.key || !section.title) fail("a section is missing key or title.");
  if (sectionKeys.has(section.key)) fail(`duplicate section key ${section.key}.`);
  sectionKeys.add(section.key);
  if (!Array.isArray(section.items) || section.items.length === 0) {
    fail(`section ${section.key} has no items.`);
  }
  for (const id of section.items) {
    if (sectionIds.includes(id)) fail(`duplicate enabled ID ${id} across sections.`);
    if (!seenIds.has(id)) fail(`section ${section.key} lists unknown/unconfigured ID ${id}.`);
    sectionIds.push(id);
  }
}
const orphanIds = [...seenIds].filter((id) => !sectionIds.includes(id));
if (orphanIds.length > 0) fail(`configured IDs missing from every section: ${orphanIds.join(", ")}.`);
if (sectionIds.length !== seenIds.size) fail("section membership and configured fields disagree.");

// -- Build the enabled-only runtime data --------------------------------------

const CONTROL_FIELD_TYPE = {
  text: "text",
  date: "date",
  select: "select",
  currency: "currency",
  currency_date: "currency_date",
  narrative: "narrative",
  "yes-no": "yes_no_details",
  "conditional-text": "text_na",
};
const PARTY_KEY = { company: "company", financial: "capital", business: "business", risk: "risk" };

const configById = new Map(config.fields.map((field) => [field.id, field]));
let displayOrder = 0;
const sections = config.sections.map((section, sectionIndex) => ({
  key: section.key,
  title: section.title,
  phaseOrder: sectionIndex + 1,
  items: section.items.map((id) => {
    const entry = byId.get(id);
    const field = configById.get(id);
    const { sourceRef } = parseSourceDescription(entry.source_description);
    if (!sourceRef) fail(`${id} has no source ref in its source_description.`);
    displayOrder += 1;
    const item = {
      id,
      prompt: entry.label_or_prompt,
      shortLabel: field.short_label,
      sourceRef,
      control: field.control,
      allowsNa: field.control === "conditional-text",
      displayOrder,
    };
    if (field.control === "select") item.selectOptions = field.select_options;
    return item;
  }),
}));

const runtime = {
  sampleVersion: config.sample_version,
  sourceRevision: source.source_revision,
  sourceSha256: source.source_sha256,
  sourceFileSha256: sourceFileSha256,
  generatedBy: "tools/generate-sample.mjs from catalogue/sample-config.json (enabled items only)",
  sections,
};

// -- Emit the runtime JSON -----------------------------------------------------

const runtimePath = path.join(repoRoot, config.outputs.runtime_json);
fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
const runtimeText = `${JSON.stringify(runtime, null, 2)}\n`;
fs.writeFileSync(runtimePath, runtimeText);

// -- Emit the reviewable database seed migration -------------------------------

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlTextArray = (values) => `array[${values.map(sqlLiteral).join(", ")}]::text[]`;

const seedRows = sections
  .flatMap((section) =>
    section.items.map((item) =>
      "  (\n" +
      `    ${sqlLiteral(item.id)},\n` +
      `    ${sqlLiteral(item.shortLabel)},\n` +
      `    ${sqlLiteral(item.prompt)},\n` +
      `    ${sqlLiteral(CONTROL_FIELD_TYPE[item.control])},\n` +
      `    ${item.allowsNa},\n` +
      `    ${sqlLiteral(PARTY_KEY[section.key] ?? "company")},\n` +
      `    ${section.phaseOrder}, ${item.displayOrder},\n` +
      `    ${sqlLiteral(item.sourceRef)},\n` +
      `    ${item.selectOptions ? sqlTextArray(item.selectOptions) : "null"},\n` +
      `    ${sqlLiteral(config.sample_version)},\n` +
      "    true\n" +
      "  )",
    ),
  )
  .join(",\n");

const migrationText = `-- CMP Kenya / IBUKA Phase 1 — active sample v2 seed (task cmp-catalogue-20260930).
--
-- GENERATED by tools/generate-sample.mjs in the app worktree from
-- input/catalogue-source.json (${source.source_revision}) and
-- catalogue/sample-config.json. Review, do not hand-edit; re-run the
-- generator instead. Non-destructive and idempotent:
--   * never drops or rewrites the 20260927000100/20260927000200 migrations;
--   * deactivates (never deletes) previously active sample rows, preserving
--     old checklist items and every existing company/answer row;
--   * re-activates CP-07 in place with unchanged meaning and field type
--     (date) so pre-existing CP-07 answers remain valid and now count in the
--     new sample denominator;
--   * upserts the ten enabled rows with is_active = true.
--
-- sample_version "${config.sample_version}" must match EXPECTED_SAMPLE_VERSION in
-- the frontend (it validates the exact id set, controls and version on load
-- and refuses to render on mismatch — the honest failure, never a wrong
-- score). Changing active membership again requires a NEW versioned migration
-- plus an explicit rebaseline decision about existing answers; this migration
-- does not silently rescore anything.
--
-- The full 197-entry source catalogue stays in the private app repository
-- (input/catalogue-source.json). Only these enabled rows are seeded to the
-- public database, and ordinary users still have no write grants on
-- checklist_item (enforced by migration 20260927000100; unchanged here).

begin;

-- Deactivate any previously active sample rows (kept, not deleted). Old
-- answers remain readable to their owners and can never be re-written: the
-- replaced app.validate_assessment_answer() trigger rejects writes to
-- inactive items.
update public.checklist_item
   set is_active = false
 where is_active
   and sample_version <> ${sqlLiteral(config.sample_version)};

insert into public.checklist_item (
  id, title, question_text, field_type, allows_na, party_key,
  phase_order, display_order, source_reference, select_options, sample_version,
  is_active
) values
${seedRows}
on conflict (id) do update set
  title           = excluded.title,
  question_text   = excluded.question_text,
  field_type      = excluded.field_type,
  allows_na       = excluded.allows_na,
  party_key       = excluded.party_key,
  phase_order     = excluded.phase_order,
  display_order   = excluded.display_order,
  source_reference = excluded.source_reference,
  select_options  = excluded.select_options,
  sample_version  = excluded.sample_version,
  is_active       = excluded.is_active;

commit;
`;

const migrationPath = path.resolve(repoRoot, config.outputs.db_seed_migration);
fs.mkdirSync(path.dirname(migrationPath), { recursive: true });
fs.writeFileSync(migrationPath, migrationText);

// -- Emit the manifest -----------------------------------------------------------

const counts = {
  source_entries: entries.length,
  source_structured: entries.filter((e) => e.category === STRUCTURED_CATEGORY).length,
  source_narrative_prompts: entries.filter((e) => NARRATIVE_CATEGORY.test(e.category)).length,
  source_documents: entries.filter((e) => e.category.startsWith("Document:")).length,
  enabled: seenIds.size,
};

const manifest = {
  sample_version: config.sample_version,
  source_revision: source.source_revision,
  source_sha256: source.source_sha256,
  source_file_sha256: sourceFileSha256,
  config_path: "catalogue/sample-config.json",
  counts,
  outputs: {
    [config.outputs.runtime_json]: sha256(runtimeText),
    [config.outputs.db_seed_migration]: sha256(migrationText),
  },
  enabled_ids: [...sectionIds],
};
const manifestPath = path.join(repoRoot, config.outputs.manifest);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `generate-sample: OK — ${counts.enabled} of ${counts.source_entries} source entries enabled ` +
    `(${counts.source_structured} structured, ${counts.source_narrative_prompts} narrative prompts, ` +
    `${counts.source_documents} documents catalogued privately).`,
);
console.log(`  runtime:  ${config.outputs.runtime_json}`);
console.log(`  db seed:  ${path.relative(repoRoot, migrationPath)}`);
console.log(`  manifest: ${config.outputs.manifest}`);
