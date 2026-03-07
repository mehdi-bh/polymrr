/**
 * TrustMRR API client with built-in rate limiting.
 *
 * Respects server rate-limit headers (x-ratelimit-remaining, x-ratelimit-reset, retry-after)
 * and enforces a local sliding window as a safety net.
 */

const BASE_URL = "https://trustmrr.com/api/v1";

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

const LOCAL_RATE_LIMIT = parseInt(process.env.TRUSTMRR_RATE_LIMIT ?? "20", 10);
const WINDOW_MS = 60_000;
const MAX_RETRIES = 3;

let requestTimestamps: number[] = [];
let pauseUntil: number | null = null;

function parseResetTimestamp(value: string): number | null {
  const num = parseInt(value, 10);
  if (isNaN(num)) return null;
  // If it looks like a unix timestamp in seconds (reasonable range: 2020-2040)
  if (num > 1_577_836_800 && num < 2_524_608_000) {
    return num * 1000;
  }
  // If it's already in milliseconds (> year 2020 in ms)
  if (num > 1_577_836_800_000) {
    return num;
  }
  // Otherwise treat as seconds-from-now
  return Date.now() + num * 1000;
}

function sleep(ms: number): Promise<void> {
  // Clamp to avoid Node.js 32-bit overflow warning
  return new Promise((r) => setTimeout(r, Math.min(ms, 120_000)));
}

async function waitForSlot(): Promise<void> {
  // Respect server-imposed pause
  if (pauseUntil && Date.now() < pauseUntil) {
    const wait = pauseUntil - Date.now() + 200;
    console.log(`[trustmrr] Waiting ${Math.round(wait / 1000)}s for rate limit reset`);
    await sleep(wait);
    pauseUntil = null;
    requestTimestamps = [];
  }

  // Local sliding window
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < WINDOW_MS);

  if (requestTimestamps.length >= LOCAL_RATE_LIMIT) {
    const oldest = requestTimestamps[0];
    const wait = WINDOW_MS - (now - oldest) + 200;
    console.log(`[trustmrr] Local rate limit (${LOCAL_RATE_LIMIT}/min), waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
    requestTimestamps = requestTimestamps.filter((t) => Date.now() - t < WINDOW_MS);
  }

  requestTimestamps.push(Date.now());
}

function readRateLimitHeaders(res: Response): void {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const retryAfter = res.headers.get("retry-after");

  if (remaining !== null) {
    const rem = parseInt(remaining, 10);
    if (rem <= 1 && reset) {
      const resetAt = parseResetTimestamp(reset);
      if (resetAt && resetAt > Date.now()) {
        pauseUntil = resetAt;
        console.log(`[trustmrr] ${rem} requests remaining, will pause until reset (${Math.round((resetAt - Date.now()) / 1000)}s)`);
      }
    }
  }

  if (retryAfter) {
    const resetAt = parseResetTimestamp(retryAfter);
    if (resetAt && resetAt > Date.now()) {
      pauseUntil = resetAt;
    }
  }
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.TRUSTMRR_API_KEY}` };
}

async function apiFetch(url: string, attempt = 0): Promise<Response> {
  await waitForSlot();

  const res = await fetch(url, { headers: authHeaders() });
  readRateLimitHeaders(res);

  // Retryable errors: 429, 508, 502, 503, 504
  if (res.status === 429 || res.status === 508 || res.status === 502 || res.status === 503 || res.status === 504) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`TrustMRR API ${res.status} after ${MAX_RETRIES} retries — ${url}`);
    }

    let wait = res.status === 429 ? 60_000 : 10_000;
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) {
      const resetAt = parseResetTimestamp(retryAfter);
      if (resetAt) wait = Math.max(resetAt - Date.now(), 1000);
    }

    console.log(`[trustmrr] ${res.status} ${res.statusText} (attempt ${attempt + 1}/${MAX_RETRIES}), waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
    if (res.status === 429) requestTimestamps = [];
    return apiFetch(url, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`TrustMRR API error: ${res.status} ${res.statusText} — ${url}`);
  }

  return res;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TrustMRRListResponse {
  data: TrustMRRListItem[];
  meta: { total: number; page: number; limit: number; hasMore: boolean };
}

/** Fields returned by the list endpoint (truncated description, no techStack/cofounders) */
export interface TrustMRRListItem {
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
  foundedDate: string | null;
  category: string | null;
  paymentProvider: string;
  targetAudience: string | null;
  revenue: { last30Days: number; mrr: number; total: number };
  customers: number;
  activeSubscriptions: number;
  askingPrice: number | null;
  profitMarginLast30Days: number | null;
  growth30d: number | null;
  multiple: number | null;
  onSale: boolean;
  firstListedForSaleAt: string | null;
  xHandle: string | null;
}

/** Full detail response — includes techStack, cofounders, xFollowerCount, isMerchantOfRecord */
export interface TrustMRRDetail extends TrustMRRListItem {
  xFollowerCount: number | null;
  isMerchantOfRecord: boolean;
  techStack: { slug: string; category: string }[];
  cofounders: { xHandle: string; xName: string | null }[];
}

export async function listStartups(params: {
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<TrustMRRListResponse> {
  const url = new URL(`${BASE_URL}/startups`);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.sort) url.searchParams.set("sort", params.sort);

  const res = await apiFetch(url.toString());
  return res.json();
}

export async function getStartupDetail(slug: string): Promise<TrustMRRDetail> {
  const res = await apiFetch(`${BASE_URL}/startups/${encodeURIComponent(slug)}`);
  const { data } = await res.json();
  return data;
}

/** Paginate through all startups on the list endpoint */
export async function fetchAllSlugs(): Promise<TrustMRRListItem[]> {
  const all: TrustMRRListItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await listStartups({ page, limit: 50, sort: "revenue-desc" });
    all.push(...res.data);
    console.log(`[trustmrr] fetchAllSlugs page ${page}: +${res.data.length} (total: ${all.length}/${res.meta.total})`);
    hasMore = res.meta.hasMore;
    page++;
  }

  return all;
}
