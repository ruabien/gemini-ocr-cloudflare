import { anonymizeLegalText } from "../src/utils/anonymizer";

const input = `Bà Hà Thị Kim Cúc, sinh năm 1964. Bà Cúc có mặt. Cuối văn bản ký: Hà Thị Kim Cúc.`;
const result = anonymizeLegalText(input);
console.log("Output:", result.text);