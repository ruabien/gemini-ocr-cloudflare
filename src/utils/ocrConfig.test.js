import { strict as assert } from 'assert';
import { onRequest } from '../../functions/api/ocr.ts';

/**
 * Test the OCR configuration endpoint.
 *
 * - When no OCR_SPACE_API_KEY is set, the endpoint should respond with an
 *   object that has `primary` and `backup` fields both undefined (or null).
 * - When keys are provided, they should be returned correctly.
 *
 * This test runs in the Node environment using the `tsx` loader (type module).
 */

async function runTests() {
  console.log('=== OCR CONFIG TESTS ===\n');

  // 1. No keys configured
  const ctxNoKeys = { env: {} };
  const resNoKeys = await onRequest(ctxNoKeys);
  const jsonNoKeys = await resNoKeys.json();
  assert.strictEqual(jsonNoKeys.primary, undefined, 'primary should be undefined when no key');
  assert.strictEqual(jsonNoKeys.backup, undefined, 'backup should be undefined when no key');
  console.log('[PASS] No keys configured returns undefined fields');

  // 2. Both keys configured
  const ctxWithKeys = {
    env: {
      OCR_SPACE_API_KEY: 'test-key-1',
      OCR_SPACE_API_KEY_1: 'test-key-2',
    },
  };
  const resWithKeys = await onRequest(ctxWithKeys);
  const jsonWithKeys = await resWithKeys.json();
  assert.strictEqual(jsonWithKeys.primary, 'test-key-1', 'primary key should be returned');
  assert.strictEqual(jsonWithKeys.backup, 'test-key-2', 'backup key should be returned');
  console.log('[PASS] Keys configured are returned correctly');

  console.log('\nAll OCR config tests passed.');
}

runTests().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});