# WS4: MRR History Scraper

> Implementation spec for Claude. Execute step-by-step.

---

## Overview

The TrustMRR API does not expose historical MRR data (the chart on their startup pages). We need to scrape this from the TrustMRR website directly to populate our `mrr_history` table for the MRR charts.

---

## What We Need

Each startup page on TrustMRR (e.g. `https://trustmrr.com/startups/shipfast`) shows an MRR chart with historical data points. We need to extract the data behind this chart.

**Target data**: Array of `{ date, mrr }` for each startup, going as far back as available.

---

## Step 0: Research TrustMRR Page Structure

Before implementing, we need to investigate how the MRR chart data is loaded on TrustMRR startup pages. There are several possibilities:

1. **Inline JSON/props**: The data might be embedded in the page HTML as a `<script>` tag (e.g., Next.js `__NEXT_DATA__` or similar)
2. **Client-side API call**: The chart might fetch data from an internal API endpoint (visible in Network tab)
3. **Rendered SVG/Canvas**: The chart might be pure SVG with data only in visual form (hardest to scrape)

**Action**: Before coding, manually inspect a TrustMRR startup page:
1. View source for `__NEXT_DATA__` or embedded JSON containing MRR history
2. Check Network tab for XHR/fetch requests that return chart data
3. Check if there's an undocumented API endpoint returning historical data

This research step determines the scraping approach. The spec below covers the most common scenarios.

---

## Step 1: Scraper Implementation

### `src/lib/scraper.ts`

#### Approach A: Page contains embedded data (most likely)

If TrustMRR uses Next.js (likely given the ecosystem), the MRR chart data is probably in `__NEXT_DATA__`:

