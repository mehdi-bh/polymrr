# WS3: TrustMRR Data Sync

> Implementation spec for Claude. Execute step-by-step.

---

## Overview

Fetch startup data from the TrustMRR API and store it in Supabase. Two cron jobs:
1. **Daily full sync** -- fetch ALL startups, upsert into `startups` table, store daily snapshots
2. **Frequent sync (every 30min)** -- fetch only recently listed startups to catch new additions quickly

Both run as Vercel cron routes with 300s max execution time.

---

## TrustMRR API Reference

**Base URL**: `https://trustmrr.com/api/v1`
**Auth**: `Authorization: Bearer {TRUSTMRR_API_KEY}`

### List endpoint: `GET /startups`
- Paginated: `page`, `limit` (max 50)
- Sort: `revenue-desc`, `listed-desc`, `growth-desc`, etc.
- Filters: `onSale`, `category`, `minRevenue`, `maxRevenue`, `xHandle`, etc.
- Response: `{ data: Startup[], meta: { total, page, limit, hasMore } }`

### Detail endpoint: `GET /startups/{slug}`
- Returns full startup data including `techStack[]`, `cofounders[]`, `xFollowerCount`, `isMerchantOfRecord`
- The list endpoint does NOT return these fields

**Important**: The list endpoint returns truncated descriptions and omits techStack/cofounders/xFollowerCount/isMerchantOfRecord. The detail endpoint has everything. For a full sync we need to hit the detail endpoint for each startup.

---

## Environment Variables

```
TRUSTMRR_API_KEY=tmrr_xxx
CRON_SECRET=xxx  # Vercel cron auth
```

---

## Step 1: TrustMRR API Client

### `src/lib/trustmrr.ts`

```typescript
const BASE_URL = "https://trustmrr.com/api/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.TRUSTMRR_API_KEY}`,
  };
}

export interface TrustMRRListResponse {
  data: any[];
  meta: { total: number; page: number; limit: number; hasMore: boolean };
}

/** Fetch a paginated list of startups */
export async function listStartups(params: {
  page?: number;
  limit?: number;
  sort?: string;
  onSale?: string;
}): Promise<TrustMRRListResponse> {
  const url = new URL(`${BASE_URL}/startups`);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.onSale) url.searchParams.set("onSale", params.onSale);

  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`TrustMRR list error: ${res.status}`);
  return res.json();
}

