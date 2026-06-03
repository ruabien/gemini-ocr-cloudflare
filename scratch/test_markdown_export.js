/* eslint-disable */
import { prepareTextForDocxExport, parseLineToTextRuns } from '../src/utils/exportHelper.js';

// Helpers to extract formatting details from docx 9.x TextRun objects
function getRunText(run) {
  const textEl = run.root.find(el => el.rootKey === 'w:t');
  return textEl ? textEl.root[1] : '';
}

function isRunBold(run) {
  return run.properties && run.properties.root.some(el => el.rootKey === 'w:b');
}

function isRunItalic(run) {
  return run.properties && run.properties.root.some(el => el.rootKey === 'w:i');
}

// Test case inputs
const input = `<!-- font: Times New Roman -->
**NỘI DUNG VIỆC DÂN SỰ:** *Tại đơn yêu cầu ngày 28/8/2024...*`;

console.log("=== KIỂM THỬ XỬ LÝ TEXT VÀ PARSE MARKDOWN CHO WORD ===");

// 1. Test HTML comment stripping
console.log("\n[TEST 1] Kiểm tra prepareTextForDocxExport (loại bỏ HTML comments):");
const preparedText = prepareTextForDocxExport(input);
console.log("[INPUT]:");
console.log(input);
console.log("[OUTPUT THỰC TẾ]:");
console.log(preparedText);

const hasComment = preparedText.includes("<!--") || preparedText.includes("-->");
console.log("[KẾT QUẢ]:", !hasComment ? "✅ THÀNH CÔNG (Đã xóa comment)" : "❌ THẤT BẠI (Còn comment)");

// 2. Test inline Markdown parsing into TextRuns
console.log("\n[TEST 2] Kiểm tra parseLineToTextRuns (tách inline markdown):");
const lines = preparedText.split('\n').map(l => l.trim()).filter(Boolean);
const targetLine = lines[0]; // **NỘI DUNG VIỆC DÂN SỰ:** *Tại đơn yêu cầu ngày 28/8/2024...*
console.log("[LINE PHÂN TÍCH]:", targetLine);

const runs = parseLineToTextRuns(targetLine);
console.log("[DANH SÁCH TEXT RUNS ĐÃ TẠO]:");
runs.forEach((run, idx) => {
  const textVal = getRunText(run);
  const boldVal = isRunBold(run);
  const italicVal = isRunItalic(run);
  console.log(`Run ${idx + 1}: text="${textVal}", bold=${boldVal}, italics=${italicVal}`);
});

// Verification of formatting details
const check1 = getRunText(runs[0]) === "NỘI DUNG VIỆC DÂN SỰ:" && isRunBold(runs[0]) && !isRunItalic(runs[0]);
const check2 = getRunText(runs[1]) === " " && !isRunBold(runs[1]) && !isRunItalic(runs[1]);
const check3 = getRunText(runs[2]) === "Tại đơn yêu cầu ngày 28/8/2024..." && !isRunBold(runs[2]) && isRunItalic(runs[2]);

console.log(`\nChi tiết kiểm tra:`);
console.log(`- Run 1 (NỘI DUNG VIỆC DÂN SỰ, in đậm):`, check1 ? "✅ ĐẠT" : "❌ HỎNG");
console.log(`- Run 2 (Khoảng trắng, bình thường):`, check2 ? "✅ ĐẠT" : "❌ HỎNG");
console.log(`- Run 3 (Tại đơn yêu cầu ngày 28/8/2024..., in nghiêng):`, check3 ? "✅ ĐẠT" : "❌ HỎNG");

const allPassed = check1 && check2 && check3;
console.log("\n[KẾT QUẢ TOÀN BỘ]:", allPassed ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

if (!allPassed || hasComment) {
  process.exit(1);
} else {
  process.exit(0);
}
