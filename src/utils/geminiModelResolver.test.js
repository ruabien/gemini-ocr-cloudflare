import { strict as assert } from 'assert';
import { filterOcrCapableModels, resolveBestGeminiModel, autoResolveModel, getActiveModel, migrateOldStorage, validateGeminiModel } from './geminiModelResolver.ts';

// Mock localStorage for Node environment
const store = new Map();
global.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, value) => store.set(key, value.toString()),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

// Mock fetch for API calls
let fetchResponses = {};
global.fetch = async (url) => {
  const urlStr = url.toString();
  for (const [key, responseFn] of Object.entries(fetchResponses)) {
    if (urlStr.includes(key)) {
      return responseFn();
    }
  }
  return { ok: true, json: async () => ({ models: [] }) };
};

const uid = 'testuser';

async function runTests() {
  console.log('=== GEMINI MODEL RESOLVER TESTS ===\n');

  // Test A & B: Auto chọn gemini-2.5-flash khi model này khả dụng.
  console.log('Test A: Auto chọn gemini-2.5-flash khi model này khả dụng');
  const mockModelsList1 = [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
  ];
  assert.strictEqual(resolveBestGeminiModel(mockModelsList1), 'gemini-2.5-flash');

  // Auto không chọn gemini-3.5-flash khi 2.5 không khả dụng.
  // Auto trả NO_COMPATIBLE_MODEL nếu không có gemini-2.5-flash.
  console.log('Test B: Auto không chọn gemini-3.5-flash và trả NO_COMPATIBLE_MODEL');
  const mockModelsList2 = [
    { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
  ];
  assert.strictEqual(resolveBestGeminiModel(mockModelsList2), null);
  console.log('[PASS] Model priority correctly limits selection to gemini-2.5-flash.');

  // Test C & D: filter capability filtering
  console.log('Test C & D: Filter out non-OCR models');
  const mockModelsList3 = [
    { name: 'models/gemini-2.5-flash-embedding', supportedGenerationMethods: ['generateContent'] }, // embedding
    { name: 'models/gemini-2.5-flash-vision', supportedGenerationMethods: ['generateContent'] }, // older vision
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['embedContent'] }, // no generateContent
    { name: 'models/gemini-imagen', supportedGenerationMethods: ['generateContent'] },
  ];
  assert.deepEqual(filterOcrCapableModels(mockModelsList3), []);
  assert.strictEqual(resolveBestGeminiModel(mockModelsList3), null);
  console.log('[PASS] Invalid models (embedding, non-generateContent) excluded properly.');

  // Test E: Migrate old storage
  console.log('Test E: LocalStorage migration');
  store.clear();
  global.localStorage.setItem(`lexocr:${uid}:ocr_model`, 'gemini-1.5-flash');
  migrateOldStorage(uid);
  assert.strictEqual(global.localStorage.getItem(`lexocr:${uid}:gemini_model_mode`), 'auto');
  assert.strictEqual(global.localStorage.getItem(`lexocr:${uid}:ocr_model`), 'gemini-2.5-flash');
  console.log('[PASS] Storage migration correctly updates default to gemini-2.5-flash.');

  console.log('Test: Auto mode cache behaviors');
  store.clear();
  
  let modelsListCallCount = 0;
  fetchResponses = {
    'key_valid': () => {
      modelsListCallCount++;
      return { ok: true, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }) };
    },
    'key_error': () => {
      modelsListCallCount++;
      return { ok: false, status: 403 };
    }
  };

  // B. Auto mode, chưa có cache, có key hợp lệ
  console.log('Test B: Auto mode, no cache, valid key');
  const m1 = await autoResolveModel(uid, 'key_valid', false);
  assert.strictEqual(m1, 'gemini-2.5-flash');
  assert.strictEqual(modelsListCallCount, 1, "Should call models.list exactly once");
  console.log('[PASS] Resolved model and cached it.');

  // A. Auto mode, cache có sẵn
  console.log('Test A: Auto mode, cache available');
  modelsListCallCount = 0; // Reset counter
  const m1_cached = await autoResolveModel(uid, 'key_valid', false);
  assert.strictEqual(m1_cached, 'gemini-2.5-flash', "Should use cached value");
  assert.strictEqual(modelsListCallCount, 0, "Should not call models.list if cache exists");
  console.log('[PASS] Cache used, models.list not called.');
  
  // C. Auto mode, chưa có cache, resolver lỗi
  console.log('Test C: Auto mode, no cache, resolver fails');
  store.clear();
  modelsListCallCount = 0;
  let caughtError = null;
  try {
    await autoResolveModel(uid, 'key_error', false);
  } catch (err) {
    caughtError = err;
  }
  assert.notEqual(caughtError, null, "Should throw error on resolver failure");
  assert.strictEqual(caughtError.message, "INVALID_KEY", "Friendly error code expected");
  assert.strictEqual(modelsListCallCount, 1, "Called API and failed");
  // Check that no cache is saved
  assert.strictEqual(global.localStorage.getItem(`lexocr:${uid}:gemini_resolved_model`), null);
  console.log('[PASS] Resolver error propagates without saving old fallback.');

  // Test G: Manual model validation
  console.log('Test G: Manual model validation');
  fetchResponses = {
    'key3': () => ({ ok: true, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }) }),
  };
  const isValid1 = await validateGeminiModel('key3', 'gemini-2.5-flash');
  const isValid2 = await validateGeminiModel('key3', 'gemini-3.5-flash');
  assert.strictEqual(isValid1, true);
  assert.strictEqual(isValid2, false);
  console.log('[PASS] Manual model validation correctly checks models API list.');

  // Test H: Manual vẫn giữ nguyên model đã chọn
  console.log('Test H: Manual mode keeps selected model');
  store.clear();
  global.localStorage.setItem(`lexocr:${uid}:gemini_model_mode`, 'manual');
  global.localStorage.setItem(`lexocr:${uid}:ocr_model`, 'gemini-3.5-flash');
  const activeModel = getActiveModel(uid);
  assert.strictEqual(activeModel, 'gemini-3.5-flash');
  console.log('[PASS] Manual mode preserves user-selected model.');

  console.log('\nAll Gemini Model Resolver tests passed successfully!');
}

runTests().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});