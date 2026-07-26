/**
 * Utility functions for Knowledge Center navigation using History API.
 * No React imports – pure browser API.
 */

export function navigateToKnowledgeCenter(): void {
  window.history.pushState({}, '', '/knowledge');
  const navEvent = new PopStateEvent('popstate');
  window.dispatchEvent(navEvent);
}

/**
 * Navigate to a specific article slug.
 * @param slug article slug, e.g. "chuyen-pdf-scan-sang-word"
 */
export function navigateToKnowledgeArticle(slug: string): void {
  window.history.pushState({}, '', `/knowledge/${slug}`);
  const navEvent = new PopStateEvent('popstate');
  window.dispatchEvent(navEvent);
}

export function navigateToScanner(): void {
  window.history.pushState({ activeTab: 'scanner' }, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate', { state: { activeTab: 'scanner' } }));
}
