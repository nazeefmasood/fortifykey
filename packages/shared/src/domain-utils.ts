/**
 * Extract and normalize a domain from a URL.
 * e.g., "https://www.github.com/login" → "github.com"
 */
export function normalizeDomain(url: string): string | null {
  try {
    // Add protocol if missing
    let normalized = url.trim();
    if (!normalized.match(/^https?:\/\//)) {
      normalized = `https://${normalized}`;
    }

    const parsed = new URL(normalized);
    let hostname = parsed.hostname.toLowerCase();

    // Remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    return hostname;
  } catch {
    return null;
  }
}

/**
 * Check if two domains match (for credential auto-fill).
 * Supports exact match and subdomain matching.
 */
export function domainMatches(
  storedDomain: string,
  currentDomain: string
): boolean {
  const stored = storedDomain.toLowerCase();
  const current = currentDomain.toLowerCase();

  // Exact match
  if (stored === current) return true;

  // Subdomain match: "login.github.com" matches stored "github.com"
  if (current.endsWith(`.${stored}`)) return true;

  // Reverse: stored "login.github.com" matches current "github.com"
  if (stored.endsWith(`.${current}`)) return true;

  return false;
}
