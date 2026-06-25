import { detectNames } from "./detector";
import { validateAnonymized } from "./validator";
import { buildDictionary, AnonymizerDictionary } from "./dictionary";
import { replaceNames } from "./replacer";
import { replaceAdministrativeUnits } from "./address";
import { maskIdNumbers } from "./idMask";
import { maskPhoneNumbers } from "./phoneMask";

export interface AnonymizeResult {
  text: string;
  stats: {
    names: number;
    provinces: number;
    communes: number;
    idNumbers: number;
    phones: number;
  };
}

/**
 * Helper to determine the end index of the protected header zone.
 * Everything before the returned index is treated as header (protected).
 */
function getHeaderLength(text: string): number {
  const contentMarkers = [
    "Kính gửi",
    "Căn cứ",
    "Thực hiện",
    "Hồi",
    "Ngày",
    "Theo đơn",
    "I\\.",
    "II\\.",
    "1\\.",
    "Nguyên đơn",
    "Bị đơn"
  ];
  const markerRegex = new RegExp(`(^|\\n)\\s*(?:${contentMarkers.join('|')})\\b`, 'mi');
  const match = markerRegex.exec(text);
  if (match) {
    return match.index;
  }

  // Fallback: Check if the text is structured as a header snippet without content.
  const hasMotto = /CỘNG HÒA\s+XÃ HỘI\s+CHỦ NGHĨA\s+VIỆT\s+NAM/i.test(text) ||
                   /Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc/i.test(text);
  
  const startsWithAuthority = /^\s*(?:UỶ BAN NHÂN DÂN|ỦY BAN NHÂN DÂN|UBND|TÒA ÁN NHÂN DÂN|VIỆN KIỂM SÁT NHÂN DÂN)/i.test(text);
  
  const hasContentIndicator = /\b(?:Địa chỉ|Nơi cư trú|Trú tại|Thường trú|Tạm trú|tọa lạc)\b/i.test(text);

  if ((hasMotto || startsWithAuthority) && !hasContentIndicator) {
    return text.length;
  }

  return 0;
}

/**
 * Main anonymization pipeline for legal text.
 */
export function anonymizeLegalText(input: string): AnonymizeResult {
  const stats = {
    names: 0,
    provinces: 0,
    communes: 0,
    idNumbers: 0,
    phones: 0
  };

  if (!input) {
    return { text: "", stats };
  }

  // 1. Detect names (legal‑context based) on the full input to populate the dictionary
  const detectedNames = detectNames(input);

  // 2. Build dictionaries (person, short name, province, commune)
  const dictionary: AnonymizerDictionary = buildDictionary(input, detectedNames);

  // 3. Separate the protected header zone and content zone
  const headerLength = getHeaderLength(input);
  const header = input.substring(0, headerLength);
   let content = input.substring(headerLength);

  // 4. Run replacement steps on the content zone only
   if (content) {
    // Replace names
    content = replaceNames(content, dictionary, stats);

    // Replace administrative units (province/city and commune/ward)
    content = replaceAdministrativeUnits(content, dictionary, stats);

    // Mask ID numbers (CCCD, CMND, etc.)
    content = maskIdNumbers(content, stats);

    // Mask phone numbers
    content = maskPhoneNumbers(content, stats);
  }

   // Validation step
   const validated = validateAnonymized(input, header + content);
   return { text: validated, stats };
}