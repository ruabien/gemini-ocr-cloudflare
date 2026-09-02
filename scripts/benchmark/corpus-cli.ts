/**
 * LEXOCR OCR model benchmark — corpus CLI.
 *
 * Offline, no-network command-line interface for PHASE C corpus tooling.
 *
 * Commands:
 *  validate  - validate a corpus (offline)
 *  ready     - compute corpus readiness verdict
 *  hash      - compute canonical corpus hash
 *  freeze    - write a machine-readable freeze record
 *
 * Examples:
 *  npx tsx scripts/benchmark/corpus-cli.ts validate \
 *    --manifest scripts/benchmark/corpus-synthetic-fixture/manifest.json \
 *    --root scripts/benchmark/corpus-synthetic-fixture
 *  npx tsx scripts/benchmark/corpus-cli.ts ready \
 *    --manifest .../manifest.json --root ... \
 *    --review .../corpus-review.json
 */
import { writeFileSync } from "node:fs";
import { validateCorpus } from "./corpus-validator";
import { computeReadiness, type ReadinessReport } from "./corpus-readiness";
import { readJsonFile } from "./corpus-hash";
import type { BenchmarkManifest } from "./types";

const USAGE = `LEXOCR OCR Corpus CLI - usage:
  npx tsx scripts/benchmark/corpus-cli.ts validate \\
    --manifest <path> [--root <dir>] [--review <path>]
  npx tsx scripts/benchmark/corpus-cli.ts ready \\
    --manifest <path> [--root <dir>] [--review <path>] [--out <path>]
  npx tsx scripts/benchmark/corpus-cli.ts hash \\
    --manifest <path> [--root <dir>] [--review <path>] [--out <path>]
  npx tsx scripts/benchmark/corpus-cli.ts freeze \\
    --manifest <path> [--root <dir>] [--review <path>] [--out <path>] [--version <n>]
`;

interface CliArgs {
  command: string;
  manifestPath: string;
  rootDir: string;
  reviewPath?: string;
  outPath?: string;
  version?: number;
  help?: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const out: CliArgs = {
    command: args[0] ?? "",
    manifestPath: "",
    rootDir: "",
  };
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === "--manifest" && i + 1 < args.length) out.manifestPath = args[++i];
    else if (a === "--root" && i + 1 < args.length) out.rootDir = args[++i];
    else if (a === "--review" && i + 1 < args.length) out.reviewPath = args[++i];
    else if (a === "--out" && i + 1 < args.length) out.outPath = args[++i];
    else if (a === "--version" && i + 1 < args.length) out.version = parseInt(args[++i], 10);
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function defaultRoot(manifestPath: string): string {
  const idx = Math.max(manifestPath.lastIndexOf("/"), manifestPath.lastIndexOf("\\"));
  return idx >= 0 ? manifestPath.slice(0, idx) : ".";
}

function formatSummary(summary: ReadinessReport["summary"]): string {
  if (!summary) return "  (no summary)";
  const lines = [
    `  totalPages             : ${summary.totalPages}`,
    `  verifiedReferenceCount : ${summary.verifiedReferenceCount}`,
    `  categoryCounts         : ${JSON.stringify(summary.categoryCounts)}`,
  ];
  return lines.join("\n");
}

function cmdValidate(args: CliArgs): number {
  const result = validateCorpus({
    manifestPath: args.manifestPath,
    rootDir: args.rootDir,
    reviewPath: args.reviewPath,
  });
  console.log("--- corpus validate ---");
  console.log(`MANIFEST   : ${args.manifestPath}`);
  console.log(`ROOT       : ${args.rootDir}`);
  console.log(`OK         : ${result.ok}`);
  console.log(`HASH       : ${result.hash ?? "N/A"}`);
  console.log(`ERRORS     : ${result.errors.length}`);
  for (const e of result.errors) console.log(`  [E] ${e.code} ${e.message}`);
  console.log(`WARNINGS   : ${result.warnings.length}`);
  for (const w of result.warnings) console.log(`  [W] ${w.code} ${w.message}`);
  console.log("--- summary ---");
  console.log(formatSummary(result.summary));
  console.log(result.ok ? "VALIDATION = PASS" : "VALIDATION = FAIL");
  return result.ok ? 0 : 1;
}

