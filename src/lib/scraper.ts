/**
 * MRR History Scraper for TrustMRR.
 *
 * Extracts historical revenue data from TrustMRR startup pages by:
 *   1. Fetching the page HTML to extract the per-startup API token (embedded in the RSC payload)
 *   2. Calling the internal revenue API with that token
 *   3. Aggregating daily revenue into monthly MRR estimates
 *
 * Revenue API: GET /api/startup/revenue/{slug}?granularity=daily&period=all
 * Requires header: x-api-token: <token from page>
 */

const TRUSTMRR_BASE = "https://trustmrr.com";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 10_000; // 10s on first 429

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;

    if (attempt === MAX_RETRIES) return res;

    const retryAfter = res.headers.get("retry-after");
    const waitMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    console.warn(`[scraper] 429 for ${url}, retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error("unreachable");
}

export interface ScrapedMrrPoint {
  date: string; // YYYY-MM-DD (first of month)
  mrr: number; // USD cents
}

interface RevenueEntry {
  date: string;
  revenue: number; // USD dollars
  charges: number;
}

interface RevenueResponse {
  loading: boolean;
  data: RevenueEntry[];
}

/**
 * Extract the per-startup API token from the TrustMRR page HTML.
 * The token is embedded in the Next.js RSC flight payload with escaped quotes:
 *   \\\"apiToken\\\":\\\"<64-char hex>\\\"
 */
function extractApiToken(html: string): string | null {
  const match = html.match(/apiToken\\":\\"([a-f0-9]{64})/);
  return match ? match[1] : null;
}

/**
 * Fetch the raw revenue timeline from TrustMRR's internal API.
 * Returns daily revenue entries (in USD dollars) or null on failure.
 */
async function fetchRevenueTimeline(
  slug: string,
  apiToken: string
): Promise<RevenueEntry[] | null> {
  const url = `${TRUSTMRR_BASE}/api/startup/revenue/${encodeURIComponent(slug)}?granularity=daily&period=all`;

  const res = await fetchWithRetry(url, {
    headers: { "x-api-token": apiToken },
  });

  if (!res.ok) {
    throw new Error(`Revenue API ${res.status}`);
  }

  const body: RevenueResponse = await res.json();
  if (body.loading || !Array.isArray(body.data)) return null;
  return body.data;
}

/**
 * Aggregate daily revenue entries into monthly MRR estimates.
 * Each month's MRR = sum of all daily revenue in that calendar month.
 * Values are converted from USD dollars to cents.
 */
function aggregateToMonthlyMrr(entries: RevenueEntry[]): ScrapedMrrPoint[] {
  const monthly = new Map<string, number>();

  for (const e of entries) {
    const month = e.date.slice(0, 7); // YYYY-MM
    monthly.set(month, (monthly.get(month) ?? 0) + e.revenue);
  }

  return Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({
      date: `${month}-01`,
      mrr: Math.round(revenue * 100), // dollars → cents
    }));
}

/**
 * Scrape MRR history for a single TrustMRR startup.
 *
 * Steps:
 *   1. Fetch the startup page to extract the embedded API token
 *   2. Call the internal revenue API with that token
 *   3. Aggregate daily revenue into monthly MRR (in USD cents)
 *
 * Returns sorted array of monthly MRR points, or null on failure.
 */
export async function scrapeMrrHistory(
  slug: string
): Promise<ScrapedMrrPoint[] | null> {
  try {
    const pageUrl = `${TRUSTMRR_BASE}/startup/${encodeURIComponent(slug)}`;
    const pageRes = await fetchWithRetry(pageUrl, {
      headers: { "User-Agent": "PolyMRR/1.0 (prediction market platform)" },
    });

    if (!pageRes.ok) {
      throw new Error(`Page fetch ${pageRes.status}`);
    }

    const html = await pageRes.text();
    const apiToken = extractApiToken(html);

    if (!apiToken) {
      return null; // legitimately no token (startup may not have revenue data)
    }

    const entries = await fetchRevenueTimeline(slug, apiToken);
    if (!entries || entries.length === 0) return null;

    const points = aggregateToMonthlyMrr(entries);

    // Drop the current (incomplete) month
    const currentMonth = new Date().toISOString().slice(0, 7);
    return points.filter((p) => p.date.slice(0, 7) < currentMonth);
  } catch (err) {
    throw new Error(`Scrape failed for ${slug}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
