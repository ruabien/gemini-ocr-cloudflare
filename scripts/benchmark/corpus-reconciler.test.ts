/**
 * LEXOCR OCR model benchmark - C2-B1 reconciliation tests (A-G + negatives).
 */
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcileKind, reconcileCorpus, formatReconcileReport } from './corpus-reconciler';
import { readJsonFile } from './corpus-hash';
import type { BenchmarkManifest } from './types';

function rk(pageId, kind, entities, refText) {
  const entries = reconcileKind(pageId, kind, entities, refText);
  const m = new Map();
  for (const e of entries) m.set(e.text, e.reconciled);
  return m;
}

function e(kind, text, occ) { return { kind, text, occurrences: occ }; }

// Test A: clean-009 PERSON_NAME longest-surface (H, H2, Lê Thị H)
{
  const ref = 'Lê Thị H ... Lê Thị H ... H2 H2 H2 H2 H2 H2 H2 H2 H2 H2 ... bà H H H H H H H';
  const entities = [
    e('PERSON_NAME', 'Lê Thị H', 2),
    e('PERSON_NAME', 'H2', 10),
    e('PERSON_NAME', 'H', 7),
  ];
  const got = rk('clean-009', 'PERSON_NAME', entities, ref);
  assert.strictEqual(got.get('Lê Thị H'), 2, 'A: Lê Thị H count');
  assert.strictEqual(got.get('H2'), 10, 'A: H2 count');
  assert.strictEqual(got.get('H'), 7, 'A: H count');
  console.log('A PASS: PERSON_NAME longest-surface');
}

// Test B: clean-010 legal numeric prefix collision (Điều 37 only appears here as standalone)
{
  const ref = '... khoản 1 Điều 37 ... Điều 370 ... Điều 372 ...';
  const entities = [
    e('LEGAL_ARTICLE', 'Điều 37', 1),
    e('LEGAL_ARTICLE', 'Điều 370', 1),
    e('LEGAL_ARTICLE', 'Điều 372', 1),
  ];
  const got = rk('clean-010', 'LEGAL_ARTICLE', entities, ref);
  assert.strictEqual(got.get('Điều 37'), 1, 'B: Điều 37');
  assert.strictEqual(got.get('Điều 370'), 1, 'B: Điều 370');
  assert.strictEqual(got.get('Điều 372'), 1, 'B: Điều 372');
  console.log('B PASS: legal numeric prefix collision');
}


// Test C: clean-009 PERSON_NAME prefix collision (Nguyễn Thị Thanh vs Nguyễn Thị Thanh B)
{
  const ref = 'Nguyễn Thị Thanh ... Nguyễn Thị Thanh B';
  const entities = [
    e('PERSON_NAME', 'Nguyễn Thị Thanh', 1),
    e('PERSON_NAME', 'Nguyễn Thị Thanh B', 1),
  ];
  const got = rk('clean-009', 'PERSON_NAME', entities, ref);
  assert.strictEqual(got.get('Nguyễn Thị Thanh'), 1, 'C: Nguyễn Thị Thanh');
  assert.strictEqual(got.get('Nguyễn Thị Thanh B'), 1, 'C: Nguyễn Thị Thanh B');
  console.log('C PASS: clean-009 PERSON_NAME prefix collision');
}

// Test D: clean-004 source-adjacent exception
{
  const ref = '...Nguyễn Thị Thủy H1phải...Nguyễn Thị Thủy H1được...Nguyễn Thị T5và...';
  const entitiesH1 = [e('PERSON_NAME', 'Nguyễn Thị Thủy H1', 2)];
  const entitiesT5 = [e('PERSON_NAME', 'Nguyễn Thị T5', 1)];
  const gotH1 = rk('clean-004', 'PERSON_NAME', entitiesH1, ref);
  const gotT5 = rk('clean-004', 'PERSON_NAME', entitiesT5, ref);
  assert.strictEqual(gotH1.get('Nguyễn Thị Thủy H1'), 2, 'D: Nguyễn Thị Thủy H1 count=2');
  assert.strictEqual(gotT5.get('Nguyễn Thị T5'), 1, 'D: Nguyễn Thị T5 count=1');
  console.log('D PASS: clean-004 source-adjacent exception');
}
// Test D-neg1: exception does NOT apply to another page
{
  const ref = '...Nguyễn Thị Thủy H1phải...';
  const entities = [e('PERSON_NAME', 'Nguyễn Thị Thủy H1', 2)];
  const got = rk('clean-005', 'PERSON_NAME', entities, ref);
  assert.strictEqual(got.get('Nguyễn Thị Thủy H1'), 0, 'D-neg1: exception not inherited by other pages');
  console.log('D-neg1 PASS: exception not inherited by other pages');
}