function cmdReady(args: CliArgs): number {
  const validation = validateCorpus({
    manifestPath: args.manifestPath,
    rootDir: args.rootDir,
    reviewPath: args.reviewPath,
  });
  const report = computeReadiness(validation);
  console.log("--- corpus ready ---");
  console.log(`VERDICT    : ${report.verdict}`);
  console.log(`HASH       : ${report.hash ?? "N/A"}`);
  console.log(`HARD_FAILS : ${report.hardFailureCount}`);
  for (const hf of report.hardFailures) console.log(`  [H] ${hf.code} ${hf.message}`);
  console.log(`SOFT_WARNS : ${report.softWarningCount}`);
  for (const sw of report.softWarnings) console.log(`  [W] ${sw.code} ${sw.message}`);
  console.log("--- summary ---");
  console.log(formatSummary(report.summary));
  console.log(report.verdict === "CORPUS_READY" ? "CORPUS_READY = YES" : "CORPUS_READY = NO");

  if (args.outPath) {
    const payload: ReadinessReport = { ...report, asOf: new Date().toISOString() };
    writeFileSync(args.outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log(`WROTE      : ${args.outPath}`);
  }
  return report.verdict === "CORPUS_READY" ? 0 : 1;
}

function cmdHash(args: CliArgs): number {
  const validation = validateCorpus({
    manifestPath: args.manifestPath,
    rootDir: args.rootDir,
    reviewPath: args.reviewPath,
  });
  console.log("--- corpus hash ---");
  console.log(`MANIFEST   : ${args.manifestPath}`);
  console.log(`HASH       : ${validation.hash ?? "N/A"}`);
  console.log(`ERRORS     : ${validation.errors.length}`);
  if (validation.hash) {
    if (args.outPath) {
      writeFileSync(args.outPath, validation.hash + "\n", "utf8");
      console.log(`WROTE      : ${args.outPath}`);
    }
    return 0;
  }
  return 1;
}

function cmdFreeze(args: CliArgs): number {
  const validation = validateCorpus({
    manifestPath: args.manifestPath,
    rootDir: args.rootDir,
    reviewPath: args.reviewPath,
  });
  const report = computeReadiness(validation);
  if (report.verdict !== "CORPUS_READY") {
    console.error("FREEZE REFUSED: corpus is not ready.");
    for (const hf of report.hardFailures) console.error(`  [H] ${hf.code} ${hf.message}`);
    return 1;
  }
  if (!report.hash) {
    console.error("FREEZE REFUSED: no corpus hash available.");
    return 1;
  }

  const manifest = readJsonFile<BenchmarkManifest>(args.manifestPath);
  const categoryCounts: Record<string, number> = {};
  for (const page of manifest.pages) {
    categoryCounts[page.category] = (categoryCounts[page.category] ?? 0) + 1;
  }
  const freezeRecord = {
    schemaVersion: "1.0",
    corpusVersion: args.version ?? 1,
    createdAt: new Date().toISOString(),
    totalPages: manifest.pages.length,
    verifiedReferenceCount: report.summary?.verifiedReferenceCount ?? 0,
    categoryCounts,
    legalCriticalCoverage: report.summary?.pagesContainingEntity ?? {},
    layoutCoverage: report.summary?.layoutCoverage ?? {},
    corpusHash: report.hash,
  };
  console.log("--- corpus freeze ---");
  console.log(`VERDICT    : ${report.verdict}`);
  console.log(`CORPUS_HASH: ${report.hash}`);
  console.log(JSON.stringify(freezeRecord, null, 2));
  if (args.outPath) {
    writeFileSync(args.outPath, JSON.stringify(freezeRecord, null, 2) + "\n", "utf8");
    console.log(`WROTE      : ${args.outPath}`);
  }
  return 0;
}

function main(): number {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    console.log(USAGE);
    return args.help ? 0 : 1;
  }
  if (!args.manifestPath) {
    console.error("ERROR: --manifest is required.");
    console.log(USAGE);
    return 1;
  }
  if (!args.rootDir) args.rootDir = defaultRoot(args.manifestPath);

  switch (args.command) {
    case "validate": return cmdValidate(args);
    case "ready": return cmdReady(args);
    case "hash": return cmdHash(args);
    case "freeze": return cmdFreeze(args);
    default:
      console.error(`ERROR: unknown command '${args.command}'`);
      console.log(USAGE);
      return 1;
  }
}

if (process.argv[1] && (process.argv[1].endsWith("corpus-cli.ts"))) {
  process.exitCode = main();
}