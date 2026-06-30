import { normalizeTextForDocx } from "../src/utils/docxTextNormalizer";

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

if (failed) {
  process.exit(1);
} else {
  console.log("All tests passed successfully!");
  process.exit(0);
}