// Test D-neg2: exception does NOT apply to another kind
{
  const ref = '...Nguyễn Thị Thủy H1phải...';
  const entities = [e('ORGANIZATION_NAME', 'Nguyễn Thị Thủy H1', 2)];
  const got = rk('clean-004', 'ORGANIZATION_NAME', entities, ref);
  assert.strictEqual(got.get('Nguyễn Thị Thủy H1'), 0, 'D-neg2: exception not inherited by other kinds');
  console.log('D-neg2 PASS: exception not inherited by other kinds');
}

// Test D-neg3: exception allows adjacent LETTER but NOT adjacent DIGIT
{
  const entities = [e('PERSON_NAME', 'Nguyễn Thị Thủy H1', 1)];
  const gotLetter = rk('clean-004', 'PERSON_NAME', entities, '...Nguyễn Thị Thủy H1x...');
  assert.strictEqual(gotLetter.get('Nguyễn Thị Thủy H1'), 1, 'D-neg3: adjacent LETTER is allowed');
  const gotDigit = rk('clean-004', 'PERSON_NAME', entities, '...Nguyễn Thị Thủy H12...');
  assert.strictEqual(gotDigit.get('Nguyễn Thị Thủy H1'), 0, 'D-neg3: adjacent DIGIT is forbidden');
  console.log('D-neg3 PASS: exception allows adjacent LETTER but NOT adjacent DIGIT');
}

// Test D-neg4: the clean-004 suffix exception never relaxes prefix boundaries.
{
  const got = rk('clean-004', 'PERSON_NAME', [e('PERSON_NAME', 'Nguyễn Thị Thủy H1', 1)], 'xNguyễn Thị Thủy H1phải');
  assert.strictEqual(got.get('Nguyễn Thị Thủy H1'), 0, 'D-neg4: prefix Unicode letter remains forbidden');
  console.log('D-neg4 PASS: clean-004 exception preserves prefix boundary');
}

// Test D-neg5: empty normalized entity surfaces fail before any indexOf("") scan.
{
  assert.throws(
    () => reconcileKind('clean-004', 'PERSON_NAME', [e('PERSON_NAME', ' \t\n ', 1)], 'Nguyễn Thị Thủy H1'),
    /normalizes to empty text/,
    'D-neg5: empty normalized entity surface is rejected',
  );
  console.log('D-neg5 PASS: empty normalized entity surface rejected');
}

function verifiedManifest(pageId: string): BenchmarkManifest {
  return {
    schemaVersion: '1.0', name: 'reconciliation fixture', description: 'fixture', created: '2026-01-01T00:00:00.000Z',
    pages: [{ benchmarkPageId: pageId, fileName: `${pageId}.png`, imageFormat: 'png', category: 'CLEAN_JUDGMENT', difficulty: 'easy', referenceStatus: 'REFERENCE_VERIFIED', referenceFileName: `${pageId}.ref.txt` }],
  };
}

