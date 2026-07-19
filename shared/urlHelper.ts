/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sanitizes a URL by redacting the 'key' query parameter to prevent logging API keys.
 * 
 * @param url The URL string to sanitize.
 * @returns The sanitized URL string.
 */
export const sanitizeUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  
  // Use regex to replace the key parameter value with ***
  // Matches ?key=value or &key=value and preserves the ? or &
  return String(url).replace(/([?&])key=[^&]*/g, '$1key=***');
};