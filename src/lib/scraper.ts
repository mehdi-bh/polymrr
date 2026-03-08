/**
 * MRR History Scraper for TrustMRR.
 *
 * Uses the lightweight RSC flight endpoint to extract per-startup API tokens,
 * then calls the internal revenue API. Adaptive rate limiting auto-throttles
 * on 429s and recovers when pressure eases.
 */

const BASE = "https://trustmrr.com";
const MAX_RETRIES = 5;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface ScrapedMrrPoint {
  date: string; // YYYY-MM-DD (first of month)
  mrr: number; // USD cents
}

interface RevenueEntry {
  date: string;
  revenue: number; // USD dollars
  charges: number;
}

let adaptiveDelayMs = 0;

export function getAdaptiveDelay(): number {
  return adaptiveDelayMs;
}

function on429() {
  adaptiveDelayMs = Math.min(60_000, Math.max(adaptiveDelayMs * 2, 5_000));
}

function onSuccess() {
  adaptiveDelayMs = Math.max(0, Math.floor(adaptiveDelayMs * 0.8));
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 418) throw new Error("418 Invalid token");
    if (res.status !== 429) {
      onSuccess();
      return res;
    }
    if (attempt === MAX_RETRIES) return res;

    on429();
    const retryAfter = res.headers.get("retry-after");
    const waitMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : 15_000 * Math.pow(2, attempt);
    console.warn(`[scraper] 429 ${url}, retry in ${Math.round(waitMs / 1000)}s (${attempt + 1}/${MAX_RETRIES})`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error("unreachable");
}

function extractApiToken(body: string): string | null {
  const m = body.match(/apiToken":"([a-f0-9]{64})/) ?? body.match(/apiToken\\":\\"([a-f0-9]{64})/);
  return m ? m[1] : null;
}

async function fetchApiToken(slug: string): Promise<string | null> {
  const res = await fetchWithRetry(`${BASE}/startup/${encodeURIComponent(slug)}`, {
    headers: { RSC: "1", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`RSC fetch ${res.status}`);
  return extractApiToken(await res.text());
}

async function fetchRevenueTimeline(slug: string, token: string): Promise<RevenueEntry[] | null> {
  const res = await fetchWithRetry(
    `${BASE}/api/startup/revenue/${encodeURIComponent(slug)}?granularity=daily&period=all`,
    {
      headers: {
        "x-api-token": token,
        "User-Agent": UA,
        Referer: `${BASE}/startup/${encodeURIComponent(slug)}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Revenue API ${res.status}`);
  const body = await res.json();
  if (body.loading || !Array.isArray(body.data)) return null;
  return body.data;
}

function aggregateToMonthlyMrr(entries: RevenueEntry[]): ScrapedMrrPoint[] {
  const monthly = new Map<string, number>();
  for (const e of entries) {
    const month = e.date.slice(0, 7);
    monthly.set(month, (monthly.get(month) ?? 0) + e.revenue);
  }
  return Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ date: `${month}-01`, mrr: Math.round(revenue * 100) }));
}

export async function scrapeMrrHistory(slug: string): Promise<ScrapedMrrPoint[] | null> {
  try {
    const token = await fetchApiToken(slug);
    if (!token) return null;

    const entries = await fetchRevenueTimeline(slug, token);
    if (!entries?.length) return null;

    const currentMonth = new Date().toISOString().slice(0, 7);
    return aggregateToMonthlyMrr(entries).filter((p) => p.date.slice(0, 7) < currentMonth);
  } catch (err) {
    throw new Error(`Scrape failed for ${slug}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
