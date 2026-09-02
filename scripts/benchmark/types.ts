/**
 * LEXOCR OCR model benchmark — shared types.
 */

export interface CanonicalGenerationConfig {
  temperature: number;
  topP: number;
  candidateCount: number;
}

export interface CanonicalSafetySetting {
  category: string;
  threshold: 'BLOCK_NONE';
}

export interface CanonicalContract {
  endpoint: string;
  promptInitial: string;
  promptRecitationPrefix: string;
  generationConfig: CanonicalGenerationConfig;
  safetySettings: CanonicalSafetySetting[];
  aiIntroRegex: RegExp;
  maxTransientRetries: number;
  transientDelayBaseMs: number;
  maxRateLimitRetries: number;
  rateLimitDelayBaseMs: number;
}

export type BenchmarkPageCategory =
  | 'CLEAN_JUDGMENT'
  | 'POOR_SCAN'
  | 'MINUTES_STATEMENTS'
  | 'STRUCTURED_DOCUMENT'
  | 'DIFFICULT_LEGAL_PAGE';

export type BenchmarkDifficulty = 'easy' | 'medium' | 'hard';

export type ReferenceStatus = 'REFERENCE_VERIFIED' | 'REFERENCE_DRAFT' | 'REFERENCE_MISSING';

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface BenchmarkPageEntry {
  benchmarkPageId: string;
  fileName: string;
  imageFormat: ImageFormat;
  category: BenchmarkPageCategory;
  difficulty: BenchmarkDifficulty;
  referenceStatus: ReferenceStatus;
  referenceFileName: string | null;
  notes?: string;
}

export interface BenchmarkManifest {
  schemaVersion: '1.0';
  name: string;
  description: string;
  created: string;
  pages: BenchmarkPageEntry[];
}

export interface ReferenceEntityEntry {
  kind: string;
  text: string;
  category?: string;
}

export interface PageReference {
  benchmarkPageId: string;
  referenceStatus: ReferenceStatus;
  entities: ReferenceEntityEntry[];
  rawText: string;
}

export interface ModelPricingEntry {
  inputPricePerMillionTokens: number;
  outputPricePerMillionTokens: number;
  currency: 'USD';
}

export interface BenchmarkPricing {
  schemaVersion: '1.0';
  asOf: string;
  source: string;
  usdToVnd: number;
  models: Record<string, ModelPricingEntry>;
}

export type PageOutcome = 'OK' | 'MALFORMED_MODEL_OUTPUT' | 'GEMINI_FAILURE' | 'BOTH_FAILED';

export type MeasurementMode = 'REFERENCE_ANCHORED_RECALL' | 'AUTO_MEASURED' | 'INSUFFICIENT_EVIDENCE';

export type EvidenceStatus =
  | 'AUTO_MEASURED_SUFFICIENT_EVIDENCE'
  | 'REFERENCE_ANCHORED_RECALL_HUMAN_REVIEW_REQUIRED_FOR_PRECISION'
  | 'INSUFFICIENT_EVIDENCE';

export interface EntityMetric {
  measurementMode: MeasurementMode;
  refCount: number | null;
  correct: number | null;
  incorrect: number | null;
  missing: number | null;
  exactRecall: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  humanReviewRequired: boolean;
}

export interface HumanReviewRequiredEntry {
  kind: string;
  candidate: string;
  referenceText?: string;
}

export type LayoutObservation = Record<string, string | number | boolean | null>;

export type PhaseLabel = 'initial' | 'targeted_repeat';

export interface PerPageRow {
  runId: string;
  phase: PhaseLabel;
  benchmarkPageId: string;
  model: string;
  runNumber: number;
  category: BenchmarkPageCategory;
  difficulty: BenchmarkDifficulty;
  referenceStatus: ReferenceStatus;
  outcome: PageOutcome;
  success: boolean;
  failureCategory: string | null;
  fallbackUsed: boolean;
  fallbackProvider: string | null;
  promptTokens: number | null;
  candidatesTokens: number | null;
  totalTokens: number | null;
  cachedContentTokenCount: number | null;
  thoughtsTokenCount: number | null;
  latencyMs: number | null;
  httpStatus: number | null;
  errorCategory: string | null;
  keyIndex: number;
  attempt: number;
  CER: number | null;
  WER: number | null;
  legalCriticalMetrics: Record<string, EntityMetric>;
  humanReviewRequired: HumanReviewRequiredEntry[];
  layoutObservations: LayoutObservation;
}

export interface MetricDistribution {
  mean: number | null;
  p50: number | null;
  p95: number | null;
  n: number;
}

export interface EntitySummary {
  measurementMode: MeasurementMode;
  exactRecall?: MetricDistribution;
  precision?: MetricDistribution;
  recall?: MetricDistribution;
  f1?: MetricDistribution;
  n_pages: number;
  n_ref_entities: number;
}

export interface CostPerPage {
  inputUSD: number | null;
  outputUSD: number | null;
  totalUSD: number | null;
  totalVND: number | null;
}

