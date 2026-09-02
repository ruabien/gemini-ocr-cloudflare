/**
 * LEXOCR OCR model benchmark — manifest loader & validator.
 *
 * Manifest schema (v1.0):
 *  - schemaVersion: "1.0"
 *  - name / description / created (string)
 *  - pages: BenchmarkPageEntry[] with required fields.
 */
import { readFileSync } from "node:fs";
import type {
  BenchmarkManifest,
  BenchmarkPageCategory,
  BenchmarkPageEntry,
  BenchmarkDifficulty,
  ImageFormat,
  ReferenceStatus,
} from "./types";

const VALID_CATEGORIES: ReadonlyArray<BenchmarkPageCategory> = [
  "CLEAN_JUDGMENT",
  "POOR_SCAN",
  "MINUTES_STATEMENTS",
  "STRUCTURED_DOCUMENT",
  "DIFFICULT_LEGAL_PAGE",
];

const VALID_DIFFICULTIES: ReadonlyArray<BenchmarkDifficulty> = [
  "easy",
  "medium",
  "hard",
];

const VALID_IMAGE_FORMATS: ReadonlyArray<ImageFormat> = ["png", "jpeg", "webp"];

const VALID_REFERENCE_STATUSES: ReadonlyArray<ReferenceStatus> = [
  "REFERENCE_VERIFIED",
  "REFERENCE_DRAFT",
  "REFERENCE_MISSING",
];

export type ManifestValidationError =
  | "MANIFEST_MISSING"
  | "MANIFEST_INVALID_JSON"
  | "MANIFEST_SCHEMA_VERSION"
  | "MANIFEST_MISSING_FIELD"
  | "MANIFEST_UNKNOWN_CATEGORY"
  | "MANIFEST_UNKNOWN_DIFFICULTY"
  | "MANIFEST_UNKNOWN_IMAGE_FORMAT"
  | "MANIFEST_UNKNOWN_REFERENCE_STATUS"
  | "MANIFEST_DUPLICATE_PAGE_ID"
  | "MANIFEST_REFERENCE_FILE_REQUIRED";

export interface ManifestValidationResult {
  ok: boolean;
  errors: { code: ManifestValidationError; path: string; message: string }[];
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}


