import { mergeLines } from "../src/docFormatter/lineMerge";
import { mergeNamesAndLocations } from "../src/docFormatter/personName";
import { mergeNumbersAndUnits } from "../src/docFormatter/numberUnit";
import { cleanParagraphs } from "../src/docFormatter/paragraph";
import { normalizeSpacingAndPunctuation } from "../src/docFormatter/spacing";

const input = `Tiền lãi (tính hết ngày 19/01/2026):

753.337.000 đồng.`;

let t = input;
console.log("Original:\n", JSON.stringify(t));

t = mergeLines(t);
console.log("\nAfter mergeLines:\n", JSON.stringify(t));

t = mergeNamesAndLocations(t);
console.log("\nAfter mergeNamesAndLocations:\n", JSON.stringify(t));

t = mergeNumbersAndUnits(t);
console.log("\nAfter mergeNumbersAndUnits:\n", JSON.stringify(t));

t = cleanParagraphs(t);
console.log("\nAfter cleanParagraphs:\n", JSON.stringify(t));

t = normalizeSpacingAndPunctuation(t);
console.log("\nAfter normalizeSpacingAndPunctuation:\n", JSON.stringify(t));