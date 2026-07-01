/**
 * Simple test script for the DOCX AI Clean pipeline.
 *
 * It imports the public `clean` function from `src/docFormatter/index.ts`
 * and runs a handful of representative samples covering the major rules:
 *   1️⃣ Smart line merging
 *   2️⃣ Person name merging
 *   3️⃣ Number + unit merging
 *   4️⃣ Empty paragraph cleanup
 *   5️⃣ Spacing & punctuation normalization
 *   6️⃣ Validation (should pass for these examples)
 *
 * Run with:
 *   npx tsx scratch/test_doc_clean.ts
 */

import { clean } from "../src/docFormatter";

const samples: { description: string; input: string }[] = [
  {
    description: "Smart line merge – sentence split without punctuation",
    input: `Nguyễn
Thị Thảo là người dân`,
  },
  {
    description: "Do not merge when next line is a heading",
    input: `Quyết Định
1.
Nội dung quyết định`,
  },
  {
    description: "Person name merge with title prefix",
    input: `bà
Nguyễn
Thị Thảo`,
  },
  {
    description: "Location merge (comma + province)",
    input: `Krông Ana,
tỉnh Đắk Lắk`,
  },
  {
    description: "Number + unit merge (currency)",
    input: `770.000.000
đồng`,
  },
  {
    description: "Number + unit merge (area)",
    input: `200
m²`,
  },
  {
    description: "Empty paragraph cleanup – multiple blank lines",
    input: `Đoạn văn đầu

  

Đoạn văn thứ hai`,
  },
  {
    description: "Spacing & punctuation normalization",
    input: `Công ty , XYZ  : là   công ty  .`,
  },
  {
    description: "Parentheses spacing normalization",
    input: `(Nay là...`,
  },
];

function visualize(str: string): string {
  // Replace newline with ⏎ for easier reading in console
  return str.replace(/\r?\n/g, "⏎");
}

samples.forEach(({ description, input }, idx) => {
  console.log(`\n--- Sample ${idx + 1}: ${description} ---`);
  console.log("Input : ", visualize(input));
  const output = clean(input);
  console.log("Output: ", visualize(output));
});

console.log("\n========================================");
console.log("RUNNING REAL TEST CASES FROM SCRATCH/TEST_CASES");
console.log("========================================");

import * as fs from "fs";
import * as path from "path";

const testCasesDir = path.resolve(process.cwd(), "scratch/test_cases");
const files = [
  "civil_notice.txt",
  "mediation.txt",
  "administrative_notice.txt",
  "indictment.txt",
  "judgment.txt",
  "docFormatter/real_judgment_excerpt.txt",
  "docFormatter/real_mediation_excerpt.txt",
  "docFormatter/real_civil_notice_excerpt.txt",
  "docFormatter/money_unit_join.txt",
  "docFormatter/address_location_join.txt",
  "docFormatter/smart_name_join.txt"
];

files.forEach(file => {
  const filePath = path.join(testCasesDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`\n📄 Testing File: ${file}`);
    const input = fs.readFileSync(filePath, "utf-8");
    console.log(`Original: ${input.length} chars, ${input.split(/\r?\n/).length} lines`);
    
    const output = clean(input);
    console.log(`Cleaned : ${output.length} chars, ${output.split(/\r?\n/).length} lines`);
    
    // Check if the file changed or stayed exactly the same (meaning it rolled back or had no changes)
    if (output === input) {
      console.log("Result: Output is identical to input (either no changes or rolled back!)");
    } else {
      console.log("Result: Cleaned successfully (changed structure).");
      // Let's print the first 300 characters of input and output to visually compare
      console.log("--- First 300 chars of Cleaned Output: ---");
      console.log(output.substring(0, 300));
      console.log("------------------------------------------");
    }
  } else {
    console.log(`⚠️ Warning: ${file} not found at ${filePath}`);
  }
});
