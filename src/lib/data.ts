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
