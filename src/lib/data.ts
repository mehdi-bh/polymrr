// ---------------------------------------------------------------------------
// Data access layer — async queries against Supabase.
// ---------------------------------------------------------------------------

import { createClient } from "@/lib/supabase/server";
import {
  mapStartup,
  mapMarket,
  mapBet,
  mapUser,
  mapLeaderboardEntry,
  mapFeedItem,
  mapMrrSnapshot,
} from "./mappers";
import type {
  Startup,
  Market,
  Bet,
  User,
  LeaderboardEntry,
  FeedItem,
  MrrSnapshot,
} from "./types";

// -- Auth -------------------------------------------------------------------

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();
  if (!data) return null;
  return mapUser(data);
}

// -- Startups ---------------------------------------------------------------

async function fetchStartupRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slugs: string[]
) {
  if (slugs.length === 0) return { techMap: new Map(), cofounderMap: new Map() };

  const [{ data: tech }, { data: cofounders }] = await Promise.all([
    supabase.from("startup_tech_stack").select("*").in("startup_slug", slugs),
    supabase.from("startup_cofounders").select("*").in("startup_slug", slugs),
  ]);

  const techMap = new Map<string, typeof tech>();
  for (const t of tech ?? []) {
    const arr = techMap.get(t.startup_slug) ?? [];
    arr.push(t);
    techMap.set(t.startup_slug, arr);
  }

  const cofounderMap = new Map<string, typeof cofounders>();
  for (const c of cofounders ?? []) {
    const arr = cofounderMap.get(c.startup_slug) ?? [];
    arr.push(c);
    cofounderMap.set(c.startup_slug, arr);
  }

  return { techMap, cofounderMap };
}

export async function getStartups(): Promise<Startup[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("startups").select("*");
  if (!rows || rows.length === 0) return [];

  const slugs = rows.map((r) => r.slug);
  const { techMap, cofounderMap } = await fetchStartupRelations(supabase, slugs);

  return rows.map((r) =>
    mapStartup(r, techMap.get(r.slug) ?? [], cofounderMap.get(r.slug) ?? [])
  );
}

export async function getStartupBySlug(slug: string): Promise<Startup | undefined> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("startups")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!row) return undefined;

  const { techMap, cofounderMap } = await fetchStartupRelations(supabase, [slug]);
  return mapStartup(row, techMap.get(slug) ?? [], cofounderMap.get(slug) ?? []);
}

export async function getStartupsByFounder(xHandle: string): Promise<Startup[]> {
  const supabase = await createClient();
  const { data: cofRows } = await supabase
    .from("startup_cofounders")
    .select("startup_slug")
    .eq("x_handle", xHandle);
  if (!cofRows || cofRows.length === 0) return [];

  const slugs = cofRows.map((r) => r.startup_slug);
  const { data: rows } = await supabase.from("startups").select("*").in("slug", slugs);
  if (!rows || rows.length === 0) return [];

  const { techMap, cofounderMap } = await fetchStartupRelations(supabase, slugs);
  return rows.map((r) =>
    mapStartup(r, techMap.get(r.slug) ?? [], cofounderMap.get(r.slug) ?? [])
  );
}

export async function getMrrHistory(slug: string): Promise<MrrSnapshot[]> {
  const supabase = await createClient();

  const { data: scraped } = await supabase
    .from("mrr_history")
    .select("date, mrr")
    .eq("startup_slug", slug)
    .order("date");

  if (scraped && scraped.length > 5) {
    return scraped.map(mapMrrSnapshot);
  }

  // Fallback: use daily snapshots when scraped data is sparse
  const { data: snapshots } = await supabase
    .from("startup_snapshots")
    .select("snapshot_date, mrr")
    .eq("startup_slug", slug)
    .order("snapshot_date");

  return (snapshots ?? []).map((s: { snapshot_date: string; mrr: number }) => ({
    date: s.snapshot_date,
    mrr: s.mrr,
  }));
}

export async function getStartupMarketStats(
  slugs: string[]
): Promise<Map<string, { activeMarketCount: number; sentiment: number }>> {
  const result = new Map<string, { activeMarketCount: number; sentiment: number }>();
  for (const slug of slugs) result.set(slug, { activeMarketCount: 0, sentiment: 50 });
  if (slugs.length === 0) return result;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("markets")
    .select("startup_slug, yes_odds")
    .in("startup_slug", slugs)
    .eq("status", "open");

  if (!rows) return result;

  const bySlug = new Map<string, number[]>();
  for (const r of rows) {
    const arr = bySlug.get(r.startup_slug) ?? [];
    arr.push(r.yes_odds);
    bySlug.set(r.startup_slug, arr);
  }

  for (const [slug, odds] of bySlug) {
    const sentiment = Math.round(odds.reduce((a, b) => a + b, 0) / odds.length);
    result.set(slug, { activeMarketCount: odds.length, sentiment });
  }

  return result;
}

