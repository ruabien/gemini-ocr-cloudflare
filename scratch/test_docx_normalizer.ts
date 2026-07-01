import { normalizeTextForDocx, flattenTextForManualLineBreak } from "../src/utils/docxTextNormalizer";

const testCases = [
  {
    name: "Test 1: Normal line merging (sentence split)",
    input: `Tiến hành hòa giải để các đương sự thỏa thuận với nhau về việc giải quyết vụ án
dân sự thụ lý 64/2024/TLST-DS ngày 21 tháng 5 năm 2024 về việc
“Tranh chấp quyền sử dụng đất”.`,
    expected: `Tiến hành hòa giải để các đương sự thỏa thuận với nhau về việc giải quyết vụ án dân sự thụ lý 64/2024/TLST-DS ngày 21 tháng 5 năm 2024 về việc “Tranh chấp quyền sử dụng đất”.`
  },
  {
    name: "Test 2: Preserve legal structure (Tòa án tỉnh Phú Yên)",
    input: `TÒA ÁN NHÂN DÂN
TỈNH PHÚ YÊN`,
    expected: `TÒA ÁN NHÂN DÂN
TỈNH PHÚ YÊN`
  },
  {
    name: "Test 3: List lines (numbered)",
    input: `1. Bà Nguyễn Thị A, sinh năm 1970;
2. Ông Trần Văn B, sinh năm 1968;`,
    expected: `1. Bà Nguyễn Thị A, sinh năm 1970;
2. Ông Trần Văn B, sinh năm 1968;`
  },
  {
    name: "Test 4: Address merging",
    input: `Địa chỉ: 746 đường 30/4, phường Hưng Lợi,
quận Ninh Kiều, thành phố Cần Thơ.`,
    expected: `Địa chỉ: 746 đường 30/4, phường Hưng Lợi, quận Ninh Kiều, thành phố Cần Thơ.`
  }
];

let failed = false;

for (const tc of testCases) {
  const result = normalizeTextForDocx(tc.input, { mergeBrokenLines: true });
  if (result.trim() === tc.expected.trim()) {
    console.log(`✅ ${tc.name} PASSED`);
  } else {
    console.error(`❌ ${tc.name} FAILED`);
    console.error(`--- EXPECTED ---`);
    console.error(tc.expected);
    console.error(`--- ACTUAL ---`);
    console.error(result);
    failed = true;
  }
}

const flattenResult = flattenTextForManualLineBreak(`Tiến hành hòa giải để
các đương sự thỏa thuận với
nhau về việc   giải quyết  `);

const expectedFlatten = "Tiến hành hòa giải để các đương sự thỏa thuận với nhau về việc giải quyết";
if (flattenResult === expectedFlatten) {
  console.log("✅ Test 5: flattenTextForManualLineBreak PASSED");
} else {
  console.error("❌ Test 5: flattenTextForManualLineBreak FAILED");
  console.error(`Expected: "${expectedFlatten}"`);
  console.error(`Actual:   "${flattenResult}"`);
  failed = true;
}

// Test page break marker removal logic
const testPageBreakText = `Đoạn 1

--- [TRANG KẾ TIẾP] ---

Đoạn 2`;

const expectedPageBreakOutput = `Đoạn 1

Đoạn 2`;

import { removePageBreakMarkers as removePageBreakMarkersTS } from "../src/utils/docxTextNormalizer";

const pbResult = removePageBreakMarkersTS(testPageBreakText);
if (pbResult.trim() === expectedPageBreakOutput.trim()) {
  console.log("✅ Test 6: removePageBreakMarkers PASSED");
} else {
  console.error("❌ Test 6: removePageBreakMarkers FAILED");
  console.error(`Expected: "${expectedPageBreakOutput}"`);
  console.error(`Actual:   "${pbResult}"`);
  failed = true;
}

// Test "Một dòng" mode with page break markers
const testOneLineText = `Đoạn 1

--- [TRANG KẾ TIẾP] ---

Đoạn 2`;

const expectedOneLineOutput = "Đoạn 1 Đoạn 2";
const oneLineResult = flattenTextForManualLineBreak(testOneLineText);
if (oneLineResult === expectedOneLineOutput) {
  console.log("✅ Test 7: One Line Mode with Page Break Markers PASSED");
} else {
  console.error("❌ Test 7: One Line Mode with Page Break Markers FAILED");
  console.error(`Expected: "${expectedOneLineOutput}"`);
  console.error(`Actual:   "${oneLineResult}"`);
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log("All tests passed successfully!");
  process.exit(0);
}
