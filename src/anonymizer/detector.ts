export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectNames(text: string): Set<string> {
  // Simplified detector for performance: no heavy regexes
  return new Set<string>();
}
