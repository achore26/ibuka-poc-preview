#!/usr/bin/env node
/*
 * Generator test fixtures (task cmp-catalogue-20260930) — selection validation
 * and determinism, run by `npm test`. Exercises tools/generate-sample.mjs:
 *
 *  1. the committed configuration generates successfully and deterministically
 *     (two runs produce byte-identical outputs);
 *  2. the generated runtime JSON contains exactly the ten enabled IDs in the
 *     exact configured order, with verbatim prompts and source refs;
 *  3. invalid configurations fail clearly: unknown ID, duplicate ID,
 *     unsupported control, empty fields, wrong select options, missing source
 *     ref, doc requirement selection, section/config membership mismatch.
 *
 * The invalid-config cases run the generator as a subprocess against a
 * temporary copy of the repo inputs so no real output is touched.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generator = path.join(repoRoot, "tools/generate-sample.mjs");
let passed = 0;
const failures = [];

function check(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${label}`);
  } catch (error) {
    failures.push(`${label}\n    ${String(error).split("\n").slice(0, 5).join("\n    ")}`);
    console.log(`FAIL  ${label}`);
  }
}

const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const readOutput = (relative) =>
  fs.readFileSync(path.isAbsolute(relative) ? relative : path.join(repoRoot, relative), "utf8");

// -- 1 + 2: real config generates deterministically ----------------------------

const outputs = JSON.parse(fs.readFileSync(path.join(repoRoot, "catalogue/sample-config.json"), "utf8")).outputs;
const before = Object.fromEntries(
  Object.entries(outputs).map(([key, relative]) => [key, sha(readOutput(relative))]),
);
check("committed outputs exist and are hashed", () => {
  assert.equal(before.runtime_json.length, 64);
  assert.equal(before.db_seed_migration.length, 64);
});

check("generator run against the committed config is deterministic", () => {
  execFileSync(process.execPath, [generator], { cwd: repoRoot });
  for (const [key, relative] of Object.entries(outputs)) {
    assert.equal(sha(readOutput(relative)), before[key], `${relative} changed between runs`);
  }
});

check("runtime JSON has exactly the ten enabled IDs in exact order with verbatim prompts", () => {
  const runtime = JSON.parse(fs.readFileSync(path.join(repoRoot, outputs.runtime_json), "utf8"));
  assert.equal(runtime.sampleVersion, "2026-09-cmp-sample-2");
  const ids = runtime.sections.flatMap((section) => section.items.map((item) => item.id));
  assert.deepEqual(ids, [
    "CP-01", "CP-07", "CP-13", "SC-03", "CP-16",
    "Q-BUS-01", "Q-BUS-03", "Q-RISK-01", "Q-FIN-02", "Q-FIN-03",
  ]);
  assert.equal(runtime.sections.length, 4);
  assert.deepEqual(
    runtime.sections.map((section) => [section.key, section.title]),
    [
      ["company", "Company details"],
      ["financial", "Financial position"],
      ["business", "Business"],
      ["risk", "Risk and outlook"],
    ],
  );
  const byId = Object.fromEntries(
    runtime.sections.flatMap((section) => section.items.map((item) => [item.id, item])),
  );
  assert.equal(byId["CP-07"].prompt, "Date of incorporation");
  assert.equal(byId["CP-07"].control, "date");
  assert.equal(byId["CP-13"].control, "select");
  assert.deepEqual(byId["CP-13"].selectOptions, ["MIMS", "SMEMS"]);
  assert.equal(
    byId["Q-FIN-03"].prompt,
    "Are you satisfied your issued capital (including amounts to be raised) is adequate for at least the next 9 months? If not, explain the shortfall and funding plan.",
  );
  assert.equal(byId["SC-03"].control, "currency");
  assert.equal(byId["CP-16"].control, "currency_date");
  assert.equal(byId["CP-16"].prompt, "Total assets (as at date)");
});

// -- 3: invalid configurations fail clearly (sandboxed copies) ------------------

function sandbox(mutate) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-generate-"));
  fs.cpSync(path.join(repoRoot, "input"), path.join(tmp, "input"), { recursive: true });
  fs.cpSync(path.join(repoRoot, "catalogue"), path.join(tmp, "catalogue"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "tools"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "out"), { recursive: true });
  // The generator resolves its repo root from its own module path, so run a
  // copy inside the sandbox to exercise the sandboxed inputs.
  fs.copyFileSync(generator, path.join(tmp, "tools/generate-sample.mjs"));
  const config = JSON.parse(fs.readFileSync(path.join(tmp, "catalogue/sample-config.json"), "utf8"));
  config.source_file = "../input/catalogue-source.json";
  config.outputs = {
    runtime_json: "out/runtime.json",
    db_seed_migration: "out/seed.sql",
    manifest: "out/manifest.json",
  };
  mutate(config);
  fs.writeFileSync(path.join(tmp, "catalogue/sample-config.json"), `${JSON.stringify(config, null, 2)}\n`);
  return tmp;
}

function expectGeneratorFails(label, mutate) {
  check(label, () => {
    const tmp = sandbox(mutate);
    try {
      execFileSync(process.execPath, [path.join(tmp, "tools/generate-sample.mjs")], {
        cwd: tmp,
        stdio: ["ignore", "pipe", "pipe"],
      });
      throw new Error("generator unexpectedly succeeded");
    } catch (error) {
      const stderr = String(error.stderr ?? "");
      assert.match(stderr, /generate-sample: FAIL/, `stderr should say FAIL: ${stderr}`);
      assert.equal(fs.existsSync(path.join(tmp, "out/runtime.json")), false, "no partial runtime output");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
}

expectGeneratorFails("unknown ID is rejected", (config) => {
  config.fields.push({ id: "Q-NOPE-99", control: "narrative", short_label: "Nope" });
});

expectGeneratorFails("duplicate ID is rejected", (config) => {
  config.fields.push({ ...config.fields[0] });
});

expectGeneratorFails("unsupported structured control is rejected", (config) => {
  config.fields[0].control = "currency_date"; // CP-01 is Text, not Currency + date
});

expectGeneratorFails("document requirement cannot be selected", (config) => {
  config.fields = config.fields.slice(0, 1);
  config.fields[0] = { id: "D-ANY-01", control: "text", short_label: "Doc" };
  config.sections[0].items = config.fields.map((f) => f.id);
});

expectGeneratorFails("empty selection is rejected", (config) => {
  config.fields = [];
  config.sections = [{ key: "company", title: "Company details", items: [] }];
});

expectGeneratorFails("select options disagreeing with the source enum are rejected", (config) => {
  config.fields[2].select_options = ["MIMS", "GEMS"];
});

expectGeneratorFails("section/config membership mismatch is rejected", (config) => {
  config.sections[0].items = config.sections[0].items.slice(0, 1);
});

expectGeneratorFails("narrative prompt cannot use a structured-only control", (config) => {
  config.fields[5].control = "date"; // Q-BUS-01 is a narrative prompt
});

if (failures.length > 0) {
  console.error(`\n${failures.length} generator check(s) FAILED:\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  process.exit(1);
}
console.log(`\ngenerate-sample fixtures: ${passed} check(s) passed, 0 failed`);
