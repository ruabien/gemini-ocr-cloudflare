import { anonymizeLegalText } from "../src/anonymizer/index";

const tests = [
  {
    input: "Địa chỉ: Thôn Mỹ Thạnh Trung 1, xã Hòa Phong, huyện Tây Hòa, tỉnh Phú Yên.",
    expected: "Địa chỉ: Thôn Mỹ Thạnh Trung 1, xã HP, huyện Tây Hòa, tỉnh PY."
  },
  {
    input: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    expected: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
  },
  {
    input: "thị trấn Châu Ổ",
    expected: "thị trấn CỔ"
  },
  {
    input: "phường Hưng Lợi",
    expected: "phường HL"
  },
  {
    input: "xã Quảng Phú",
    expected: "xã QP"
  },
  {
    input: "xã X",
    expected: "xã X"
  },
  {
    input: "phường Y",
    expected: "phường Y"
  },
  {
    input: "thị trấn Z",
    expected: "thị trấn Z"
  },
  {
    input: "quận Ninh Kiều",
    expected: "quận Ninh Kiều"
  },
  {
    input: "huyện Tây Hòa",
    expected: "huyện Tây Hòa"
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
  console.log("SOME TESTS FAILED.");
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}