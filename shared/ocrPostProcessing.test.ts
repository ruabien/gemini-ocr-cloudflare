import assert from 'node:assert/strict';
import { getRenderableDocxLines } from '../functions/api/ocr/export/docx';
import { cleanOcrPageText } from './ocrPostProcessing';

(() => {
  const page = 'Đại diện theo ủy quyền\n1\nĐịa chỉ: Số 164';

  console.log('Test: pageIndex=2 removes standalone numeric line matching pageIndex-1 in the middle of page text');
  assert.equal(
    cleanOcrPageText(page, { pageIndex: 2 }),
    'Đại diện theo ủy quyền\nĐịa chỉ: Số 164'
  );
})();

(() => {
  const page = 'Đại diện theo ủy quyền\n2\nĐịa chỉ';

  console.log('Test: pageIndex=2 does not remove standalone numeric line matching pageIndex itself');
  assert.equal(
    cleanOcrPageText(page, { pageIndex: 2 }),
    'Đại diện theo ủy quyền\n2\nĐịa chỉ'
  );
})();

(() => {
  const page = 'Số bút lục\n309\nKết thúc';

  console.log('Test: pageIndex does not remove unrelated standalone number 309');
  assert.equal(
    cleanOcrPageText(page, { pageIndex: 2 }),
    'Số bút lục\n309\nKết thúc'
  );
})();

(() => {
  const page = 'Giá trị\n500\nđồng';

  console.log('Test: pageIndex does not remove valid standalone value 500');
  assert.equal(
    cleanOcrPageText(page, { pageIndex: 2 }),
    'Giá trị\n500\nđồng'
  );
})();

(() => {
  const page = 'Nội dung\nTrang 12\nĐoạn tiếp\n- 3 -\n— 5 —\nKết thúc';

  console.log('Test: removes explicit page-number patterns anywhere even without pageIndex');
  assert.equal(
    cleanOcrPageText(page),
    'Nội dung\nĐoạn tiếp\nKết thúc'
  );
})();

(() => {
  const page = 'Điều 1\nKhoản 2\n1. Phạm vi áp dụng\n[1]\n2026\n700.000.000\n12 Nguyễn Trãi\nSố: 12/QĐ-TAND';

  console.log('Test: preserves legal numbering, years, addresses, and formatted identifiers');
  assert.equal(
    cleanOcrPageText(page),
    'Điều 1\nKhoản 2\n1. Phạm vi áp dụng\n[1]\n2026\n700.000.000\n12 Nguyễn Trãi\nSố: 12/QĐ-TAND'
  );
})();

(() => {
  const page = 'Đại diện theo ủy quyền\n1\nĐịa chỉ: Số 164';
  const originalPage = page.slice();

  console.log('Test: cleanOcrPageText does not mutate input');
  cleanOcrPageText(page, { pageIndex: 2 });
  assert.equal(page, originalPage);
})();

(() => {
  const page = '309\nNội dung giữa\n500';

  console.log('Test: without context, standalone numbers in the middle are preserved while conservative boundary removal still applies');
  assert.equal(
    cleanOcrPageText(page),
    'Nội dung giữa'
  );
})();

(() => {
  const text = 'Dòng một\n\n\n   \nDòng hai';

  console.log('Test: DOCX helper removes empty and whitespace-only lines');
  assert.deepEqual(getRenderableDocxLines(text), ['Dòng một', 'Dòng hai']);
  assert.equal(getRenderableDocxLines(text).filter((line) => line.trim().length === 0).length, 0);
})();

(() => {
  const text = 'Dòng một\n\n\n   \nDòng hai';
  const originalText = text.slice();

  console.log('Test: DOCX helper does not mutate input');
  getRenderableDocxLines(text);
  assert.equal(text, originalText);
})();