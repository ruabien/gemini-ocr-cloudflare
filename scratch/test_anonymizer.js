/* eslint-disable */
import { anonymizeLegalText, anonymizeLegalTextDetailed } from '../src/utils/anonymizer.js';

const input = `Thẩm phán Nguyễn Văn Bình, Kiểm sát viên Trần Thị Mai tham gia phiên tòa. Bị cáo Nguyễn Văn Hùng và bị hại Lê Văn Cường có mặt.`;
const expected = `Thẩm phán Nguyễn Văn Bình, Kiểm sát viên Trần Thị Mai tham gia phiên tòa. Bị cáo Nguyễn Văn A và bị hại Nguyễn Văn B có mặt.`;

const input2 = `Thẩm phán Nguyễn Văn Bình tham gia tố tụng. Bị cáo Nguyễn Văn Hùng có CCCD 001203004567, trú tại xã Minh Khai, thành phố Hà Nội. Kiểm sát viên Trần Thị Mai có số điện thoại 0912345678.`;
const expected2 = `Thẩm phán Nguyễn Văn Bình tham gia tố tụng. Bị cáo Nguyễn Văn A có CCCD 001203004XXX, trú tại xã X, thành phố Z. Kiểm sát viên Trần Thị Mai có số điện thoại 0912345XXX.`;

console.log("=== THỬ NGHIỆM ẨN DANH VĂN BẢN PHÁP LÝ ===");
console.log("\n[TEST 1] [INPUT]:");
console.log(input);

const detailed = anonymizeLegalTextDetailed(input);
const output = detailed.text;
console.log("[TEST 1] [OUTPUT ACTUAL]:", output);

const isMatch1 = output.trim() === expected.trim();
console.log("[TEST 1] [KẾT QUẢ]:", isMatch1 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

console.log("\n[TEST 2] [INPUT]:");
console.log(input2);

const detailed2 = anonymizeLegalTextDetailed(input2);
const output2 = detailed2.text;
console.log("[TEST 2] [OUTPUT ACTUAL]:", output2);

const isMatch2 = output2.trim() === expected2.trim();
console.log("[TEST 2] [KẾT QUẢ]:", isMatch2 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

if (!isMatch1 || !isMatch2) {
  process.exit(1);
} else {
  process.exit(0);
}
