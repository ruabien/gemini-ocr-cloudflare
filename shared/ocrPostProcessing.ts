const PAGE_LABEL_PATTERN = /^trang\s+([0-9]{1,4})$/i;
const DASHED_PAGE_NUMBER_PATTERN = /^[-–—]\s*([0-9]{1,4})\s*[-–—]$/;
const STANDALONE_PAGE_NUMBER_PATTERN = /^([0-9]{1,3})$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const SPECIAL_WHITESPACE_PATTERN = /[\u00A0\u200B\uFEFF]/g;
const TRAILING_WHITESPACE_PATTERN = /\s+$/u;

const normalizeLine = (line: string): string => line.replace(SPECIAL_WHITESPACE_PATTERN, ' ').replace(TRAILING_WHITESPACE_PATTERN, '');

const isReasonableStandaloneYear = (value: number): boolean => value >= MIN_YEAR && value <= MAX_YEAR;

// TODO: Future: removeRepeatedHeaders()
// TODO: Future: removeRepeatedFooters()

export type OcrPageCleaningContext = {
  pageIndex?: number;
};

const isExplicitPageNumberLine = (line: string): boolean => {
  const normalizedLine = line.trim();

  return PAGE_LABEL_PATTERN.test(normalizedLine) || DASHED_PAGE_NUMBER_PATTERN.test(normalizedLine);
};

const shouldRemoveStandalonePageNumberByContext = (
  line: string,
  context?: OcrPageCleaningContext
): boolean => {
  const normalizedLine = line.trim();
  const standalonePageNumberMatch = normalizedLine.match(STANDALONE_PAGE_NUMBER_PATTERN);

  if (!standalonePageNumberMatch) {
    return false;
  }

  const pageNumber = Number.parseInt(standalonePageNumberMatch[1], 10);
  const pageIndex = context?.pageIndex;

  if (typeof pageIndex === 'number' && Number.isInteger(pageIndex) && pageIndex > 1 && pageNumber >= 1) {
    return pageNumber === pageIndex - 1;
  }

  return false;
};

const shouldRemoveBoundaryLine = (line: string): boolean => {
  const normalizedLine = line.trim();

  if (!normalizedLine) {
    return false;
  }

  if (isExplicitPageNumberLine(normalizedLine)) {
    return true;
  }

  const standalonePageNumberMatch = normalizedLine.match(STANDALONE_PAGE_NUMBER_PATTERN);
  if (!standalonePageNumberMatch) {
    return false;
  }

  const pageNumber = Number.parseInt(standalonePageNumberMatch[1], 10);

  // Be conservative without page context: only remove short standalone values at page boundaries.
  if (isReasonableStandaloneYear(pageNumber)) {
    return false;
  }

  return true;
};

const shouldRemoveLineAnywhere = (line: string, context?: OcrPageCleaningContext): boolean => {
  if (isExplicitPageNumberLine(line)) {
    return true;
  }

  // OCR reading order may place a physical footer page number in the
  // middle of extracted page text. Standalone numeric lines are therefore
  // removed across the page only when they match the common
  // pageIndex - 1 offset.
  return shouldRemoveStandalonePageNumberByContext(line, context);
};

export const normalizePageText = (text: string): string => {
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(SPECIAL_WHITESPACE_PATTERN, ' ');

  return normalizedText
    .split('\n')
    .map(normalizeLine)
    .filter((line) => line.trim().length > 0)
    .join('\n');
};

export const removePageNumberLines = (text: string): string => {
  const normalizedText = normalizePageText(text);

  if (!normalizedText) {
    return '';
  }

  const lines = normalizedText.split('\n');
  let startIndex = 0;
  let endIndex = lines.length - 1;

  if (shouldRemoveBoundaryLine(lines[startIndex])) {
    startIndex += 1;
  }

  if (startIndex <= endIndex && shouldRemoveBoundaryLine(lines[endIndex])) {
    endIndex -= 1;
  }

  if (startIndex > endIndex) {
    return '';
  }

  return lines.slice(startIndex, endIndex + 1).join('\n');
};

export const cleanOcrPageText = (text: string, context?: OcrPageCleaningContext): string => {
  const normalizedText = normalizePageText(text);

  if (!normalizedText) {
    return '';
  }

  const lines = normalizedText
    .split('\n')
    .filter((line) => !shouldRemoveLineAnywhere(line, context));

  if (lines.length === 0) {
    return '';
  }

  const withoutExplicitAndContextualPageNumbers = lines.join('\n');
  const withoutBoundaryPageNumbers = removePageNumberLines(withoutExplicitAndContextualPageNumbers);

  return normalizePageText(withoutBoundaryPageNumbers);
};
