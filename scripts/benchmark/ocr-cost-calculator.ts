/**
 * LEXOCR OCR model benchmark — cost calculator.
 *
 * Pricing-driven cost layer:
 *  - inputUSD / outputUSD / totalUSD per page.
 *  - totalVND via operator-supplied usdToVnd rate.
 *  - per-100 / per-1000 aggregates.
 *
 * Stale pricing (>30 days from `asOf`) emits a warning and REFUSES to compute
 * cost aggregates (the operator must refresh pricing).
 */
import type {
  BenchmarkPricing,
  CostPerPage,
  ModelPricingEntry,
  PerPageRow,
} from "./types";

const STALE_DAYS_THRESHOLD = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CostValidationError =
  | "PRICING_MISSING"
  | "PRICING_STALE"
  | "MODEL_MISSING"
  | "NEGATIVE_VALUES"
  | "INVALID_USD_TO_VND";

export interface CostValidationResult {
  ok: boolean;
  errors: CostValidationError[];
  warnings: string[];
}

/** Validate pricing without computing cost. */
export function validatePricing(pricing: BenchmarkPricing | null): CostValidationResult {
  const errors: CostValidationError[] = [];
  const warnings: string[] = [];

  if (!pricing) {
    errors.push("PRICING_MISSING");
    return { ok: false, errors, warnings };
  }
  if (!pricing.models || typeof pricing.models !== "object") {
    errors.push("PRICING_MISSING");
    return { ok: false, errors, warnings };
  }
  if (
    !Number.isFinite(pricing.usdToVnd) ||
    pricing.usdToVnd <= 0
  ) {
    errors.push("INVALID_USD_TO_VND");
  }

  for (const [model, entry] of Object.entries(pricing.models)) {
    if (!entry) {
      errors.push("MODEL_MISSING");
      continue;
    }
    if (
      !Number.isFinite(entry.inputPricePerMillionTokens) ||
      !Number.isFinite(entry.outputPricePerMillionTokens) ||
      entry.inputPricePerMillionTokens < 0 ||
      entry.outputPricePerMillionTokens < 0
    ) {
      errors.push("NEGATIVE_VALUES");
      void model;
    }
  }

  // Stale check.
  const asOfTime = Date.parse(pricing.asOf);
  if (Number.isFinite(asOfTime)) {
    const ageDays = (Date.now() - asOfTime) / MS_PER_DAY;
    if (ageDays > STALE_DAYS_THRESHOLD) {
      errors.push("PRICING_STALE");
      warnings.push(
        `Pricing is ${ageDays.toFixed(1)} days old (threshold ${STALE_DAYS_THRESHOLD} days).`
      );
    }
  } else {
    errors.push("PRICING_STALE");
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Compute cost for a single row given model pricing and FX rate. */
export function computeRowCost(
  row: PerPageRow,
  pricing: BenchmarkPricing
): CostPerPage {
  const entry: ModelPricingEntry | undefined = pricing.models[row.model];
  if (!entry) {
    return { inputUSD: null, outputUSD: null, totalUSD: null, totalVND: null };
  }
  if (row.promptTokens === null || row.candidatesTokens === null) {
    return { inputUSD: null, outputUSD: null, totalUSD: null, totalVND: null };
  }
  const inputUSD =
    (row.promptTokens / 1_000_000) * entry.inputPricePerMillionTokens;
  const outputUSD =
    (row.candidatesTokens / 1_000_000) * entry.outputPricePerMillionTokens;
  const totalUSD = inputUSD + outputUSD;
  const totalVND = totalUSD * pricing.usdToVnd;
  return { inputUSD, outputUSD, totalUSD, totalVND };
}

/** Sum cost across multiple rows. */
export function sumCost(rows: CostPerPage[]): CostPerPage {
  const init = { inputUSD: 0, outputUSD: 0, totalUSD: 0, totalVND: 0 };
  const out = rows.reduce(
    (acc, r) => ({
      inputUSD: (acc.inputUSD ?? 0) + (r.inputUSD ?? 0),
      outputUSD: (acc.outputUSD ?? 0) + (r.outputUSD ?? 0),
      totalUSD: (acc.totalUSD ?? 0) + (r.totalUSD ?? 0),
      totalVND: (acc.totalVND ?? 0) + (r.totalVND ?? 0),
    }),
    init
  );
  return out;
}

/** Scale a per-row aggregate to per-N-pages (e.g., 100 or 1000). */
export function scaleCost(cost: CostPerPage, scale: number): CostPerPage {
  return {
    inputUSD: (cost.inputUSD ?? 0) * scale,
    outputUSD: (cost.outputUSD ?? 0) * scale,
    totalUSD: (cost.totalUSD ?? 0) * scale,
    totalVND: (cost.totalVND ?? 0) * scale,
  };
}

﻿
