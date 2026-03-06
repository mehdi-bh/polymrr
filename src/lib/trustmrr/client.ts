/**
 * TrustMRR API client with built-in rate limiting.
 *
 * Rate limit is configurable via TRUSTMRR_RATE_LIMIT env var (default: 20 req/min).
 * The client also respects rate-limit headers returned by the API:
 *   x-ratelimit-remaining, x-ratelimit-reset, retry-after
 */

const BASE_URL = "https://trustmrr.com/api/v1";

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

const RATE_LIMIT = parseInt(process.env.TRUSTMRR_RATE_LIMIT ?? "20", 10);
const WINDOW_MS = 60_000; // 1 minute

let requestTimestamps: number[] = [];
let serverResetAt: number | null = null;

async function waitForSlot(): Promise<void> {
  // If the server told us to wait until a specific time, respect that first
  if (serverResetAt && Date.now() < serverResetAt) {
    const wait = serverResetAt - Date.now() + 100; // small buffer
    await new Promise((r) => setTimeout(r, wait));
    serverResetAt = null;
  }

  // Sliding window: remove timestamps older than 1 minute
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < WINDOW_MS);

  if (requestTimestamps.length >= RATE_LIMIT) {
    const oldest = requestTimestamps[0];
    const wait = WINDOW_MS - (now - oldest) + 100;
    await new Promise((r) => setTimeout(r, wait));
    requestTimestamps = requestTimestamps.filter((t) => Date.now() - t < WINDOW_MS);
  }

  requestTimestamps.push(Date.now());
}

function readRateLimitHeaders(res: Response): void {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const retryAfter = res.headers.get("retry-after");

  if (remaining === "0" && reset) {
    // reset is typically a unix timestamp (seconds)
    serverResetAt = parseInt(reset, 10) * 1000;
  }

  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      serverResetAt = Date.now() + seconds * 1000;
    }
  }
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function headers(): HeadersInit {
  return { Authorization: `Bearer ${process.env.TRUSTMRR_API_KEY}` };
}

async function apiFetch(url: string): Promise<Response> {
  await waitForSlot();

  const res = await fetch(url, { headers: headers() });
  readRateLimitHeaders(res);

  if (res.status === 429) {
    // Rate limited — wait and retry once
    const retryAfter = res.headers.get("retry-after");
    const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
    console.log(`[trustmrr] Rate limited, waiting ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    requestTimestamps = [];
    return apiFetch(url);
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
    hasMore = res.meta.hasMore;
    page++;
  }

  return all;
}
