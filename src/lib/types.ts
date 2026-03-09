// ---------------------------------------------------------------------------
// Domain types for PolyMRR
// Mirrors TrustMRR API shapes where applicable so the mock → real transition
// is a straight swap of the data source.
// ---------------------------------------------------------------------------

// -- TrustMRR API shapes ----------------------------------------------------

export type TrustMRRCategory =
  | "ai"
  | "saas"
  | "developer-tools"
  | "fintech"
  | "marketing"
  | "ecommerce"
  | "productivity"
  | "design-tools"
  | "no-code"
  | "analytics"
  | "crypto-web3"
  | "education"
  | "health-fitness"
  | "social-media"
  | "content-creation"
  | "sales"
  | "customer-support"
  | "recruiting"
  | "real-estate"
  | "travel"
  | "legal"
  | "security"
  | "iot-hardware"
  | "green-tech"
  | "entertainment"
  | "games"
  | "community"
  | "news-magazines"
  | "utilities"
  | "marketplace"
  | "mobile-apps";

export type PaymentProvider =
  | "stripe"
  | "lemonsqueezy"
  | "polar"
  | "revenuecat"
  | "dodopayment";

export interface TechStackItem {
  slug: string;
  category: string;
}

/** Matches the TrustMRR GET /api/v1/startups/{slug} response shape */
export interface Startup {
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
  foundedDate: string | null;
  category: TrustMRRCategory | null;
  paymentProvider: PaymentProvider;
  targetAudience: "b2b" | "b2c" | "both" | null;
  revenue: {
    last30Days: number; // USD cents
    mrr: number; // USD cents
    total: number; // USD cents
  };
  customers: number;
  activeSubscriptions: number;
  askingPrice: number | null; // USD cents
  profitMarginLast30Days: number | null;
  growth30d: number | null; // decimal, e.g. 0.12 = 12%
  multiple: number | null;
  onSale: boolean;
  firstListedForSaleAt: string | null;
  xHandle: string | null;
  xFollowerCount: number | null;
  isMerchantOfRecord: boolean;
  techStack: TechStackItem[];
}

// -- PolyMRR domain models --------------------------------------------------

export type MarketType = "mrr-target" | "acquisition" | "founder";
export type MarketStatus = "open" | "closed" | "resolved";

export interface Market {
  id: string;
  startupSlug: string;
  type: MarketType;
  question: string;
  resolutionCriteria: string;
  resolutionConfig: ResolutionConfig | null;
  createdBy: string | null;
  status: MarketStatus;
  yesOdds: number; // 0-100
  yesShares: number;
  noShares: number;
  liquidityParam: number;
  totalCredits: number;
  totalYesCredits: number;
  totalNoCredits: number;
  totalBettors: number;
  createdAt: string;
  closesAt: string;
  resolvedAt: string | null;
  resolvedOutcome: "yes" | "no" | null;
  founderXHandle: string | null;
}

export interface ResolutionConfig {
  metric: string;
  condition: string;
  target: number;
  dbColumn: string;
}

export interface Bet {
  id: string;
  marketId: string;
  userId: string;
  side: "yes" | "no";
  amount: number; // credits
  shares: number | null;
  oddsAtTime: number;
  createdAt: string;
}

export interface User {
  id: string;
  xHandle: string;
  xName: string;
  avatarUrl: string;
  credits: number;
  joinedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  xHandle: string;
  xName: string;
  avatarUrl: string;
  winRate: number; // 0-100
  totalPredictions: number;
  creditsWon: number;
  creditsLost: number;
  currentStreak: number;
}

/** A single point in the MRR history chart */
export interface MrrSnapshot {
  date: string;
  mrr: number; // USD cents
}

/** A single point in the P&L / net worth history chart */
export interface PnlSnapshot {
  date: string;
  value: number; // credits
}

/** Live feed item displayed on landing page */
export interface FeedItem {
  id: string;
  marketId: string;
  userId: string;
  userXHandle: string | null;
  userName: string | null;
  side: "yes" | "no";
  startupName: string;
  marketQuestion: string;
  amount: number;
  createdAt: string;
}
