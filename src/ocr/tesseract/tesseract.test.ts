import { strict as assert } from "node:assert";
import { getOcrEngine } from "../getOcrEngine";
import {
  normalizeTesseractLanguage,
  TESSERACT_ASSETS,
} from "./tesseractAssets";

function runTests() {
  let passed = 0;

  assert.equal(normalizeTesseractLanguage("vi"), "vie");
  passed += 1;

  assert.equal(normalizeTesseractLanguage("vie"), "vie");
  passed += 1;

  assert.equal(normalizeTesseractLanguage("en"), "eng");
  passed += 1;

  assert.throws(() => normalizeTesseractLanguage("fr"));
  passed += 1;

  const firstEngine = getOcrEngine("tesseract");
  assert.equal(firstEngine.id, "tesseract");
  passed += 1;

  const secondEngine = getOcrEngine("tesseract");
  assert.strictEqual(secondEngine, firstEngine);
  passed += 1;

  assert.throws(() => getOcrEngine("gemini"));
  passed += 1;

  assert.deepEqual(TESSERACT_ASSETS, {
    workerPath: "/tesseract/worker/worker.min.js",
    corePath: "/tesseract/core/tesseract-core-simd-lstm.wasm.js",
    langPath: "/tesseract/best",
  });
  passed += 1;

  console.log(`Tesseract engine tests passed: ${passed}/8`);
}

try {
  runTests();
} catch (error) {
  console.error("Tesseract engine tests failed:", error);
  process.exit(1);
}