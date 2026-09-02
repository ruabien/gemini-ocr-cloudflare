/**
 * LEXOCR OCR model benchmark — pricing loader & validator.
 *
 * Pricing schema (v1.0):
 *  - schemaVersion: "1.0"
 *  - asOf: ISO-8601 date string
 *  - source: URL or label
 *  - usdToVnd: number > 0
 *  - models: Record<modelName, { inputPricePerMillionTokens, outputPricePerMillionTokens, currency: "USD" }>
 */
import { readFileSync } from "node:fs";
import type { BenchmarkPricing } from "./types";

export type PricingValidationError =
  | "PRICING_MISSING"
  | "PRICING_INVALID_JSON"
  | "PRICING_SCHEMA_VERSION"
  | "PRICING_MISSING_FIELD"
  | "PRICING_INVALID_AS_OF"
  | "PRICING_INVALID_USD_TO_VND"
  | "PRICING_MODEL_MISSING"
  | "PRICING_MODEL_NEGATIVE";

export interface PricingValidationResult {
  ok: boolean;
  errors: { code: PricingValidationError; path: string; message: string }[];
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validatePricingData(pricing: unknown): PricingValidationResult {
  const errors: PricingValidationResult["errors"] = [];
  if (!isObject(pricing)) {
    errors.push({ code: "PRICING_MISSING", path: "$", message: "pricing must be an object" });
    return { ok: false, errors };
  }
  if (pricing.schemaVersion !== "1.0") {
    errors.push({ code: "PRICING_SCHEMA_VERSION", path: "$.schemaVersion", message: "schemaVersion must be '1.0'" });
  }
  if (!isString(pricing.asOf)) {
    errors.push({ code: "PRICING_MISSING_FIELD", path: "$.asOf", message: "asOf is required" });
  } else {
    const ts = Date.parse(pricing.asOf);
    if (!Number.isFinite(ts)) {
      errors.push({ code: "PRICING_INVALID_AS_OF", path: "$.asOf", message: "asOf must be a valid ISO-8601 date string" });
    }
  }
  if (!isString(pricing.source)) {
    errors.push({ code: "PRICING_MISSING_FIELD", path: "$.source", message: "source is required" });
  }
  if (typeof pricing.usdToVnd !== "number" || pricing.usdToVnd <= 0) {
    errors.push({ code: "PRICING_INVALID_USD_TO_VND", path: "$.usdToVnd", message: "usdToVnd must be a positive number" });
  }
  if (!isObject(pricing.models)) {
    errors.push({ code: "PRICING_MODEL_MISSING", path: "$.models", message: "models must be an object" });
    return { ok: errors.length === 0, errors };
  }
  for (const [model, entry] of Object.entries(pricing.models)) {
    if (!isObject(entry)) {
      errors.push({ code: "PRICING_MODEL_MISSING", path: `$.models['${model}']`, message: "model entry must be an object" });
      continue;
    }
    if (typeof entry.inputPricePerMillionTokens !== "number" || entry.inputPricePerMillionTokens < 0) {
      errors.push({ code: "PRICING_MODEL_NEGATIVE", path: `$.models['${model}'].inputPricePerMillionTokens`, message: "inputPricePerMillionTokens must be non-negative" });
    }
    if (typeof entry.outputPricePerMillionTokens !== "number" || entry.outputPricePerMillionTokens < 0) {
      errors.push({ code: "PRICING_MODEL_NEGATIVE", path: `$.models['${model}'].outputPricePerMillionTokens`, message: "outputPricePerMillionTokens must be non-negative" });
    }
    if (entry.currency !== "USD") {
      errors.push({ code: "PRICING_MODEL_MISSING", path: `$.models['${model}'].currency`, message: "currency must be 'USD'" });
    }
  }
  return { ok: errors.length === 0, errors };
}

export function loadPricing(path: string): BenchmarkPricing {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`PRICING_MISSING: cannot read ${path}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`PRICING_INVALID_JSON: ${(e as Error).message}`);
  }
  const result = validatePricingData(parsed);
  if (!result.ok) {
    const msg = result.errors.map((e) => `${e.path}: ${e.message} (${e.code})`).join("\n  ");
    throw new Error(`Pricing validation failed:\n  ${msg}`);
  }
  return parsed as BenchmarkPricing;
}

﻿
