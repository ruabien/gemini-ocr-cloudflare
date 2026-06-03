/* eslint-disable */
import { anonymizeLegalText, anonymizeLegalTextDetailed } from '../src/utils/anonymizer.js';

const input = `Ông Nguyễn Văn Hùng, sinh năm 1980, CCCD 001203004567, trú tại xã Minh Khai, huyện Thanh Trì, thành phố Hà Nội.
Bà Trần Thị Mai, số điện thoại 0912345678.`;

const expected = `Ông Nguyễn Văn A, sinh năm 1980, CCCD 001203004XXX, trú tại xã X, huyện Y, thành phố Z.
Bà Nguyễn Văn B, số điện thoại 0912345XXX.`;

console.log("=== THỬ NGHIỆM ẨN DANH VĂN BẢN PHÁP LÝ ===");
console.log("\n[INPUT REAL]:");
console.log(input);

const detailed = anonymizeLegalTextDetailed(input);
const output = detailed.text;

console.log("\n[OUTPUT ACTUAL]:");
console.log(output);

console.log("\n[OUTPUT EXPECTED]:");
console.log(expected);

const isMatch = output.trim() === expected.trim();
console.log("\n[KẾT QUẢ TEST]:", isMatch ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

console.log("\n[THÔNG SỐ CHI TIẾT]:");
console.log(JSON.stringify(detailed.stats, null, 2));

console.log("\n[MAPPING CHI TIẾT]:");
console.log(JSON.stringify(detailed.mapping, null, 2));

if (!isMatch) {
  process.exit(1);
} else {
  process.exit(0);
}
