// ---------------------------------------------------------------------------
// Data access layer — thin wrapper over mock data.
// When switching to a real backend, replace the bodies of these functions
// with API calls or DB queries. The signatures stay the same.
// ---------------------------------------------------------------------------

import { startups, mrrHistories, markets, users, bets, leaderboard, feedItems, currentUser } from "./mock";
import type { Startup, Market, Bet, User, LeaderboardEntry, FeedItem, MrrSnapshot, MarketType, MarketStatus, TrustMRRCategory } from "./types";

// -- Auth -------------------------------------------------------------------

export function getCurrentUser(): User | null {
  return currentUser;
}

// -- Startups ---------------------------------------------------------------

export function getStartups(): Startup[] {
  return startups;
}

export function getStartupBySlug(slug: string): Startup | undefined {
  return startups.find((s) => s.slug === slug);
}

export function getStartupsByFounder(xHandle: string): Startup[] {
  return startups.filter((s) => s.cofounders.some((c) => c.xHandle === xHandle));
}

export function getMrrHistory(slug: string): MrrSnapshot[] {
  return mrrHistories[slug] ?? [];
}

// -- Markets ----------------------------------------------------------------

export function getMarkets(): Market[] {
  return markets;
}

export function getMarketById(id: string): Market | undefined {
  return markets.find((m) => m.id === id);
}

export function getMarketsForStartup(slug: string): Market[] {
  return markets.filter((m) => m.startupSlug === slug);
}

export function getOpenMarkets(): Market[] {
  return markets.filter((m) => m.status === "open");
}

export function getFilteredMarkets(filters: {
  status?: MarketStatus | "closing-soon";
  type?: MarketType;
  category?: TrustMRRCategory;
  sort?: "popular" | "closing-soon" | "newest" | "biggest-pot";
}): Market[] {
  let result = [...markets];

  if (filters.status === "closing-soon") {
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    result = result.filter(
      (m) => m.status === "open" && new Date(m.closesAt).getTime() - Date.now() < tenDays
    );
  } else if (filters.status) {
    result = result.filter((m) => m.status === filters.status);
  }

  if (filters.type) {
    result = result.filter((m) => m.type === filters.type);
  }

  if (filters.category) {
    result = result.filter((m) => {
      const startup = getStartupBySlug(m.startupSlug);
      return startup?.category === filters.category;
    });
  }

  switch (filters.sort) {
    case "popular":
      result.sort((a, b) => b.totalBettors - a.totalBettors);
      break;
    case "closing-soon":
      result.sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
      break;
    case "newest":
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "biggest-pot":
      result.sort((a, b) => b.totalCredits - a.totalCredits);
      break;
    default:
      result.sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
  }

  return result;
}

/** Featured markets for the landing page: 2 popular, 2 closing soon, 2 acquisition */
export function getFeaturedMarkets(): Market[] {
  const open = getOpenMarkets();
  const byPopularity = [...open].sort((a, b) => b.totalBettors - a.totalBettors);
  const byClosing = [...open].sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
  const acquisitions = open.filter((m) => m.type === "acquisition").sort((a, b) => b.totalBettors - a.totalBettors);

  const picked = new Set<string>();
  const result: Market[] = [];

  function pick(source: Market[], count: number) {
    for (const m of source) {
      if (picked.has(m.id)) continue;
      picked.add(m.id);
      result.push(m);
      if (result.length - (result.length - count) >= count) return;
      if (picked.size >= result.length) return;
    }
  }

  const startLen = result.length;
  pick(byPopularity, 2);
  pick(byClosing, 2);
  pick(acquisitions, 2);

  // Fill remaining slots if needed
  if (result.length < 6) pick(open, 6 - result.length);

  void startLen;
  return result.slice(0, 6);
}

// -- Bets -------------------------------------------------------------------

export function getBetsForMarket(marketId: string): Bet[] {
  return bets.filter((b) => b.marketId === marketId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getBetsForUser(userId: string): Bet[] {
  return bets.filter((b) => b.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// -- Users ------------------------------------------------------------------

export function getUserByXHandle(xHandle: string): User | undefined {
  return users.find((u) => u.xHandle === xHandle);
}

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

// -- Leaderboard ------------------------------------------------------------

export function getLeaderboard(): LeaderboardEntry[] {
  return leaderboard;
}

// -- Feed -------------------------------------------------------------------

export function getFeedItems(): FeedItem[] {
  return feedItems;
}

// -- Stats ------------------------------------------------------------------

export function getGlobalStats() {
  return {
    openMarkets: getOpenMarkets().length,
    startupsTracked: startups.length,
    betsPlaced: bets.length,
    totalVerifiedRevenue: startups.reduce((sum, s) => sum + s.revenue.total, 0),
  };
}

// -- Helpers ----------------------------------------------------------------

/** Format USD cents to human-readable string */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(dollars >= 10_000 ? 0 : 1)}k`;
  return `$${dollars.toFixed(0)}`;
}

/** Format credits with commas */
export function formatCredits(n: number): string {
  return n.toLocaleString() + "cr";
}

/** Compute sentiment across open markets for a startup (0-100, bullish %) */
export function getStartupSentiment(slug: string): number {
  const openMarkets = getMarketsForStartup(slug).filter((m) => m.status === "open");
  if (openMarkets.length === 0) return 50;
  const avg = openMarkets.reduce((sum, m) => sum + m.yesOdds, 0) / openMarkets.length;
  return Math.round(avg);
}

/** Days remaining until a date */
export function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/** Time ago string */
export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
