/**
 * Number and Unit merging module.
 *
 * Implements Step 5:
 *   Nối số + đơn vị.
 *   Ví dụ:
 *     770.000.000 \n đồng -> 770.000.000 đồng
 *     200 \n m² -> 200 m²
 *     5.000 \n m2 -> 5.000 m² (Note: m2 normalized to m²)
 */
import { isHeading } from "./heading";

// Typical Vietnamese units (currencies, measurements, time, items, etc.)
const UNITS = [
  "đồng",
  "đ",
  "usd",
  "eur",
  "m²",
  "m2",
  "m³",
  "m3",
  "m",
  "km",
  "cm",
  "mm",
  "kg",
  "g",
  "tấn",
  "tạ",
  "yến",
  "lít",
  "l",
  "cái",
  "chiếc",
  "quyển",
  "tờ",
  "bản",
  "người",
  "ngày",
  "tháng",
  "năm",
  "giờ",
  "phút",
  "giây",
  "phần trăm",
  "%",
];

/**
 * Normalizes number and units split across lines, and standardizes 'm2'/'m3' to superscript 'm²'/'m³'.
 */
export function mergeNumbersAndUnits(text: string): string {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];

  let i = 0;
  while (i < lines.length) {
    let current = lines[i];
    const trimmedCurrent = current.trim();

    if (trimmedCurrent === "" || isHeading(current)) {
      result.push(current);
      i++;
      continue;
    }

    // Try to merge with subsequent lines
    while (i + 1 < lines.length) {
      const next = lines[i + 1];
      const trimmedNext = next.trim();

      if (trimmedNext === "" || isHeading(next)) {
        break;
      }

      let shouldMerge = false;

      // Check if current line ends with a number (e.g. 770.000.000 or 200 or 5.000 or 12,5)
      // We look for digits, possibly separated by dots, commas, or spaces.
      const endsWithNumber = /\d[\d.,\s]*$/.test(trimmedCurrent);

      if (endsWithNumber) {
        // Check if the next line starts with a unit keyword.
        // We match word boundaries or exact symbols like % or m²
        const nextFirstWordMatch = trimmedNext.match(/^([^\s]+)/);
        if (nextFirstWordMatch) {
          const nextFirstWordCleaned = nextFirstWordMatch[1].toLowerCase().replace(/[.,;:!?]+$/, "");
          if (UNITS.includes(nextFirstWordCleaned)) {
            shouldMerge = true;
          }
        }
      }

if (shouldMerge) {
  let mergedWord = trimmedNext;

  // Convert variants of area units to standardized superscript m² / m³
  if (/^m2\b/i.test(mergedWord)) {
    mergedWord = mergedWord.replace(/^m2/i, "m²");
  } else if (/^m3\b/i.test(mergedWord)) {
    mergedWord = mergedWord.replace(/^m3/i, "m³");
  }

  // Handle legacy notations m? or m' (common OCR mis‑reads for m²)
  if (/^m[?']$/i.test(mergedWord)) {
    mergedWord = "m²";
  }

  current = current.trimEnd() + " " + mergedWord;
  i++;
} else {
  break;
}
    }

 // Clean up any remaining m2/m3 conversions and legacy notations in the current line text itself
 current = current
   .replace(/\bm2\b/g, "m²")
   .replace(/\bm3\b/g, "m³")
   .replace(/\bm[?']\b/gi, "m²");

    result.push(current);
    i++;
  }

  return result.join("\n");
}