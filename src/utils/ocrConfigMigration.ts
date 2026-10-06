import type { OcrConfig } from "../types";

const DEFAULT_OUTPUT_FORMAT = "TXT";
const DEFAULT_LANGUAGE = "vie";
const DEFAULT_PRESERVE_LAYOUT = true;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLanguage(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return DEFAULT_LANGUAGE;
  }

  const language = value.trim();
  return language === "vi" ? "vie" : language;
}

export function migrateOcrConfig(raw: unknown, isPro: boolean): OcrConfig {
  const savedConfig = isRecord(raw) ? raw : {};

  return {
    engine: isPro ? "gemini" : "tesseract",
    outputFormat:
      typeof savedConfig.outputFormat === "string" &&
      savedConfig.outputFormat.trim() !== ""
        ? savedConfig.outputFormat
        : DEFAULT_OUTPUT_FORMAT,
    language: normalizeLanguage(savedConfig.language),
    preserveLayout:
      typeof savedConfig.preserveLayout === "boolean"
        ? savedConfig.preserveLayout
        : DEFAULT_PRESERVE_LAYOUT,
  };
}
