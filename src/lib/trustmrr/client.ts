/**
 * TrustMRR API client with multi-key round-robin rate limiting.
 *
 * Set TRUSTMRR_API_KEY to a comma-separated list of keys for parallel throughput.
 * Each key gets its own rate limit window (20 req/min default).
 */

const BASE_URL = "https://trustmrr.com/api/v1";
const RATE_LIMIT_PER_KEY = parseInt(process.env.TRUSTMRR_RATE_LIMIT ?? "20", 10);
const WINDOW_MS = 60_000;
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Key pool
// ---------------------------------------------------------------------------

interface KeySlot {
  key: string;
  timestamps: number[];
  pauseUntil: number | null;
}

const API_KEYS = (process.env.TRUSTMRR_API_KEY ?? "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

if (API_KEYS.length === 0 && typeof process !== "undefined") {
  console.warn("[trustmrr] No API keys configured");
}

const slots: KeySlot[] = API_KEYS.map((key) => ({
  key,
  timestamps: [],
  pauseUntil: null,
}));

let robin = 0;

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.min(ms, 120_000)));
}

function parseResetTimestamp(value: string): number | null {
  const num = parseInt(value, 10);
  if (isNaN(num)) return null;
  if (num > 1_577_836_800 && num < 2_524_608_000) return num * 1000;
  if (num > 1_577_836_800_000) return num;
  return Date.now() + num * 1000;
}

async function acquireSlot(): Promise<KeySlot> {
  while (true) {
    const now = Date.now();

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[(robin + i) % slots.length];

      if (slot.pauseUntil && now < slot.pauseUntil) continue;
      slot.pauseUntil = null;

      slot.timestamps = slot.timestamps.filter((t) => now - t < WINDOW_MS);
      if (slot.timestamps.length < RATE_LIMIT_PER_KEY) {
        slot.timestamps.push(now);
        robin = ((robin + i + 1) % slots.length);
        return slot;
      }
    }

    // All keys exhausted — wait for the earliest opening
    let minWait = WINDOW_MS;
    for (const slot of slots) {
      if (slot.pauseUntil && slot.pauseUntil > now) {
        minWait = Math.min(minWait, slot.pauseUntil - now);
      } else if (slot.timestamps.length > 0) {
        minWait = Math.min(minWait, WINDOW_MS - (now - slot.timestamps[0]));
      }
    }

    console.log(`[trustmrr] All ${slots.length} key(s) busy, waiting ${Math.round(minWait / 1000)}s`);
    await sleep(minWait + 200);
  }
}

function handleRateLimitHeaders(res: Response, slot: KeySlot): void {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const retryAfter = res.headers.get("retry-after");

  if (remaining !== null) {
    const rem = parseInt(remaining, 10);
    if (rem <= 1 && reset) {
      const resetAt = parseResetTimestamp(reset);
      if (resetAt && resetAt > Date.now()) {
        slot.pauseUntil = resetAt;
      }
    }
  }

  if (retryAfter) {
    const resetAt = parseResetTimestamp(retryAfter);
    if (resetAt && resetAt > Date.now()) {
      slot.pauseUntil = resetAt;
    }
  }
}

// ---------------------------------------------------------------------------
// API fetch
// ---------------------------------------------------------------------------

async function apiFetch(url: string, attempt = 0): Promise<Response> {
  const slot = await acquireSlot();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${slot.key}` },
    cache: "no-store",
  });

  handleRateLimitHeaders(res, slot);

  if ([429, 502, 503, 504, 508].includes(res.status)) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`TrustMRR API ${res.status} after ${MAX_RETRIES} retries — ${url}`);
    }

    let wait = res.status === 429 ? 60_000 : 10_000;
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) {
      const resetAt = parseResetTimestamp(retryAfter);
      if (resetAt) wait = Math.max(resetAt - Date.now(), 1000);
    }

    console.log(`[trustmrr] ${res.status} (attempt ${attempt + 1}/${MAX_RETRIES}), waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
    if (res.status === 429) slot.timestamps = [];
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

export interface TrustMRRDetail extends TrustMRRListItem {
  xFollowerCount: number | null;
  isMerchantOfRecord: boolean;
  techStack: { slug: string; category: string }[];
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
