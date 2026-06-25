/**
 * Mask phone numbers in legal text.
 */
export function maskPhoneNumbers(
  text: string,
  stats: { phones: number }
): string {
  const regex = /(số\s+điện\s+thoại|điện\s+thoại|sđt)(?:\s+|:\s*|số\s+|-\s*)*(\d{9,12})\b/gi;
  return text.replace(regex, (match, _prefix, digits) => {
    stats.phones++;
    const maskedDigits = digits.slice(0, -3) + "***";
    return match.replace(digits, maskedDigits);
  });
}