/** Fetch full details for a single startup */
export async function getStartupDetail(slug: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/startups/${slug}`, { headers: headers() });
  if (!res.ok) throw new Error(`TrustMRR detail error: ${res.status} for ${slug}`);
  const { data } = await res.json();
  return data;
}

/** Fetch all startups (paginate through everything) */
export async function fetchAllStartups(): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await listStartups({ page, limit: 50, sort: "revenue-desc" });
    all.push(...res.data);
    hasMore = res.meta.hasMore;
    page++;

    // Respect rate limits -- small delay between pages
    await new Promise((r) => setTimeout(r, 200));
  }

  return all;
}
```

---

## Step 2: Upsert Logic

### `src/lib/sync.ts`

Handles mapping TrustMRR API response to our database schema and upserting.

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Upsert a startup from TrustMRR API detail response into our DB.
 * Also handles tech_stack and cofounders.
 */
export async function upsertStartup(admin: ReturnType<typeof createAdminClient>, data: any) {
  // Upsert main startup row
  await admin.from("startups").upsert(
    {
      slug: data.slug,
      name: data.name,
      icon: data.icon,
      description: data.description,
      website: data.website,
      country: data.country,
      founded_date: data.foundedDate,
      category: data.category,
      payment_provider: data.paymentProvider,
      target_audience: data.targetAudience,
      revenue_last_30_days: data.revenue.last30Days,
      mrr: data.revenue.mrr,
      revenue_total: data.revenue.total,
      customers: data.customers,
      active_subscriptions: data.activeSubscriptions,
      asking_price: data.askingPrice,
      profit_margin_last_30d: data.profitMarginLast30Days,
      growth_30d: data.growth30d,
      multiple: data.multiple,
      on_sale: data.onSale,
      first_listed_for_sale_at: data.firstListedForSaleAt,
      x_handle: data.xHandle,
      x_follower_count: data.xFollowerCount ?? null,
      is_merchant_of_record: data.isMerchantOfRecord ?? false,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );

  // Replace tech stack (delete + insert is simplest for small arrays)
  if (data.techStack) {
    await admin.from("startup_tech_stack").delete().eq("startup_slug", data.slug);
    if (data.techStack.length > 0) {
      await admin.from("startup_tech_stack").insert(
        data.techStack.map((t: any) => ({
          startup_slug: data.slug,
          tech_slug: t.slug,
          category: t.category,
        }))
      );
    }
  }

  // Replace cofounders
  if (data.cofounders) {
    await admin.from("startup_cofounders").delete().eq("startup_slug", data.slug);
    if (data.cofounders.length > 0) {
      await admin.from("startup_cofounders").insert(
        data.cofounders.map((c: any) => ({
          startup_slug: data.slug,
          x_handle: c.xHandle,
          x_name: c.xName,
        }))
      );
    }
  }
}

/**
 * Store a daily snapshot for a startup.
 * Uses upsert on (startup_slug, snapshot_date) to avoid duplicates.
 */
export async function storeSnapshot(admin: ReturnType<typeof createAdminClient>, data: any) {
  const today = new Date().toISOString().slice(0, 10);

  await admin.from("startup_snapshots").upsert(
    {
      startup_slug: data.slug,
      snapshot_date: today,
      mrr: data.revenue.mrr,
      revenue_last_30_days: data.revenue.last30Days,
      revenue_total: data.revenue.total,
      customers: data.customers,
      active_subscriptions: data.activeSubscriptions,
      growth_30d: data.growth30d,
      on_sale: data.onSale,
      asking_price: data.askingPrice,
    },
    { onConflict: "startup_slug,snapshot_date" }
  );
}
```

---

## Step 3: Daily Full Sync Cron

### `src/app/api/cron/sync-startups/route.ts`

Runs once per day. Fetches ALL startups from TrustMRR, upserts each, stores daily snapshot.

**Strategy for Vercel's 300s limit**:
- The list endpoint is fast (paginated, 50 per page)
- Detail endpoint: ~200ms per call + 200ms delay = ~400ms per startup
- With 300s limit: ~750 startups max per run
- If TrustMRR has more, we paginate across multiple cron invocations using a cursor stored in sync_log

For MVP (likely <500 startups), a single run should suffice.

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllStartups, getStartupDetail } from "@/lib/trustmrr";
import { upsertStartup, storeSnapshot } from "@/lib/sync";
import { NextResponse } from "next/server";

export const maxDuration = 300; // Vercel Pro limit

export async function POST(request: Request) {
  // Verify cron auth
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Log sync start
  const { data: logEntry } = await admin
    .from("sync_log")
    .insert({ sync_type: "full_daily", status: "running" })
    .select("id")
    .single();

  try {
    // Step 1: Fetch all startups from list endpoint
    const startupList = await fetchAllStartups();

    let synced = 0;

    // Step 2: For each startup, fetch details and upsert
    for (const item of startupList) {
      try {
        const detail = await getStartupDetail(item.slug);
        await upsertStartup(admin, detail);
        await storeSnapshot(admin, detail);
        synced++;

        // Rate limit protection
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        // Log individual failure but continue
        console.error(`Failed to sync ${item.slug}:`, err);
      }
    }

    // Step 3: Generate system markets for newly synced startups
    // (calls function from WS2 spec)
    // await generateSystemMarkets(admin, startupList);

    // Update sync log
    await admin
      .from("sync_log")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        startups_synced: synced,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({ ok: true, synced, total: startupList.length });
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

## Step 4: Frequent Sync (30min)

### `src/app/api/cron/sync-frequent/route.ts`

Catches newly listed startups. Fetches the most recently listed startups and any that have changed sale status.

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { listStartups, getStartupDetail } from "@/lib/trustmrr";
import { upsertStartup, storeSnapshot } from "@/lib/sync";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Log sync start
  const { data: logEntry } = await admin
    .from("sync_log")
    .insert({ sync_type: "frequent_30min", status: "running" })
    .select("id")
    .single();

  try {
    // Fetch most recently listed startups (last 2 pages)
    const page1 = await listStartups({ page: 1, limit: 50, sort: "listed-desc" });
    const page2 = await listStartups({ page: 2, limit: 50, sort: "listed-desc" });
    const recentStartups = [...page1.data, ...page2.data];

    // Check which ones we don't have yet or have stale data (synced > 30min ago)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: existingSlugs } = await admin
      .from("startups")
      .select("slug, synced_at")
      .in("slug", recentStartups.map((s) => s.slug));

    const existingMap = new Map(
      (existingSlugs ?? []).map((s: any) => [s.slug, s.synced_at])
    );

    let synced = 0;

    for (const item of recentStartups) {
      const lastSync = existingMap.get(item.slug);
      // Sync if: new startup OR synced more than 30min ago
      if (!lastSync || lastSync < thirtyMinAgo) {
        try {
          const detail = await getStartupDetail(item.slug);
          await upsertStartup(admin, detail);
          // Only store snapshot if we don't have one for today yet
          await storeSnapshot(admin, detail);
          synced++;
          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          console.error(`Frequent sync failed for ${item.slug}:`, err);
        }
      }
    }

    await admin
      .from("sync_log")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        startups_synced: synced,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({ ok: true, synced, checked: recentStartups.length });
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

## Step 5: Vercel Cron Config

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
    }
  ]
}
```

Schedule notes:
- Full sync: 2:00 AM UTC daily (low traffic, after TrustMRR likely updates)
- Frequent sync: every 30 minutes
- Market resolution: midnight UTC daily

---

## Step 6: Database Optimization for Snapshots

The `startup_snapshots` table will grow daily. For efficient querying:

1. **Primary query pattern**: "Get all snapshots for startup X ordered by date" -- covered by `idx_snapshots_slug_date`
2. **Cleanup**: After 1 year, consider aggregating old snapshots to weekly/monthly
3. **Partition**: If table grows very large (>1M rows), partition by `snapshot_date` range

For now, the index is sufficient. At 500 startups x 365 days = 182,500 rows/year.

---

## Data Flow Summary

```
TrustMRR API
    |
    v
[Daily Cron 2am UTC]                    [30min Cron]
    |                                        |
    +-- fetchAllStartups() (list)      +-- listStartups(sort=listed-desc)
    |   |                              |   |
    |   +-- getStartupDetail(slug)     |   +-- getStartupDetail(slug)
    |       for each startup           |       for new/stale only
    |                                  |
    v                                  v
upsertStartup() --> startups table (latest)
storeSnapshot() --> startup_snapshots table (daily history)
    |
    v
generateSystemMarkets() --> markets table (new prediction markets)
```

---

## Verification

1. Manually trigger `POST /api/cron/sync-startups` with correct auth header
2. Check `startups` table has rows populated from TrustMRR
3. Check `startup_snapshots` has today's date entries
4. Check `startup_tech_stack` and `startup_cofounders` are populated
5. Check `sync_log` shows completed entry
6. Trigger again: should upsert (not duplicate), snapshot should upsert (same date)
7. Browse `/startups` page: real startups appear
8. Browse `/startups/[slug]`: full detail page with real data
9. Trigger frequent sync: only new/stale startups fetched
