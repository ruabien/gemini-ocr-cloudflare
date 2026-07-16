/**
 * DOCX Styles module.
 *
 * Centralises the Paragraph styling logic for the DOCX Pro export.
 * The function returns the configuration object passed to the `new Paragraph(...)`
 * constructor from the `docx` library.
 *
 * Styling rules (see task description):
 *   • Normal paragraph:
 *       – Times New Roman, 14pt, justified,
 *       – line spacing single (6pt before/after),
 *       – first‑line indent 1.27 cm (720 dxa)
 *   • Legal heading (isHeadingPhapLy):
 *       – bold, spacing before 12pt, after 6pt,
 *       – no first‑line indent,
 *       – keepNext when supported
 *   • All‑caps heading (isHeadingToanChuHoa):
 *       – same as normal heading but centered
 *   • Mục số cấp 1 (isMucSoCap1):
 *       – light bold, no centering
 *
 * The function does **not** import `docx` directly – it only returns the
 * plain configuration object. This keeps the module free of side‑effects and
 * makes it easy to unit‑test.
 */

import {
  isHeadingPhapLy,
  isHeadingToanChuHoa,
  isMucSoCap1,
} from "./paragraphStyle";

/**
 * Determines the paragraph configuration for a given line.
 *
 * @param line  The raw line of text (already trimmed).
 * @param mode  Export mode – either "manual_edit", "flatten_center" or the default.
 * @returns An object suitable for the `new Paragraph(options)` constructor.
 */
export function getParagraphConfig(line: string, mode: string) {
  const trimmed = line.trim();

  // Identify special paragraph types
  const headingPhapLy = isHeadingPhapLy(trimmed);
  const headingAllCaps = isHeadingToanChuHoa(trimmed);
  const mucSoCap1 = isMucSoCap1(trimmed);

  // Base alignment
  const alignment = headingAllCaps
    ? /* center */ 1 // AlignmentType.CENTER (numeric value 1) – avoid importing docx
    : /* justified */ 0; // AlignmentType.JUSTIFIED (numeric value 0)

  // Indent: normal paragraphs only
  const indent = headingPhapLy || headingAllCaps ? undefined : { firstLine: 720 };

  // Spacing
  const spacing = {
    // before: 6pt (120 dxa) for normal, 12pt (240 dxa) for legal headings
    before: headingPhapLy ? 240 : 120,
    after: 120,
    line: 240, // single line spacing (12pt * 20)
  };

  // Bold handling
  const bold = headingPhapLy || headingAllCaps || mucSoCap1;

  // Build children TextRun config
  const children = [
    {
      text: trimmed,
      font: "Times New Roman",
      size: 28, // 14pt => 28 half‑points
      color: "000000",
      bold,
    },
  ];

  // Return the final Paragraph configuration object
  return {
    alignment,
    ...(indent ? { indent } : {}),
    spacing,
    ...(headingPhapLy ? { heading: 3, keepNext: true } : {}), // HeadingLevel.HEADING_3 = 3
    children,
  };
}
