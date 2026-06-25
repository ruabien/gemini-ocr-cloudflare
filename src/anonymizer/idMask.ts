/**
 * Mask identity numbers (CCCD, CMND, etc.) in legal text.
 */
export function maskIdNumbers(
  text: string,
  stats: { idNumbers: number }
): string {
  const regex = /(cccd|cmnd|căn\s+cước\s+công\s+dân|số\s+định\s+danh\s+cá\s+nhân)(?:\s+|:\s*|số\s+|-\s*)*(\d{9,12})\b/gi;
  return text.replace(regex, (match, _prefix, digits) => {
    stats.idNumbers++;
    const maskedDigits = digits.slice(0, -3) + "***";
    return match.replace(digits, maskedDigits);
  });
}