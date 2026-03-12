import type {
  Startup,
  Market,
  Bet,
  User,
  LeaderboardEntry,
  FeedItem,
  MrrSnapshot,
  PnlSnapshot,
  PromoSlot,
  TechStackItem,
  TrustMRRCategory,
  PaymentProvider,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapStartup(row: any, techStack: any[] = []): Startup {
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
    totalYesCredits: row.total_yes_credits ?? 0,
    totalNoCredits: row.total_no_credits ?? 0,
    totalBettors: row.total_bettors,
    createdAt: row.created_at,
    closesAt: row.closes_at,
    resolvedAt: row.resolved_at,
    resolvedOutcome: row.resolved_outcome,
    founderXHandle: row.founder_x_handle ?? null,
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
    profit: row.profit ?? (row.credits_won ?? 0) - (row.credits_lost ?? 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFeedItem(row: any): FeedItem {
  return {
    id: row.id,
    marketId: row.market_id,
    userId: row.user_id,
    userXHandle: row.user_x_handle ?? null,
    userName: row.user_name ?? null,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPromoSlot(row: any): PromoSlot {
  return {
    id: row.id,
    slotIndex: row.slot_index,
    userId: row.user_id ?? null,
    startupSlug: row.startup_slug ?? null,
    startupName: row.custom_name ?? row.startups?.name ?? null,
    startupIcon: row.custom_icon ?? row.startups?.icon ?? null,
    startupWebsite: row.custom_website ?? row.startups?.website ?? null,
    tagline: row.tagline ?? "",
    font: row.font ?? "inconsolata",
    color: row.color ?? "#f59e0b",
    status: row.status,
    expiresAt: row.expires_at ?? null,
  };
}
