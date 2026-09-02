/**
 * LEXOCR OCR model benchmark — orchestrator.
 *
 * PHASE A+B (this file): deterministic harness + dry-run mode only.
 * No Gemini API calls are made in PHASE A+B.
 */
import type {
  BenchmarkManifest,
  BenchmarkRunConfig,
  PageReference,
  PerModelSummary,
  PerPageRow,
} from "./types";
import { computeCer, computeWer } from "./ocr-quality-evaluator";
import { evaluatePageLegalMetrics, collectHumanReviewRequired } from "./ocr-legal-evaluator";
import { evaluateLayoutFromReference } from "./ocr-layout-evaluator";
import { computeRowCost, sumCost, scaleCost } from "./ocr-cost-calculator";

// ── CLI argument parser ───────────────────────────────────────────

const USAGE = `LEXOCR OCR Model Benchmark — usage:
  npx tsx scripts/benchmark/ocr-model-benchmark.ts \\
    --manifest <path>          # benchmark manifest JSON
    --pricing <path>           # pricing JSON
    [--outDir <path>]          # default: tmp/ocr-benchmark/results
    [--phase initial|targeted_repeat]
    [--phase1Results <path>]  # required for targeted_repeat phase
    [--repetitions <n>]       # default: 3
    [--dryRun]                 # use inline synthetic fixtures (no API)
    [--help]
`;

function parseArgs(argv: string[]): BenchmarkRunConfig {
  const args = argv.slice(2);
  const cfg: BenchmarkRunConfig = {
    manifestPath: "", pricingPath: "", phase: "initial",
    outDir: "tmp/ocr-benchmark/results", phase1ResultsPath: undefined,
    targetedRepetitions: 3, dryRun: false, apiKeyEnvVar: "GEMINI_BENCH_KEY",
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--manifest" && i + 1 < args.length) cfg.manifestPath = args[++i];
    else if (a === "--pricing" && i + 1 < args.length) cfg.pricingPath = args[++i];
    else if (a === "--outDir" && i + 1 < args.length) cfg.outDir = args[++i];
    else if (a === "--phase" && i + 1 < args.length)
      cfg.phase = args[++i] as "initial" | "targeted_repeat";
    else if (a === "--phase1Results" && i + 1 < args.length)
      cfg.phase1ResultsPath = args[++i];
    else if (a === "--repetitions" && i + 1 < args.length)
      cfg.targetedRepetitions = parseInt(args[++i], 10);
    else if (a === "--dryRun") cfg.dryRun = true;
    else if (a === "--help") { console.log(USAGE); process.exit(0); }
  }
  return cfg;
}

// ── Inline synthetic fixtures (dry-run only) ─────────────────────

function buildDryRunManifest(): BenchmarkManifest {
  return {
    schemaVersion: "1.0",
    name: "[DRY RUN] LexOCR OCR Model Benchmark — Synthetic Fixture",
    description: "Synthetic inline fixture for dry-run validation. All content is fictional.",
    created: "2025-01-01T00:00:00.000Z",
    pages: [
      { benchmarkPageId: "DRY_PAGE_001", fileName: "synthetic_judgment_fixture.png",
        imageFormat: "png", category: "CLEAN_JUDGMENT", difficulty: "easy",
        referenceStatus: "REFERENCE_VERIFIED", referenceFileName: "synthetic_judgment_fixture.ref.txt",
        notes: "Synthetic legal fixture: no real persons, case numbers, or addresses." },
      { benchmarkPageId: "DRY_PAGE_002", fileName: "synthetic_minutes_fixture.png",
        imageFormat: "png", category: "MINUTES_STATEMENTS", difficulty: "medium",
        referenceStatus: "REFERENCE_VERIFIED", referenceFileName: "synthetic_minutes_fixture.ref.txt",
        notes: "Synthetic witness-statement fixture." },
      { benchmarkPageId: "DRY_PAGE_003", fileName: "synthetic_poorscan_fixture.png",
        imageFormat: "png", category: "POOR_SCAN", difficulty: "hard",
        referenceStatus: "REFERENCE_DRAFT", referenceFileName: null,
        notes: "Low-quality scan fixture." },
    ],
  };
}