function validatePageEntry(
  entry: unknown,
  index: number
): { errors: ManifestValidationResult["errors"]; page?: BenchmarkPageEntry } {
  const errors: ManifestValidationResult["errors"] = [];
  const path = `pages[${index}]`;
  if (!isObject(entry)) {
    errors.push({
      code: "MANIFEST_MISSING_FIELD",
      path,
      message: "page entry must be an object",
    });
    return { errors };
  }

  const required: (keyof BenchmarkPageEntry)[] = [
    "benchmarkPageId", "fileName", "imageFormat",
    "category", "difficulty", "referenceStatus", "referenceFileName",
  ];
  for (const key of required) {
    if (!(key in entry)) {
      errors.push({
        code: "MANIFEST_MISSING_FIELD",
        path: `${path}.${key}`,
        message: `required field '${key}' is missing`,
      });
    }
  }

  if (!isString(entry.benchmarkPageId) || entry.benchmarkPageId.length === 0) {
    errors.push({ code: "MANIFEST_MISSING_FIELD", path: `${path}.benchmarkPageId`, message: "benchmarkPageId must be a non-empty string" });
  }
  if (!isString(entry.fileName) || entry.fileName.length === 0) {
    errors.push({ code: "MANIFEST_MISSING_FIELD", path: `${path}.fileName`, message: "fileName must be a non-empty string" });
  }
  if (isString(entry.imageFormat) && !VALID_IMAGE_FORMATS.includes(entry.imageFormat as ImageFormat)) {
    errors.push({ code: "MANIFEST_UNKNOWN_IMAGE_FORMAT", path: `${path}.imageFormat`, message: `imageFormat must be one of: ${VALID_IMAGE_FORMATS.join(", ")}` });
  }
  if (isString(entry.category) && !VALID_CATEGORIES.includes(entry.category as BenchmarkPageCategory)) {
    errors.push({ code: "MANIFEST_UNKNOWN_CATEGORY", path: `${path}.category`, message: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
  }
  if (isString(entry.difficulty) && !VALID_DIFFICULTIES.includes(entry.difficulty as BenchmarkDifficulty)) {
    errors.push({ code: "MANIFEST_UNKNOWN_DIFFICULTY", path: `${path}.difficulty`, message: `difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}` });
  }
  if (isString(entry.referenceStatus) && !VALID_REFERENCE_STATUSES.includes(entry.referenceStatus as ReferenceStatus)) {
    errors.push({ code: "MANIFEST_UNKNOWN_REFERENCE_STATUS", path: `${path}.referenceStatus`, message: `referenceStatus must be one of: ${VALID_REFERENCE_STATUSES.join(", ")}` });
  }
  if (entry.referenceStatus === "REFERENCE_VERIFIED" && (entry.referenceFileName === null || entry.referenceFileName === undefined)) {
    errors.push({ code: "MANIFEST_REFERENCE_FILE_REQUIRED", path: `${path}.referenceFileName`, message: "REFERENCE_VERIFIED pages must declare a non-null referenceFileName" });
  }

  if (errors.length > 0) return { errors };
  const page: BenchmarkPageEntry = {
    benchmarkPageId: entry.benchmarkPageId as string,
    fileName: entry.fileName as string,
    imageFormat: entry.imageFormat as ImageFormat,
    category: entry.category as BenchmarkPageCategory,
    difficulty: entry.difficulty as BenchmarkDifficulty,
    referenceStatus: entry.referenceStatus as ReferenceStatus,
    referenceFileName: entry.referenceFileName as string | null,
    notes: isString(entry.notes) ? (entry.notes as string) : undefined,
  };
  return { errors, page };
}

export function validateManifest(manifest: unknown): ManifestValidationResult {
  const errors: ManifestValidationResult["errors"] = [];
  if (!isObject(manifest)) {
    errors.push({ code: "MANIFEST_MISSING_FIELD", path: "$", message: "manifest must be an object" });
    return { ok: false, errors };
  }
  if (manifest.schemaVersion !== "1.0") {
    errors.push({ code: "MANIFEST_SCHEMA_VERSION", path: "$.schemaVersion", message: "schemaVersion must be '1.0'" });
  }
  if (!isString(manifest.name)) errors.push({ code: "MANIFEST_MISSING_FIELD", path: "$.name", message: "name is required" });
  if (!isString(manifest.description)) errors.push({ code: "MANIFEST_MISSING_FIELD", path: "$.description", message: "description is required" });
  if (!isString(manifest.created)) errors.push({ code: "MANIFEST_MISSING_FIELD", path: "$.created", message: "created is required" });
  if (!Array.isArray(manifest.pages)) {
    errors.push({ code: "MANIFEST_MISSING_FIELD", path: "$.pages", message: "pages must be an array" });
    return { ok: false, errors };
  }

  const seen = new Set<string>();
  for (let i = 0; i < manifest.pages.length; i++) {
    const { errors: pageErrors, page } = validatePageEntry(manifest.pages[i], i);
    errors.push(...pageErrors);
    if (page) {
      if (seen.has(page.benchmarkPageId)) {
        errors.push({ code: "MANIFEST_DUPLICATE_PAGE_ID", path: `pages[${i}].benchmarkPageId`, message: `duplicate: ${page.benchmarkPageId}` });
      } else {
        seen.add(page.benchmarkPageId);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export function loadManifest(path: string): BenchmarkManifest {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`MANIFEST_MISSING: cannot read ${path}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`MANIFEST_INVALID_JSON: ${(e as Error).message}`);
  }
  const result = validateManifest(parsed);
  if (!result.ok) {
    const msg = result.errors.map((e) => `${e.path}: ${e.message} (${e.code})`).join("\n  ");
    throw new Error(`Manifest validation failed:\n  ${msg}`);
  }
  return parsed as BenchmarkManifest;
}

