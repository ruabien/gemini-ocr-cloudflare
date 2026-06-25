import { anonymizeLegalText } from "../src/utils/anonymizer";

const tests = [
  // 1. Mandatory Test 1: Header absolutely protected
  {
    input: `UỶ BAN NHÂN DÂN\nXÃ HÒA PHONG\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc`,
    expected: `UỶ BAN NHÂN DÂN\nXÃ HÒA PHONG\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc`
  },
  // 2. Mandatory Test 2: Address in content anonymized
  {
    input: "Địa chỉ: Thôn Mỹ Thạnh Trung 1, xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên.",
    expected: "Địa chỉ: Thôn Mỹ Thạnh Trung 1, xã HP, huyện Tây Hòa, tỉnh PY."
  },
  // 3. Mandatory Test 3a: Authority alone in header (evaluated as header) -> Preserved
  {
    input: "UBND xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên.",
    expected: "UBND xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên."
  },
  // 4. Mandatory Test 3b: Authority in content -> Anonymized
  {
    input: "Theo đơn khởi kiện của UBND xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên.",
    expected: "Theo đơn khởi kiện của UBND xã HP, huyện Tây Hòa, tỉnh PY."
  },
  // 5. Old Test 2 Updated (ward should be abbreviated)
  {
    input: "Địa chỉ: 746 đường 30/4, phường Hưng Lợi, quận Ninh Kiều, thành phố Cần Thơ.",
    expected: "Địa chỉ: 746 đường 30/4, phường HL, quận Ninh Kiều, thành phố CT."
  },
  {
    input: "Địa chỉ: xã X, huyện Y, tỉnh Z.",
    expected: "Địa chỉ: xã X, huyện Y, tỉnh Z."
  },
  {
    input: "Viện kiểm sát nhân dân quận Ninh Kiều, thành phố Cần Thơ.",
    // Viện kiểm sát nhân dân starts with authority name and no content markers -> treated as header
    expected: "Viện kiểm sát nhân dân quận Ninh Kiều, thành phố Cần Thơ."
  },
  {
    input: "Ông Nguyễn Văn Bình, CCCD số 034176012469",
    expected: "Ông Nguyễn Văn B, CCCD số 034176012***"
  },
  {
    input: "Nguyễn Văn Bình, số điện thoại: 0912345678",
    // Theo yêu cầu mới, không có danh xưng nên không detect Nguyễn Văn Bình
    expected: "Nguyễn Văn Bình, số điện thoại: 0912345***"
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
