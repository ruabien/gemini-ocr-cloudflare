// @ts-nocheck
import { strict as assert } from 'assert';
import { cleanOcrPageText, normalizePageText, removePageNumberLines } from './ocrPostProcessing.ts';

function runTests() {
  console.log('=== OCR POST-PROCESSING TESTS ===\n');

  console.log('Test 1: Xóa dòng chỉ chứa whitespace, giữ leading whitespace, bỏ trailing whitespace');
  assert.strictEqual(normalizePageText('  Dòng một  \n\n   \nDòng hai   \n'), '  Dòng một\nDòng hai');
  console.log('[PASS] Whitespace-only lines removed, leading whitespace preserved, trailing whitespace removed.');

  console.log('Test 2: Chuẩn hóa CRLF');
  assert.strictEqual(normalizePageText('Dòng một\r\nDòng hai\rDòng ba'), 'Dòng một\nDòng hai\nDòng ba');
  console.log('[PASS] CRLF and CR normalized to LF.');

  console.log('Test 3: Xóa "1" ở đầu page');
  assert.strictEqual(removePageNumberLines('1\nNội dung trang'), 'Nội dung trang');
  console.log('[PASS] Leading standalone page number removed.');

  console.log('Test 4: Xóa "12" ở cuối page');
  assert.strictEqual(removePageNumberLines('Nội dung trang\n12'), 'Nội dung trang');
  console.log('[PASS] Trailing standalone page number removed.');

  console.log('Test 5: Xóa "Trang 3"');
  assert.strictEqual(removePageNumberLines('  Trang 3 \nNội dung'), 'Nội dung');
  console.log('[PASS] Trang + number boundary removed.');

  console.log('Test 6: Xóa "- 4 -"');
  assert.strictEqual(removePageNumberLines('Nội dung\n- 4 -'), 'Nội dung');
  console.log('[PASS] Hyphen-wrapped page number removed.');

  console.log('Test 7: Xóa "– 5 –"');
  assert.strictEqual(removePageNumberLines('– 5 –\nNội dung'), 'Nội dung');
  console.log('[PASS] En dash-wrapped page number removed.');

  console.log('Test 8: Giữ "Điều 1"');
  assert.strictEqual(removePageNumberLines('Điều 1\nNội dung'), 'Điều 1\nNội dung');
  console.log('[PASS] Legal clause line preserved.');

  console.log('Test 9: Giữ "1. Phạm vi áp dụng"');
  assert.strictEqual(removePageNumberLines('1. Phạm vi áp dụng\nChi tiết'), '1. Phạm vi áp dụng\nChi tiết');
  console.log('[PASS] Numbered heading preserved.');

  console.log('Test 10: Giữ số nằm giữa nội dung');
  assert.strictEqual(removePageNumberLines('Nội dung đầu\n12\nNội dung cuối'), 'Nội dung đầu\n12\nNội dung cuối');
  console.log('[PASS] Middle standalone number preserved.');

  console.log('Test 11: Giữ năm standalone "2026"');
  assert.strictEqual(removePageNumberLines('2026\nNội dung năm'), '2026\nNội dung năm');
  assert.strictEqual(removePageNumberLines('Nội dung năm\n2026'), 'Nội dung năm\n2026');
  console.log('[PASS] Standalone year preserved conservatively.');

  console.log('Test 12: Xử lý page chỉ chứa số trang');
  assert.strictEqual(removePageNumberLines('  7  '), '');
  console.log('[PASS] Single-line page number returns empty string.');

  console.log('Test 13: Chuẩn hóa NBSP, Zero Width Space, BOM');
  assert.strictEqual(normalizePageText('\u00A0\u00A0Dòng một\u00A0\u00A0\n\u200B\u200B\n\uFEFFDòng hai\u00A0'), '  Dòng một\n Dòng hai');
  console.log('[PASS] NBSP, zero-width space, and BOM normalized as expected.');

  console.log('Test 14: Giữ nguyên "Trang IV"');
  assert.strictEqual(removePageNumberLines('Trang IV\nNội dung'), 'Trang IV\nNội dung');
  console.log('[PASS] "Trang IV" preserved.');

  console.log('Test 15: Giữ nguyên "IV"');
  assert.strictEqual(removePageNumberLines('IV\nNội dung'), 'IV\nNội dung');
  console.log('[PASS] "IV" preserved.');

  console.log('Test 16: Giữ nguyên "IX"');
  assert.strictEqual(removePageNumberLines('Nội dung\nIX'), 'Nội dung\nIX');
  console.log('[PASS] "IX" preserved.');

  console.log('Test 17: Giữ nguyên "V"');
  assert.strictEqual(removePageNumberLines('V\nNội dung'), 'V\nNội dung');
  console.log('[PASS] "V" preserved.');

  console.log('Test 18: Xử lý cả số trang đầu và cuối');
  assert.strictEqual(cleanOcrPageText('1\n\nNội dung chính\n\n12'), 'Nội dung chính');
  console.log('[PASS] Both leading and trailing page numbers removed.');

  console.log('Test 19: Input rỗng');
  assert.strictEqual(cleanOcrPageText(''), '');
  console.log('[PASS] Empty input handled.');

  console.log('Test 20: Input chỉ có whitespace');
  assert.strictEqual(cleanOcrPageText(' \n\t\r\n  '), '');
  console.log('[PASS] Whitespace-only input handled.');

  console.log('Test 21: Không mutate input');
  const originalInput = '  1\r\nNội dung\r\n  ';
  const snapshot = originalInput.slice();
  cleanOcrPageText(originalInput);
  assert.strictEqual(originalInput, snapshot);
  console.log('[PASS] Input string remains unchanged.');

  console.log('Test 22: Giữ số hợp lệ trong nội dung');
  assert.strictEqual(
    cleanOcrPageText('Trang 2\nĐiều 1\n12 Nguyễn Trãi\nSố: 12/QĐ-TAND\n- 9 -'),
    'Điều 1\n12 Nguyễn Trãi\nSố: 12/QĐ-TAND'
  );
  console.log('[PASS] Valid in-content numbers preserved while boundary page numbers are removed.');

  console.log('Test 23: Clean/filter/join không tạo separator cho page rỗng');
  const joinedText = ['Nội dung trang 1', '', 'Nội dung trang 3']
    .map((text) => cleanOcrPageText(text))
    .filter((text) => text.length > 0)
    .join('\n\n');
  assert.strictEqual(joinedText, 'Nội dung trang 1\n\nNội dung trang 3');
  assert.ok(!joinedText.includes('\n\n\n\n'));
  console.log('[PASS] Empty cleaned pages are skipped and no extra page separator is created.');

  console.log('\nAll OCR post-processing tests passed successfully!');
}

runTests();