```typescript
export interface ScrapedMrrPoint {
  date: string; // ISO date
  mrr: number;  // USD cents
}

/**
 * Scrape MRR history from a TrustMRR startup page.
 * Returns array of { date, mrr } or null if scraping fails.
 */
export async function scrapeMrrHistory(slug: string): Promise<ScrapedMrrPoint[] | null> {
  try {
    const url = `https://trustmrr.com/startups/${slug}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PolyMRR/1.0 (prediction market platform)",
      },
    });

    if (!res.ok) {
      console.error(`Scrape failed for ${slug}: HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Strategy 1: Look for __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (nextDataMatch) {
      const nextData = JSON.parse(nextDataMatch[1]);
      return extractMrrFromNextData(nextData, slug);
    }

    // Strategy 2: Look for inline script with chart data
    // Adjust regex based on actual page structure
    const chartDataMatch = html.match(/mrrHistory["']?\s*[:=]\s*(\[[\s\S]*?\])/);
    if (chartDataMatch) {
      const data = JSON.parse(chartDataMatch[1]);
      return normalizeMrrData(data);
    }

    // Strategy 3: Look for JSON-LD or other structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
    if (jsonLdMatch) {
      // Parse and look for revenue history
    }

    console.warn(`No MRR data found in page for ${slug}`);
    return null;
  } catch (err) {
    console.error(`Scrape error for ${slug}:`, err);
    return null;
  }
}

/**
 * Extract MRR history from Next.js page data.
 * The exact path depends on the page's props structure.
 * This needs to be updated based on actual TrustMRR page structure.
 */
function extractMrrFromNextData(nextData: any, slug: string): ScrapedMrrPoint[] | null {
  // Common patterns to check:
  const pageProps = nextData?.props?.pageProps;
  if (!pageProps) return null;

  // Look for chart data in various common locations
  const candidates = [
    pageProps.mrrHistory,
    pageProps.startup?.mrrHistory,
    pageProps.chartData,
    pageProps.revenueHistory,
    pageProps.data?.mrrHistory,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return normalizeMrrData(candidate);
    }
  }

  return null;
}

/**
 * Normalize scraped MRR data to our format.
 * TrustMRR might use various date/value formats.
 */
function normalizeMrrData(data: any[]): ScrapedMrrPoint[] {
  return data
    .map((point) => {
      // Handle various formats
      const date = point.date || point.timestamp || point.x || point.month;
      const mrr = point.mrr || point.value || point.y || point.revenue;

      if (!date || mrr === undefined) return null;

      // Normalize date to YYYY-MM-DD
      const normalizedDate = new Date(date).toISOString().slice(0, 10);

      // Normalize MRR to USD cents
      // TrustMRR stores in cents, but the chart might display dollars
      let normalizedMrr = typeof mrr === "number" ? mrr : parseFloat(mrr);
      // If values look like dollars (< 100000), convert to cents
      // If values look like cents (>= 100000 for typical startups), keep as-is
      // Heuristic: if max value < 10000, it's probably dollars
      // This needs calibration based on actual data

      return { date: normalizedDate, mrr: Math.round(normalizedMrr) };
    })
    .filter(Boolean) as ScrapedMrrPoint[];
}
```

#### Approach B: Data loaded via client-side API

If the chart data comes from an XHR request, we might discover an undocumented endpoint like `GET /api/v1/startups/{slug}/mrr-history`. In that case, the scraper becomes a simple API call:

```typescript
export async function scrapeMrrHistory(slug: string): Promise<ScrapedMrrPoint[] | null> {
  try {
    // Undocumented endpoint (if discovered)
    const res = await fetch(`https://trustmrr.com/api/internal/mrr-history/${slug}`, {
      headers: {
        "User-Agent": "PolyMRR/1.0",
        // May need cookies or other auth
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return normalizeMrrData(data);
  } catch {
    return null;
  }
}
```

---

## Step 2: Storage Logic

### Add to `src/lib/sync.ts`

```typescript
import { ScrapedMrrPoint } from "./scraper";

/**
 * Store scraped MRR history points.
 * Uses upsert to avoid duplicates on (startup_slug, date).
 */
export async function storeMrrHistory(
  admin: ReturnType<typeof createAdminClient>,
  slug: string,
  points: ScrapedMrrPoint[]
) {
  if (points.length === 0) return;

  // Batch upsert (Supabase supports bulk upsert)
  const rows = points.map((p) => ({
    startup_slug: slug,
    date: p.date,
    mrr: p.mrr,
  }));

  // Upsert in chunks of 100 to avoid payload limits
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    await admin
      .from("mrr_history")
      .upsert(chunk, { onConflict: "startup_slug,date" });
  }
}
```

---

## Step 3: Scraper Cron Route

### `src/app/api/cron/scrape-mrr/route.ts`

Runs daily (or less frequently). Scrapes MRR history for startups that either:
- Have never been scraped (no rows in mrr_history)
- Haven't been scraped recently (oldest scrape > 7 days ago)

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeMrrHistory } from "@/lib/scraper";
import { storeMrrHistory } from "@/lib/sync";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Log sync start
  const { data: logEntry } = await admin
    .from("sync_log")
    .insert({ sync_type: "mrr_scrape", status: "running" })
    .select("id")
    .single();

  try {
    // Get all startup slugs
    const { data: allStartups } = await admin
      .from("startups")
      .select("slug");

    if (!allStartups || allStartups.length === 0) {
      throw new Error("No startups in database. Run full sync first.");
    }

    // Get latest scrape date per startup
    const { data: latestScrapes } = await admin
      .from("mrr_history")
      .select("startup_slug, date")
      .order("date", { ascending: false });

    // Build map: slug -> latest scraped date
    const scrapeMap = new Map<string, string>();
    for (const row of latestScrapes ?? []) {
      if (!scrapeMap.has(row.startup_slug)) {
        scrapeMap.set(row.startup_slug, row.date);
      }
    }

    // Prioritize: never scraped first, then oldest scrape
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const toScrape = allStartups
      .map((s: any) => ({
        slug: s.slug,
        lastScrape: scrapeMap.get(s.slug) ?? "1970-01-01",
      }))
      .filter((s) => s.lastScrape < sevenDaysAgo)
      .sort((a, b) => a.lastScrape.localeCompare(b.lastScrape));

    let scraped = 0;
    const maxPerRun = 50; // Limit per cron run to stay within time limit

    for (const item of toScrape.slice(0, maxPerRun)) {
      const points = await scrapeMrrHistory(item.slug);

      if (points && points.length > 0) {
        await storeMrrHistory(admin, item.slug, points);
        scraped++;
      }

      // Delay between scrapes to be respectful
      await new Promise((r) => setTimeout(r, 1000));
    }

    await admin
      .from("sync_log")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        startups_synced: scraped,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({
      ok: true,
      scraped,
      pending: Math.max(0, toScrape.length - maxPerRun),
    });
  } catch (err: any) {
    await admin
      .from("sync_log")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: err.message,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## Step 4: Vercel Cron Config

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-startups",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/sync-frequent",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/resolve-markets",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/scrape-mrr",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Scrape runs at 3 AM UTC, after the full sync (2 AM) has populated the startups table.

---

## Step 5: Fallback -- Use Snapshots as MRR History

If scraping proves unreliable or TrustMRR blocks it, we have a fallback: use our own `startup_snapshots` table as the MRR history source. After a few weeks of daily syncing, we'll have our own historical data.

Update `getMrrHistory()` in `data.ts` to fall back:

```typescript
export async function getMrrHistory(slug: string): Promise<MrrSnapshot[]> {
  const supabase = await createClient();

  // Try scraped history first
  const { data: scraped } = await supabase
    .from("mrr_history")
    .select("date, mrr")
    .eq("startup_slug", slug)
    .order("date");

  if (scraped && scraped.length > 5) {
    return scraped.map(mapMrrSnapshot);
  }

  // Fallback to our own daily snapshots
  const { data: snapshots } = await supabase
    .from("startup_snapshots")
    .select("snapshot_date, mrr")
    .eq("startup_slug", slug)
    .order("snapshot_date");

  return (snapshots ?? []).map((s: any) => ({
    date: s.snapshot_date,
    mrr: s.mrr,
  }));
}
```

---

## Error Handling & Resilience

1. **Rate limiting**: 1s delay between page fetches. Max 50 per cron run.
2. **Structure changes**: If TrustMRR redesigns their page, scraping will silently fail (returns null). The sync_log will show 0 scraped. Set up monitoring.
3. **Graceful degradation**: If no scraped data, fall back to startup_snapshots.
4. **Re-scraping**: Only re-scrape startups older than 7 days. New data points accumulate naturally.
5. **User-Agent**: Identify ourselves clearly. Consider reaching out to TrustMRR for permission or a data partnership.

---

## Important Note

**Before implementing this workstream**, manually inspect a TrustMRR startup page to determine the actual data structure. The scraping approach above is templated -- the exact selectors/paths need to be calibrated against the real page.

Steps:
1. Open `https://trustmrr.com/startups/shipfast` in browser
2. View Page Source, search for `__NEXT_DATA__` or `mrrHistory`
3. Open DevTools Network tab, reload, filter by XHR -- look for chart data requests
4. Document the actual data format found
5. Update `scraper.ts` accordingly

---

## Verification

1. Manually run `scrapeMrrHistory("shipfast")` and check returned data
2. Trigger scrape cron: check `mrr_history` table populated
3. Check `sync_log` shows scrape completed
4. Browse `/startups/shipfast`: MRR chart shows real historical data
5. Test fallback: empty `mrr_history` for a startup, verify chart uses `startup_snapshots` instead