export interface StartupFilters {
  category?: string;
  sort?: string;
  forSale?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

export async function getStartupsPaginated(
  filters: StartupFilters = {}
): Promise<{ data: Startup[]; total: number }> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 12;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("startups").select("*", { count: "exact" });

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters.forSale) {
    query = query.eq("on_sale", true);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    // Search cofounders and tech stack in parallel for matching slugs
    const [{ data: cofRows }, { data: techRows }] = await Promise.all([
      supabase.from("startup_cofounders").select("startup_slug").or(`x_name.ilike.${term},x_handle.ilike.${term}`),
      supabase.from("startup_tech_stack").select("startup_slug").ilike("slug", term),
    ]);
    const relatedSlugs = [...new Set([
      ...(cofRows ?? []).map((r) => r.startup_slug),
      ...(techRows ?? []).map((r) => r.startup_slug),
    ])];
    const orParts = [
      `name.ilike.${term}`,
      `description.ilike.${term}`,
      `country.ilike.${term}`,
      `x_handle.ilike.${term}`,
    ];
    if (relatedSlugs.length > 0) {
      orParts.push(`slug.in.(${relatedSlugs.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  switch (filters.sort) {
    case "growth-desc":
      query = query.order("growth_30d", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      query = query.order("founded_date", { ascending: false, nullsFirst: false });
      break;
    case "customers-desc":
      query = query.order("customers", { ascending: false, nullsFirst: false });
      break;
    case "followers-desc":
      query = query.order("x_followers", { ascending: false, nullsFirst: false });
      break;
    case "alpha":
      query = query.order("name", { ascending: true });
      break;
    case "mrr-desc":
    default:
      query = query.order("revenue_mrr", { ascending: false });
      break;
  }

  const { data: rows, count } = await query.range(from, to);
  if (!rows || rows.length === 0) return { data: [], total: count ?? 0 };

  const slugs = rows.map((r) => r.slug);
  const { techMap, cofounderMap } = await fetchStartupRelations(supabase, slugs);

  const startups = rows.map((r) =>
    mapStartup(r, techMap.get(r.slug) ?? [], cofounderMap.get(r.slug) ?? [])
  );

  return { data: startups, total: count ?? 0 };
}

export interface MarketFilters {
  status?: string;
  type?: string;
  category?: string;
  sort?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export async function getMarketsPaginated(
  filters: MarketFilters = {}
): Promise<{ data: Market[]; total: number; startups: Map<string, Startup> }> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 12;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("markets").select("*", { count: "exact" });

  if (filters.status === "closing-soon") {
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    query = query.eq("status", "open").lte("closes_at", tenDaysFromNow);
  } else if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  // Category filter requires joining with startups — filter after fetch if set
  // We'll handle this below

  if (filters.search) {
    const term = `%${filters.search}%`;
    const { data: nameRows } = await supabase.from("startups").select("slug").ilike("name", term);
    const slugMatches = (nameRows ?? []).map((r) => r.slug);
    const orParts = [`question.ilike.${term}`];
    if (slugMatches.length > 0) {
      orParts.push(`startup_slug.in.(${slugMatches.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  switch (filters.sort) {
    case "popular":
      query = query.order("total_bettors", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "biggest-pot":
      query = query.order("total_credits", { ascending: false });
      break;
    case "yes-odds-desc":
      query = query.order("yes_odds", { ascending: false });
      break;
    case "yes-odds-asc":
      query = query.order("yes_odds", { ascending: true });
      break;
    case "closing-soon":
    default:
      query = query.order("closes_at", { ascending: true });
      break;
  }

  // If category filter is set, we need to get startup slugs for that category first
  if (filters.category && filters.category !== "all") {
    const { data: catSlugs } = await supabase
      .from("startups")
      .select("slug")
      .eq("category", filters.category);
    if (!catSlugs || catSlugs.length === 0) return { data: [], total: 0, startups: new Map() };
    query = query.in("startup_slug", catSlugs.map((s) => s.slug));
  }

  const { data: rows, count } = await query.range(from, to);
  if (!rows || rows.length === 0) return { data: [], total: count ?? 0, startups: new Map() };

  const markets = rows.map(mapMarket);

  // Fetch only the startups needed for this page
  const uniqueSlugs = [...new Set(markets.map((m) => m.startupSlug))];
  const { data: startupRows } = await supabase
    .from("startups")
    .select("*")
    .in("slug", uniqueSlugs);

  const startupMap = new Map<string, Startup>();
  if (startupRows) {
    const slugs = startupRows.map((r) => r.slug);
    const { techMap, cofounderMap } = await fetchStartupRelations(supabase, slugs);
    for (const r of startupRows) {
      startupMap.set(
        r.slug,
        mapStartup(r, techMap.get(r.slug) ?? [], cofounderMap.get(r.slug) ?? [])
      );
    }
  }

  return { data: markets, total: count ?? 0, startups: startupMap };
}

// -- Markets ----------------------------------------------------------------

export async function getMarkets(): Promise<Market[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("markets").select("*").order("closes_at");
  return (data ?? []).map(mapMarket);
}

export async function getMarketById(id: string): Promise<Market | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("markets").select("*").eq("id", id).single();
  return data ? mapMarket(data) : undefined;
}

export async function getMarketsForStartup(slug: string): Promise<Market[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("markets")
    .select("*")
    .eq("startup_slug", slug)
    .order("closes_at");
  return (data ?? []).map(mapMarket);
}

export async function getOpenMarkets(): Promise<Market[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("markets")
    .select("*")
    .eq("status", "open")
    .order("closes_at");
  return (data ?? []).map(mapMarket);
}

export async function getFeaturedMarkets(): Promise<Market[]> {
  const open = await getOpenMarkets();

  const byPopularity = [...open].sort((a, b) => b.totalBettors - a.totalBettors);
  const byClosing = [...open].sort(
    (a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime()
  );
  const acquisitions = open
    .filter((m) => m.type === "acquisition")
    .sort((a, b) => b.totalBettors - a.totalBettors);

  const picked = new Set<string>();
  const result: Market[] = [];

  function pick(source: Market[], count: number) {
    for (const m of source) {
      if (picked.has(m.id)) continue;
      picked.add(m.id);
      result.push(m);
      if (result.length >= picked.size && picked.size >= count + (result.length - count))
        return;
    }
  }

  pick(byPopularity, 2);
  pick(byClosing, 2);
  pick(acquisitions, 2);
  if (result.length < 6) pick(open, 6 - result.length);

  return result.slice(0, 6);
}

// -- Bets -------------------------------------------------------------------

export async function getBetsForMarket(marketId: string): Promise<Bet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bets")
    .select("*")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapBet);
}

export async function getBetsForUser(userId: string): Promise<Bet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapBet);
}

// -- Users ------------------------------------------------------------------

export async function getUserByXHandle(xHandle: string): Promise<User | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("x_handle", xHandle)
    .single();
  return data ? mapUser(data) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  return data ? mapUser(data) : undefined;
}

