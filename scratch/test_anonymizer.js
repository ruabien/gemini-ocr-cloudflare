const { anonymizeLegalText } = require('./anonymizer_impl.js');

const tests = [
  {
    input: "Ông Nguyễn Văn Bình, sinh năm 1975, địa chỉ: 123 Nguyễn Huệ, phường Bến Nghé, Quận 1, thành phố Hồ Chí Minh, CCCD số 034176012469, số điện thoại 0912345678.",
    expected: "Ông Nguyễn Văn B, sinh năm 1975, địa chỉ: 123 Nguyễn Huệ, phường Bến Nghé, Quận 1, thành phố HCM, CCCD số 034176012***, số điện thoại 0912345***."
  },
  {
    input: "ông Bình cư trú tại tỉnh Đắk Lắk.",
    expected: "ông B cư trú tại tỉnh ĐL."
  },
  {
    input: "Bà Trần Thị Thanh Hương, trú tại tỉnh Nghệ An, CMND số 151657186.",
    expected: "Bà Trần Thị Thanh H, trú tại tỉnh NA, CMND số 151657***."
  },
  {
    input: "Tòa án nhân dân tỉnh Thái Bình, Viện kiểm sát nhân dân tỉnh Thái Bình.",
    expected: "Tòa án nhân dân tỉnh TB, Viện kiểm sát nhân dân tỉnh TB."
  },
  {
    input: "Bản án số 12/2024/DS-ST, Quyết định số 45/QĐ-KTBC, Điều 173 Bộ luật Hình sự.",
    expected: "Bản án số 12/2024/DS-ST, Quyết định số 45/QĐ-KTBC, Điều 173 Bộ luật Hình sự."
  }
];

tests.forEach((test, idx) => {
  const result = anonymizeLegalText(test.input);
  const passed = result.text === test.expected;
  console.log(`Test ${idx + 1}: ${passed ? 'PASSED' : 'FAILED'}`);
  if (!passed) {
    console.log(`  Input:    ${test.input}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Got:      ${result.text}`);
    console.log(`  Stats:    `, result.stats);
  } else {
    console.log(`  Stats:    `, result.stats);
  }
});