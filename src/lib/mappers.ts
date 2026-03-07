import type {
  Startup,
  Market,
  Bet,
  User,
  LeaderboardEntry,
  FeedItem,
  MrrSnapshot,
  PnlSnapshot,
  TechStackItem,
  Cofounder,
  TrustMRRCategory,
  PaymentProvider,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapStartup(row: any, techStack: any[], cofounders: any[]): Startup {
  return {
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    description: row.description,
    website: row.website,
    country: row.country,
    foundedDate: row.founded_date,
    category: row.category as TrustMRRCategory | null,
    paymentProvider: (row.payment_provider ?? "stripe") as PaymentProvider,
    targetAudience: row.target_audience,
    revenue: {
      last30Days: row.revenue_last_30_days,
      mrr: row.revenue_mrr,
      total: row.revenue_total,
    },
    customers: row.customers,
    activeSubscriptions: row.active_subscriptions,
    askingPrice: row.asking_price,
    profitMarginLast30Days: row.profit_margin_last_30_days,
    growth30d: row.growth_30d,
    multiple: row.multiple,
    onSale: row.on_sale,
    firstListedForSaleAt: row.first_listed_for_sale_at,
    xHandle: row.x_handle,
    xFollowerCount: row.x_follower_count,
    isMerchantOfRecord: row.is_merchant_of_record,
    techStack: techStack.map(
      (t): TechStackItem => ({ slug: t.slug, category: t.category })
    ),
    cofounders: cofounders.map(
      (c): Cofounder => ({ xHandle: c.x_handle, xName: c.x_name })
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMarket(row: any): Market {
  return {
    id: row.id,
    startupSlug: row.startup_slug,
    type: row.type,
    question: row.question,
    resolutionCriteria: row.resolution_criteria,
    resolutionConfig: row.resolution_config ?? null,
    createdBy: row.created_by ?? null,
    status: row.status,
    yesOdds: row.yes_odds,
    yesShares: row.yes_shares ?? 0,
    noShares: row.no_shares ?? 0,
    liquidityParam: row.liquidity_param ?? 100,
    totalCredits: row.total_credits,
    totalBettors: row.total_bettors,
    createdAt: row.created_at,
    closesAt: row.closes_at,
    resolvedAt: row.resolved_at,
    resolvedOutcome: row.resolved_outcome,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBet(row: any): Bet {
  return {
    id: row.id,
    marketId: row.market_id,
    userId: row.user_id,
    side: row.side,
    amount: row.amount,
    shares: row.shares ?? null,
    oddsAtTime: row.odds_at_time,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapUser(row: any): User {
  return {
    id: row.id,
    xHandle: row.x_handle ?? "",
    xName: row.x_name ?? "Anonymous",
    avatarUrl: row.avatar_url ?? "",
    credits: row.credits,
    joinedAt: row.joined_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapLeaderboardEntry(row: any): LeaderboardEntry {
  return {
    userId: row.user_id,
    xHandle: row.x_handle ?? "",
    xName: row.x_name ?? "Anonymous",
    avatarUrl: row.avatar_url ?? "",
    winRate: row.win_rate,
    totalPredictions: row.total_predictions,
    creditsWon: row.credits_won,
    creditsLost: row.credits_lost,
    currentStreak: row.current_streak,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFeedItem(row: any): FeedItem {
  return {
    id: row.id,
    marketId: row.market_id,
    userXHandle: row.user_x_handle,
    side: row.side,
    startupName: row.startup_name,
    marketQuestion: row.market_question,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMrrSnapshot(row: any): MrrSnapshot {
  return { date: row.date, mrr: row.mrr };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPnlSnapshot(row: any): PnlSnapshot {
  return { date: row.date, value: row.value };
}