export interface PerModelSummary {
  runId: string;
  phase: PhaseLabel;
  model: string;
  pagesAttempted: number;
  pagesSucceeded: number;
  pagesFailed: number;
  malformedOutputs: number;
  geminiFailures: number;
  bothFailed: number;
  fallbackRate: number;
  geminiRequests: number;
  retries: number;
  keyRotations: number;
  meanTokensPerPage: number;
  medianTokensPerPage: number;
  p50TokensPerPage: number;
  p95TokensPerPage: number;
  meanLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  CER: MetricDistribution;
  WER: MetricDistribution;
  legalCriticalErrorSummary: Record<string, EntitySummary>;
  catastrophicLegalCriticalErrorCount: number;
  catastrophicByCategory: Record<BenchmarkPageCategory, number>;
  humanReviewRequiredCounts: Record<string, number>;
  costPerPage: CostPerPage;
  costPer100Pages: CostPerPage;
  costPer1000Pages: CostPerPage;
}

export interface PairedDelta {
  median_delta: number;
  p95_abs_delta: number;
  n_increased: number;
  n_decreased: number;
  n_unchanged: number;
}

export interface ByCategoryBlock {
  [model: string]: { CER: number; catastrophic: number; n: number };
}

export interface ByEntityTypeBlock {
  samples_with_ref: number;
  [model: string]: Record<string, unknown> | number;
}

export interface CatastrophicPageEntry {
  kind: 'CATASTROPHIC_PAGE';
  pageId: string;
  model: string;
  entity: string;
}

export type DecisionRecommendation = 'FLASH_LITE_ACCEPT' | 'HYBRID_ROUTING' | 'FLASH_RETAIN' | 'INCONCLUSIVE';

export interface ComparisonSummary {
  perModel: Record<string, PerModelSummary>;
  pairedPerPageDeltas: {
    samples: number;
    CER: PairedDelta;
    WER: PairedDelta;
    latencyMs: { median_delta_ms: number; p95_abs_delta_ms: number };
    totalTokens: { median_delta: number; p95_abs_delta: number };
  };
  byCategory: Partial<Record<BenchmarkPageCategory, ByCategoryBlock>>;
  byEntityType: Record<string, ByEntityTypeBlock>;
  evidenceStatus: Record<string, EvidenceStatus>;
  decisionRecommendation: DecisionRecommendation;
  decisionRationale: string;
  thresholdsApplied: string;
  humanReviewRequired: CatastrophicPageEntry[];
}

export interface ComparisonResult {
  runId: string;
  phase: PhaseLabel;
  asOf: string;
  canonicalContract: { endpoint: string; prompt: string; source: string };
  models: string[];
  pricing: { asOf: string; source: string };
  summary: ComparisonSummary;
}

export type TargetedRepeatTriggerReason =
  | 'MODEL_DISAGREEMENT'
  | 'CATASTROPHIC_LEGAL_CRITICAL'
  | 'MALFORMED_OUTPUT'
  | 'ANOMALOUS_LATENCY'
  | 'CATEGORY_DEGRADATION';

export interface PerPageRepeatStat {
  benchmarkPageId: string;
  model: string;
  phase1Outcome: PageOutcome;
  repetitions: number;
  CER: { min: number; max: number; median: number; stddev: number };
  WER: { min: number; max: number; median: number; stddev: number };
}

export interface TargetedRepeatResult {
  phase: 'targeted_repeat';
  triggerReasons: TargetedRepeatTriggerReason[];
  perPageRepeatStats: PerPageRepeatStat[];
  varianceBound: string;
}

export interface BenchmarkRunConfig {
  manifestPath: string;
  pricingPath: string;
  phase: PhaseLabel;
  outDir: string;
  phase1ResultsPath?: string;
  targetedRepetitions?: number;
  dryRun: boolean;
  apiKeyEnvVar: string;
}

export const REFERENCE_ANCHORED_TYPES: readonly string[] = [
  'PERSON_NAME',
  'ORGANIZATION_NAME',
  'ADDRESS',
];

export const AUTO_MEASURED_TYPES: readonly string[] = [
  'DATE',
  'MONEY_AMOUNT',
  'DOCUMENT_NUMBER',
  'LEGAL_ARTICLE',
  'LEGAL_CLAUSE_POINT',
  'LAND_PARCEL_NUMBER',
  'MAP_SHEET_NUMBER',
  'IDENTIFICATION_NUMBER',
];

export const ALL_ENTITY_TYPES: readonly string[] = [
  ...REFERENCE_ANCHORED_TYPES,
  ...AUTO_MEASURED_TYPES,
];

export const CATASTROPHIC_AUTO_MEASURED_TYPES: readonly string[] = [
  'DOCUMENT_NUMBER',
  'MONEY_AMOUNT',
  'LEGAL_ARTICLE',
  'LEGAL_CLAUSE_POINT',
  'LAND_PARCEL_NUMBER',
  'MAP_SHEET_NUMBER',
  'IDENTIFICATION_NUMBER',
];
