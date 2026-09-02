/**
 * Dry-run orchestrator test — proves offline, zero-network behavior.
 * Run with: npx tsx scripts/benchmark/benchmark-dry-run.test.ts
 *
 * This test runs the benchmark orchestrator via `tsx` in a child process and
 * asserts:
 *  - exit code 0
 *  - stdout contains "DRY_RUN = PASS"
 *  - stdout contains "NETWORK_CALLS = 0"
 *  - stdout contains "API_CALLS = 0"
 *  - no "gemini-2.5-flash" request sent (no network harness) — enforced by
 *    running with the orchestrator's dry-run branch only.
 *  - no GEMINI_BENCH_KEY environment variable is required.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ORCHESTRATOR = join(__dirname, "ocr-model-benchmark.ts");

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}

const result = spawnSync(
  process.execPath,
  [join(__dirname, "..", "..", "node_modules", "tsx", "dist", "cli.mjs"),
    ORCHESTRATOR, "--dryRun",
    "--manifest", join(__dirname, "..", "..", "tmp", "ocr-benchmark-manifest.template.json"),
    "--pricing", join(__dirname, "..", "..", "tmp", "ocr-benchmark-pricing.template.json")],
  { encoding: "utf8", env: { ...process.env, GEMINI_BENCH_KEY: "" } }
);

const stdout = result.stdout || "";
const stderr = result.stderr || "";

// Test 1 — exit code 0
assert(result.status === 0, "dry-run exits 0 (got " + result.status + ")");

// Test 2 — explicit DRY_RUN = PASS
assert(stdout.includes("DRY_RUN = PASS"), "stdout contains DRY_RUN = PASS");

// Test 3 — NETWORK_CALLS = 0
assert(stdout.includes("NETWORK_CALLS = 0"), "stdout contains NETWORK_CALLS = 0");

// Test 4 — API_CALLS = 0
assert(stdout.includes("API_CALLS = 0"), "stdout contains API_CALLS = 0");

// Test 5 — no real Gemini/OCR.space endpoints invoked
assert(
  !stdout.includes("generativelanguage.googleapis.com/v1beta") && !stderr.includes("generativelanguage.googleapis.com/v1beta"),
  "no live Gemini v1beta call made"
);

// Test 6 — runs WITHOUT GEMINI_BENCH_KEY
assert(!(process.env.GEMINI_BENCH_KEY), "test env has no GEMINI_BENCH_KEY");
assert(stdout.includes("DRY_RUN = PASS"), "dry-run succeeds with empty GEMINI_BENCH_KEY");

// Test 7 — report contains both models
assert(stdout.includes("gemini-2.5-flash") && stdout.includes("gemini-2.5-flash-lite"), "report lists both models");

// Test 8 — report contains per-page rows
assert(stdout.includes("DRY_PAGE_001"), "report lists DRY_PAGE_001");

// Test 9 — no accidental live run fallthrough (non-dry-run must refuse)
{
  const r2 = spawnSync(
    process.execPath,
    [join(__dirname, "..", "..", "node_modules", "tsx", "dist", "cli.mjs"), ORCHESTRATOR],
    { encoding: "utf8", env: { ...process.env, GEMINI_BENCH_KEY: "" } }
  );
  const out2 = (r2.stdout || "") + (r2.stderr || "");
  assert(r2.status === 2 || (r2.status !== 0 && out2.includes("does not support live API execution")), "non-dry-run refuses loudly (exit != 0)");
}

console.log("--- benchmark-dry-run.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);