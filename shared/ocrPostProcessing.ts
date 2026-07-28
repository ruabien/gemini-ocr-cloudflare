const PAGE_LABEL_PATTERN = /^trang\s+([0-9]{1,4})$/i;
const DASHED_PAGE_NUMBER_PATTERN = /^[-–—]\s*([0-9]{1,4})\s*[-–—]$/;
const STANDALONE_PAGE_NUMBER_PATTERN = /^([0-9]{1,4})$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const SPECIAL_WHITESPACE_PATTERN = /[\u00A0\u200B\uFEFF]/g;
const TRAILING_WHITESPACE_PATTERN = /\s+$/u;

const normalizeLine = (line: string): string => line.replace(SPECIAL_WHITESPACE_PATTERN, ' ').replace(TRAILING_WHITESPACE_PATTERN, '');

const isReasonableStandaloneYear = (value: number): boolean => value >= MIN_YEAR && value <= MAX_YEAR;

// TODO: Future: removeRepeatedHeaders()
// TODO: Future: removeRepeatedFooters()

const shouldRemoveBoundaryLine = (line: string): boolean => {
  const normalizedLine = line.trim();

  if (!normalizedLine) {
    return false;
  }

  const pageLabelMatch = normalizedLine.match(PAGE_LABEL_PATTERN);
  if (pageLabelMatch) {
    return true;
  }

  const dashedPageNumberMatch = normalizedLine.match(DASHED_PAGE_NUMBER_PATTERN);
  if (dashedPageNumberMatch) {
    return true;
  }

  const standalonePageNumberMatch = normalizedLine.match(STANDALONE_PAGE_NUMBER_PATTERN);
  if (!standalonePageNumberMatch) {
    return false;
  }

  const pageNumber = Number.parseInt(standalonePageNumberMatch[1], 10);

  // Be conservative: keep standalone 4-digit values that look like real years.
  if (standalonePageNumberMatch[1].length === 4 && isReasonableStandaloneYear(pageNumber)) {
    return false;
  }

  return true;
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

export const cleanOcrPageText = (text: string): string => {
  const normalizedText = normalizePageText(text);
  const withoutBoundaryPageNumbers = removePageNumberLines(normalizedText);

  return normalizePageText(withoutBoundaryPageNumbers);
};