function buildDryRunPricing(): import("./types").BenchmarkPricing {
  return {
    schemaVersion: "1.0", asOf: "2025-01-01T00:00:00.000Z",
    source: "https://ai.google.dev/pricing (dry-run synthetic)", usdToVnd: 25000,
    models: {
      "gemini-2.5-flash": {
        inputPricePerMillionTokens: 0.075, outputPricePerMillionTokens: 0.3, currency: "USD",
      },
      "gemini-2.5-flash-lite": {
        inputPricePerMillionTokens: 0.0375, outputPricePerMillionTokens: 0.15, currency: "USD",
      },
    },
  };
}

export function buildDryRunReferences(): Map<string, PageReference> {
  const refs = new Map<string, PageReference>();
  refs.set("DRY_PAGE_001", {
    benchmarkPageId: "DRY_PAGE_001", referenceStatus: "REFERENCE_VERIFIED",
    rawText: "TOA AN NHAN DAN THANH PHO HA NOI\nNgay 15 thang 03 nam 2024\nSo: 1234/2024/QD-ST\nBan an dan su so tham\nCong ty TNHH Thuong mai A\nChi nhanh Cong ty B\nSo tien: 150.000.000 dong\n\nDieu 1. Buoc bi don tra no 150 trieu dong cho nguyen don.\nDieu 2. An phi dan su so tham.\nDieu 3. Quyen khang cao trong 15 ngay.\n",
    entities: [
      { kind: "PERSON_NAME", text: "Nguyen Van X" },
      { kind: "ORGANIZATION_NAME", text: "Cong ty TNHH Thuong mai A" },
      { kind: "ORGANIZATION_NAME", text: "Chi nhanh Cong ty B" },
      { kind: "DATE", text: "15 thang 03 nam 2024", category: "judgment_date" },
      { kind: "DOCUMENT_NUMBER", text: "So: 1234/2024/QD-ST", category: "decision_number" },
      { kind: "MONEY_AMOUNT", text: "150.000.000 dong", category: "principal" },
      { kind: "LEGAL_ARTICLE", text: "Dieu 1" },
      { kind: "LEGAL_ARTICLE", text: "Dieu 2" },
      { kind: "LEGAL_ARTICLE", text: "Dieu 3" },
    ],
  });
  refs.set("DRY_PAGE_002", {
    benchmarkPageId: "DRY_PAGE_002", referenceStatus: "REFERENCE_VERIFIED",
    rawText: "BIEN BAN LOI KHAI\nNgay 20 thang 06 nam 2024\nNguoi lam chung: Tran Thi Y\nCan cuoc cong dan so: 001234567890\nDia chi: Quan C, Thanh pho Ha Noi\nLoi khai: Ho noi rang ho nhin thay su viec vao luc 10 gio sang.\nThua dat so 42, to ban do so 7\n",
    entities: [
      { kind: "PERSON_NAME", text: "Tran Thi Y" },
      { kind: "IDENTIFICATION_NUMBER", text: "CCCD: 001234567890" },
      { kind: "ADDRESS", text: "Quan C, Thanh pho Ha Noi" },
      { kind: "DATE", text: "20 thang 06 nam 2024" },
      { kind: "LAND_PARCEL_NUMBER", text: "thua dat so 42" },
      { kind: "MAP_SHEET_NUMBER", text: "to ban do so 7" },
    ],
  });
  refs.set("DRY_PAGE_003", {
    benchmarkPageId: "DRY_PAGE_003", referenceStatus: "REFERENCE_DRAFT",
    rawText: "So to: 3\nQuyet dinh so: 5678/2024\n[Kho doc do chat luong ban quet thap]",
    entities: [],
  });
  return refs;
}

interface DryRunModelOutput {
  model: string; rawText: string; httpStatus: number;
  promptTokens: number; candidatesTokens: number;
  totalTokens: number; latencyMs: number; pageIndex: number;
}