// Test D-neg6: expected reconciliation inputs fail closed rather than being skipped.
{
  const root = mkdtempSync(join(tmpdir(), 'lexocr-reconcile-'));
  try {
    mkdirSync(join(root, 'annotations'), { recursive: true });
    writeFileSync(join(root, 'annotations', 'missing-ref.entities.json'), '[]', 'utf8');
    const missingReference = reconcileCorpus(verifiedManifest('missing-ref'), root);
    assert.strictEqual(missingReference.totalMismatches, 1, 'D-neg6: missing reference is a mismatch');
    assert.strictEqual(missingReference.pages[0].inputFailures[0].input, 'reference', 'D-neg6: missing reference identified');

    mkdirSync(join(root, 'references'), { recursive: true });
    writeFileSync(join(root, 'references', 'invalid-entities.ref.txt'), 'reference', 'utf8');
    writeFileSync(join(root, 'annotations', 'invalid-entities.entities.json'), '{not json', 'utf8');
    const invalidEntities = reconcileCorpus(verifiedManifest('invalid-entities'), root);
    assert.strictEqual(invalidEntities.totalMismatches, 1, 'D-neg6: invalid entity annotation is a mismatch');
    assert.strictEqual(invalidEntities.pages[0].inputFailures[0].input, 'entity annotation', 'D-neg6: invalid entity annotation identified');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log('D-neg6 PASS: missing/invalid reconciliation inputs fail closed');
}

// Test E: ordinary PERSON_NAME prefix protection WITHOUT exception
{
  const ref = 'Nguyễn Văn H ... Nguyễn Văn H2';
  const entities = [
    e('PERSON_NAME', 'Nguyễn Văn H', 1),
    e('PERSON_NAME', 'Nguyễn Văn H2', 1),
  ];
  const got = rk('clean-001', 'PERSON_NAME', entities, ref);
  assert.strictEqual(got.get('Nguyễn Văn H'), 1, 'E: Nguyễn Văn H count=1');
  assert.strictEqual(got.get('Nguyễn Văn H2'), 1, 'E: Nguyễn Văn H2 count=1');
  console.log('E PASS: ordinary PERSON_NAME prefix protection');
}

// Test G: different kinds allocate independently and may overlap.
{
  const ref468 = 'khoản 2 Điều 468';
  assert.strictEqual(rk('clean-006', 'LEGAL_ARTICLE', [e('LEGAL_ARTICLE', 'Điều 468', 1)], ref468).get('Điều 468'), 1, 'G: Điều 468');
  assert.strictEqual(rk('clean-006', 'LEGAL_CLAUSE_POINT', [e('LEGAL_CLAUSE_POINT', 'khoản 2 Điều 468', 1)], ref468).get('khoản 2 Điều 468'), 1, 'G: khoản 2 Điều 468');
  const ref308 = 'khoản 1 Điều 308';
  assert.strictEqual(rk('clean-006', 'LEGAL_ARTICLE', [e('LEGAL_ARTICLE', 'Điều 308', 1)], ref308).get('Điều 308'), 1, 'G: Điều 308');
  assert.strictEqual(rk('clean-006', 'LEGAL_CLAUSE_POINT', [e('LEGAL_CLAUSE_POINT', 'khoản 1 Điều 308', 1)], ref308).get('khoản 1 Điều 308'), 1, 'G: khoản 1 Điều 308');
  console.log('G PASS: cross-kind overlap is independent');
}
// Test F: full real B1 corpus end-to-end (locked reconciliation contract).
{
  const manifest = readJsonFile<BenchmarkManifest>('tmp/ocr-benchmark/manifest.json');
  const result = reconcileCorpus(manifest, 'tmp/ocr-benchmark');
  const r = result;
  assert.strictEqual(r.totalEntries, 245, 'F: totalEntries=245');
  assert.strictEqual(r.totalDeclared, 394, 'F: totalDeclared=394');
  assert.strictEqual(r.totalReconciled, 394, 'F: totalReconciled=394');
  assert.strictEqual(r.totalMismatches, 0, 'F: totalMismatches=0');
  const byPage = new Map(r.pages.map(p => [p.benchmarkPageId, p]));
  const expected: Record<string, [number, number, number, number]> = {
    'clean-001': [29, 32, 32, 0],
    'clean-002': [27, 45, 45, 0],
    'clean-003': [6, 10, 10, 0],
    'clean-004': [24, 43, 43, 0],
    'clean-005': [23, 25, 25, 0],
    'clean-006': [24, 46, 46, 0],
    'clean-007': [47, 90, 90, 0],
    'clean-008': [26, 30, 30, 0],
    'clean-009': [18, 41, 41, 0],
    'clean-010': [21, 32, 32, 0],
  };
  for (const [pid, exp] of Object.entries(expected)) {
    const p = byPage.get(pid);
    if (!p) throw new Error('Missing page: ' + pid);
    assert.strictEqual(p.entries, exp[0], 'F: ' + pid + ' entries=' + exp[0]);
    assert.strictEqual(p.declared, exp[1], 'F: ' + pid + ' declared=' + exp[1]);
    assert.strictEqual(p.reconciled, exp[2], 'F: ' + pid + ' reconciled=' + exp[2]);
    assert.strictEqual(p.mismatches, exp[3], 'F: ' + pid + ' mismatches=' + exp[3]);
  }
  console.log('F PASS: full B1 corpus end-to-end');
  console.log('');
  console.log(formatReconcileReport(result));
}

console.log('ALL TESTS PASSED');