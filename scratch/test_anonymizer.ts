import { anonymizeLegalText } from "../src/utils/anonymizer";

const tests = [
  // 1. Mandatory Test 1: Header absolutely protected
  {
    input: `UỶ BAN NHÂN DÂN\nXÃ HÒA PHONG\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc`,
    expected: `UỶ BAN NHÂN DÂN\nXÃ HÒA PHONG\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc`
  },
  // 2. Mandatory Test 2: Address in content (should NOT be anonymized)
  {
    input: "Địa chỉ: Thôn Mỹ Thạnh Trung 1, xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên.",
    expected: "Địa chỉ: Thôn Mỹ Thạnh Trung 1, xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên."
  },
  // 3. Mandatory Test 3a: Authority alone in header (evaluated as header) -> Preserved
  {
    input: "UBND xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên.",
    expected: "UBND xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên."
  },
  // 4. Mandatory Test 3b: Authority in content -> Preserved (No address/province/commune changes)
  {
    input: "Theo đơn khởi kiện của UBND xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên.",
    expected: "Theo đơn khởi kiện của UBND xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên."
  },
  // 5. Old Test 2 Updated (ward/province/commune/address should NOT be anonymized)
  {
    input: "Địa chỉ: 746 đường 30/4, phường Hưng Lợi, quận Ninh Kiều, thành phố Cần Thơ.",
    expected: "Địa chỉ: 746 đường 30/4, phường Hưng Lợi, quận Ninh Kiều, thành phố Cần Thơ."
  },
  {
    input: "Địa chỉ: xã X, huyện Y, tỉnh Z.",
    expected: "Địa chỉ: xã X, huyện Y, tỉnh Z."
  },
  {
    input: "Viện kiểm sát nhân dân quận Ninh Kiều, thành phố Cần Thơ.",
    expected: "Viện kiểm sát nhân dân quận Ninh Kiều, thành phố Cần Thơ."
  },
  {
    input: "Ông Nguyễn Văn Bình, CCCD số 034176012469",
    expected: "Ông Nguyễn Văn B, CCCD số 034176012***"
  },
  {
    input: "Nguyễn Văn Bình, số điện thoại: 0912345678",
    expected: "Nguyễn Văn B, số điện thoại: 0912345***"
  },
  {
    input: "Ông Nguyễn Văn Bình, ông Bình và bà Nguyễn Thị Hoa đi cùng ông B",
    expected: "Ông Nguyễn Văn B, ông B và bà Nguyễn Thị H đi cùng ông B"
  },
  {
    input: "NHỮNG NỘI DUNG ĐÃ ĐƯỢC CÁC ĐƯƠNG SỰ THỐNG NHẤT, KHÔNG THỐNG NHẤT",
    expected: "NHỮNG NỘI DUNG ĐÃ ĐƯỢC CÁC ĐƯƠNG SỰ THỐNG NHẤT, KHÔNG THỐNG NHẤT"
  },
  {
    input: "NHỮNG SỬA ĐỔI, BỔ SUNG THEO YÊU CẦU CỦA NHỮNG NGƯỜI THAM GIA PHIÊN HÒA GIẢI",
    expected: "NHỮNG SỬA ĐỔI, BỔ SUNG THEO YÊU CẦU CỦA NHỮNG NGƯỜI THAM GIA PHIÊN HÒA GIẢI"
  },
  {
    input: "Các bên đương sự không thỏa thuận được với nhau về việc giải quyết vụ án.",
    expected: "Các bên đương sự không thỏa thuận được với nhau về việc giải quyết vụ án."
  },
  {
    input: "Nguyên đơn do bà Hà Thị Kim Cúc trình bày.",
    expected: "Nguyên đơn do bà Hà Thị Kim C trình bày."
  },
  {
    input: "Bà Hà Thị Kim Cúc, sinh năm 1964.",
    expected: "Bà Hà Thị Kim C, sinh năm 1964."
  },
  {
    input: `Bà Hà Thị Kim Cúc, sinh năm 1964. Bà Cúc có mặt. Cuối văn bản ký: Hà Thị Kim Cúc.`,
    expected: `Bà Hà Thị Kim C, sinh năm 1964. Bà C có mặt. Cuối văn bản ký: Hà Thị Kim C.`
  },
  {
    input: `Nguyên đơn trình bày: Năm 1990, vợ chồng tôi có mua đất của ông Đặng Văn Tòng và ông Nguyễn Văn Đ, địa chỉ: Thôn Mỹ Thạnh Trung 1, xã Hòa Phong,\nhuyện Tây Hòa, tỉnh Phú Yên.\n\nĐến năm 2006, hộ gia đình ông Tòng gồm 06 nhân khẩu là: Bùi Nguyễn Tòng –sinh năm\n1968, Hà Thị Kim Cúc– sinh năm 1964, Bùi Hà Quyên Quyên – sinh năm 1986, Bùi\nQuang Thơ – sinh năm 1989, Bùi Hà Bạch Quế – sinh năm 1991, Bùi Thị Hà Cẩm –\nsinh năm 1993 tại thửa số 549(1), tờ bản đồ số 9-D, diện tích 200m² tại thôn Mỹ\nThạnh Trung 1, xã Hòa Phong, Tây Hòa, Phú Yên.\n\nLúc mua thì gia đình bà Cúc có nhu cầu xây dựng lại hàng rào.\nBị đơn ông Đặng Trung Oanh trình bày.`,
    expected: `Nguyên đơn trình bày: Năm 1990, vợ chồng tôi có mua đất của ông Đặng Văn T và ông Nguyễn Văn Đ, địa chỉ: Thôn Mỹ Thạnh Trung 1, xã Hòa Phong,\nhuyện Tây Hòa, tỉnh Phú Yên.\n\nĐến năm 2006, hộ gia đình ông T gồm 06 nhân khẩu là: Bùi Nguyễn T –sinh năm\n1968, Hà Thị Kim C– sinh năm 1964, Bùi Hà Quyên Q – sinh năm 1986, Bùi\nQuang T – sinh năm 1989, Bùi Hà Bạch Q – sinh năm 1991, Bùi Thị Hà C –\nsinh năm 1993 tại thửa số 549(1), tờ bản đồ số 9-D, diện tích 200m² tại thôn Mỹ\nThạnh Trung 1, xã Hòa Phong, Tây Hòa, Phú Yên.\n\nLúc mua thì gia đình bà C có nhu cầu xây dựng lại hàng rào.\nBị đơn ông Đặng Trung O trình bày.`
  },
  {
    input: `UBND xã Hòa Phonghgtphđchôbbt`,
    expected: `UBND xã Hòa Phonghgtphđchôbbt`
  },
  {
    input: `UBND xã Hòa Phong, huyện Tây Hòa`,
    expected: `UBND xã Hòa Phong, huyện Tây Hòa`
  }
];

let failed = false;

tests.forEach((t, i) => {
  const result = anonymizeLegalText(t.input);
  console.log(`Test ${i + 1}:`);
  console.log("Input:   ", t.input.replace(/\n/g, '\\n'));
  console.log("Output:  ", result.text.replace(/\n/g, '\\n'));
  console.log("Expected:", t.expected.replace(/\n/g, '\\n'));
  console.log("Stats:   ", result.stats);
  const match = result.text === t.expected;
  console.log("Match:   ", match ? "PASSED" : "FAILED");
  console.log("---");
  if (!match) failed = true;
});

if (failed) {
  // @ts-ignore
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED SUCCESSFULLY!");
  // @ts-ignore
  process.exit(0);
}