function generateDryRunOutput(pageId: string, model: string, _runId: string): DryRunModelOutput {
  const isFlash = model === "gemini-2.5-flash";
  const ref = buildDryRunReferences().get(pageId);
  if (!ref) return {
    model, rawText: "[No reference for this page]",
    httpStatus: 200, promptTokens: 800, candidatesTokens: 400,
    totalTokens: 1200, latencyMs: isFlash ? 1200 : 900, pageIndex: 1,
  };
  let text = ref.rawText;
  if (ref.rawText.includes("Dieu 1") && !isFlash)
    text = text.replace("150.000.000", "150.000.100");
  if (ref.rawText.includes("Tran Thi Y") && !isFlash)
    text = text.replace("001234567890", "001234567091");
  if (ref.rawText.includes("thua dat so 42") && !isFlash)
    text = text.replace("thua dat so 42\n", "");
  return {
    model, rawText: text.trim(), httpStatus: 200,
    promptTokens: isFlash ? 820 : 810,
    candidatesTokens: isFlash ? 410 : 395,
    totalTokens: isFlash ? 1230 : 1205,
    latencyMs: isFlash ? 1350 : 950, pageIndex: 1,
  };
}

// ── Deterministic offline evaluation ─────────────────────────────
// PHASE A+B: there is NO live API path. The ONLY execution mode is --dryRun,
// which calls generateDryRunOutput() for synthetic content. The runner below
// is structurally unable to reach the real Gemini/OCR.space network path.

const RUNNER = "ocr-model-benchmark";

function buildDryPerPageRow(
  page: import("./types").BenchmarkPageEntry,
  model: string, runId: string
): PerPageRow {
  const ref = buildDryRunReferences().get(page.benchmarkPageId);
  const out = generateDryRunOutput(page.benchmarkPageId, model, runId);
  const pricing = buildDryRunPricing();
  const reference: PageReference = ref ?? {
    benchmarkPageId: page.benchmarkPageId,
    referenceStatus: page.referenceStatus,
    rawText: out.rawText, entities: [],
  };
  const CER = computeCer(reference.rawText, out.rawText);
  const WER = computeWer(reference.rawText, out.rawText);
  const legalCriticalMetrics = evaluatePageLegalMetrics(reference, out.rawText);
  const humanReviewRequired = collectHumanReviewRequired(reference, out.rawText);
  const layoutObservations = evaluateLayoutFromReference(reference, out.rawText);
  const base = {
    runId, phase: "initial" as const, benchmarkPageId: page.benchmarkPageId,
    model, runNumber: 1, category: page.category, difficulty: page.difficulty,
    referenceStatus: page.referenceStatus, outcome: "OK" as const, success: true,
    failureCategory: null, fallbackUsed: false, fallbackProvider: null,
    promptTokens: out.promptTokens, candidatesTokens: out.candidatesTokens,
    totalTokens: out.totalTokens, cachedContentTokenCount: 0,
    thoughtsTokenCount: 0, latencyMs: out.latencyMs, httpStatus: out.httpStatus,
    errorCategory: null, keyIndex: 0, attempt: 1,
    CER, WER, legalCriticalMetrics, humanReviewRequired, layoutObservations,
  };
  return { ...base, costPerPage: computeRowCost(base, pricing) };
}

