import { anonymizeLegalText } from "../src/utils/anonymizer";

const tests = [
  {
    input: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    expected: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
  },
  {
    input: "Địa chỉ: 746 đường 30/4, phường Hưng Lợi, quận Ninh Kiều, thành phố Cần Thơ.",
    expected: "Địa chỉ: 746 đường 30/4, phường Hưng Lợi, quận Ninh Kiều, thành phố CT."
  },
  {
    input: "Địa chỉ: xã X, huyện Y, tỉnh Z.",
    expected: "Địa chỉ: xã X, huyện Y, tỉnh Z."
  },
  {
    input: "Viện kiểm sát nhân dân quận Ninh Kiều, thành phố Cần Thơ.",
    expected: "Viện kiểm sát nhân dân quận Ninh Kiều, thành phố CT."
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
  }
];

let failed = false;

tests.forEach((t, i) => {
  const result = anonymizeLegalText(t.input);
  console.log(`Test ${i + 1}:`);
  console.log("Input:   ", t.input);
  console.log("Output:  ", result.text);
  console.log("Expected:", t.expected);
  console.log("Stats:   ", result.stats);
  const match = result.text === t.expected;
  console.log("Match:   ", match ? "PASSED" : "FAILED");
  console.log("---");
  if (!match) failed = true;
});

if (failed) {
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}