// -- Leaderboard ------------------------------------------------------------

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("leaderboard").select("*");
  return (data ?? []).map(mapLeaderboardEntry);
}

// -- Feed -------------------------------------------------------------------

export async function getFeedItems(): Promise<FeedItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("feed_items").select("*");
  return (data ?? []).map(mapFeedItem);
}

// -- Quests -----------------------------------------------------------------

export async function getUserQuestCompletions(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_quest_completions")
    .select("quest_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.quest_id);
}

// -- Stats ------------------------------------------------------------------

export async function getGlobalStats() {
  const supabase = await createClient();

  const [
    { count: openMarkets },
    { count: startupsTracked },
    { count: betsPlaced },
    { data: revRow },
  ] = await Promise.all([
    supabase.from("markets").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("startups").select("*", { count: "exact", head: true }),
    supabase.from("bets").select("*", { count: "exact", head: true }),
    supabase.rpc("sum_startup_revenue").single<{ total: number }>(),
  ]);

  return {
    openMarkets: openMarkets ?? 0,
    startupsTracked: startupsTracked ?? 0,
    betsPlaced: betsPlaced ?? 0,
    totalVerifiedRevenue: revRow?.total ?? 0,
  };
}

export async function getGoogleAvatarUrl(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;
  return (authUser.user_metadata?.avatar_url as string) ?? null;
}

// -- Helpers (pure, synchronous) — re-exported from helpers.ts for convenience
export {
  formatCents,
  formatCredits,
  getStartupSentiment,
  daysUntil,
  timeAgo,
} from "./helpers";