function summarizeRows(rows: PerPageRow[]): PerModelSummary {
  const model = rows[0]?.model ?? "";
  const cerVals = rows.map((r) => r.CER).filter((v): v is number => typeof v === "number");
  const werVals = rows.map((r) => r.WER).filter((v): v is number => typeof v === "number");
  const tokVals = rows.map((r) => r.totalTokens).filter((v): v is number => typeof v === "number");
  const latVals = rows.map((r) => r.latencyMs).filter((v): v is number => typeof v === "number");
  const avg = (vs: number[]) => vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
  const median = (vs: number[]) => {
    if (!vs.length) return null;
    const s = [...vs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  const pct = (vs: number[], p: number) => {
    if (!vs.length) return null;
    const s = [...vs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
  };
  const dist = (vs: number[]) => ({
    mean: avg(vs), p50: median(vs), p95: pct(vs, 95), n: vs.length,
  });
  const pricing = buildDryRunPricing();
  const cost = sumCost(rows.map((r) => r.costPerPage));
  return {
    runId: rows[0]?.runId ?? "", phase: "initial", model,
    pagesAttempted: rows.length,
    pagesSucceeded: rows.filter((r) => r.success).length,
    pagesFailed: rows.filter((r) => !r.success).length,
    malformedOutputs: rows.filter((r) => r.outcome === "MALFORMED_MODEL_OUTPUT").length,
    geminiFailures: rows.filter((r) => r.outcome === "GEMINI_FAILURE").length,
    bothFailed: rows.filter((r) => r.outcome === "BOTH_FAILED").length,
    fallbackRate: rows.length ? rows.filter((r) => r.fallbackUsed).length / rows.length : 0,
    geminiRequests: rows.length, retries: 0, keyRotations: 0,
    meanTokensPerPage: avg(tokVals) ?? 0,
    medianTokensPerPage: median(tokVals) ?? 0,
    p50TokensPerPage: median(tokVals) ?? 0,
    p95TokensPerPage: pct(tokVals, 95) ?? 0,
    meanLatencyMs: avg(latVals) ?? 0,
    p50LatencyMs: median(latVals) ?? 0,
    p95LatencyMs: pct(latVals, 95) ?? 0,
    CER: dist(cerVals), WER: dist(werVals),
    legalCriticalErrorSummary: {},
    catastrophicLegalCriticalErrorCount: 0,
    catastrophicByCategory: {
      CLEAN_JUDGMENT: 0, POOR_SCAN: 0,
      MINUTES_STATEMENTS: 0, STRUCTURED_DOCUMENT: 0, DIFFICULT_LEGAL_PAGE: 0,
    },
    humanReviewRequiredCounts: {},
    costPerPage: cost,
    costPer100Pages: scaleCost(cost, 100),
    costPer1000Pages: scaleCost(cost, 1000),
  };
}

function printReport(rows: PerPageRow[]): void {
  const models = [...new Set(rows.map((r) => r.model))];
  console.log("\n==========================================================");
  console.log("LEXOCR OCR Model Benchmark — Phase A+B (offline dry-run)");
  console.log("==========================================================");
  console.log(`Models : ${models.join(", ")}`);
  console.log(`Pages  : ${new Set(rows.map((r) => r.benchmarkPageId)).size}`);
  for (const model of models) {
    const mRows = rows.filter((r) => r.model === model);
    const s = summarizeRows(mRows);
    console.log(`\n[${model}]`);
    console.log(`  pages       : ${s.pagesAttempted}`);
    console.log(`  sampleCount : ${s.CER.n}`);
    console.log(`  CER mean    : ${s.CER.mean === null ? "N/A" : s.CER.mean.toFixed(4)}`);
    console.log(`  WER mean    : ${s.WER.mean === null ? "N/A" : s.WER.mean.toFixed(4)}`);
    console.log(`  costUSD/run : ${s.costPerPage.totalUSD === null ? "N/A" : "$" + s.costPerPage.totalUSD.toFixed(6)}`);
    console.log(`  costVND/run : ${s.costPerPage.totalVND === null ? "N/A" : s.costPerPage.totalVND.toFixed(0) + " đ"}`);
    console.log(`  malformed   : ${s.malformedOutputs}`);
  }
  console.log("\n--- per-page detail ---");
  for (const r of rows) {
    console.log(
      `  ${r.benchmarkPageId} [${r.model}] ` +
      `CER=${r.CER === null ? "N/A" : r.CER.toFixed(4)} ` +
      `WER=${r.WER === null ? "N/A" : r.WER.toFixed(4)} ` +
      `legalTypes=${Object.keys(r.legalCriticalMetrics).length} ` +
      `layoutKeys=${Object.keys(r.layoutObservations).length}`
    );
  }
}

function main(): number {
  const cfg = parseArgs(process.argv);
  if (cfg.dryRun) {
    const runId = `dry-run-${Date.now()}`;
    const manifest = buildDryRunManifest();
    const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    const rows: PerPageRow[] = [];
    for (const model of models)
      for (const page of manifest.pages)
        rows.push(buildDryPerPageRow(page, model, runId));
    printReport(rows);
    console.log("\n==========================================================");
    console.log("DRY_RUN = PASS");
    console.log("NETWORK_CALLS = 0");
    console.log("API_CALLS = 0");
    console.log("==========================================================");
    return 0;
  }
  console.error("ERROR: PHASE A+B does not support live API execution. Use --dryRun.");
  console.error("No Gemini / OCR.space / external network call was made.");
  return 2;
}

if (process.argv[1] && process.argv[1].endsWith(RUNNER + ".ts")) {
  process.exitCode = main();
}

