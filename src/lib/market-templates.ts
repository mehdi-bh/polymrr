// ---------------------------------------------------------------------------
// Market Template Registry — structured market creation & resolution
// ---------------------------------------------------------------------------

import { formatCents } from "./helpers";
import type { Startup } from "./types";

export type MetricId =
  | "mrr"
  | "revenue_30d"
  | "revenue_total"
  | "on_sale"
  | "founder_revenue"
  | "founder_startups"
  | "founder_followers"
  | "founder_top_startup";

export type ConditionId = "gte" | "lte" | "eq";

export type MarketType = "mrr-target" | "acquisition" | "founder";

export interface ResolutionConfig {
  metric: MetricId;
  condition: ConditionId;
  target: number;
  dbColumn: string;
}

export interface MarketBlueprint {
  startupSlug: string;
  metric: MetricId;
  condition: ConditionId;
  target: number;
  closesAt: string;
  seedSide: "yes" | "no";
  seedAmount: number;
  founderXHandle?: string;
}

export interface MetricDef {
  id: MetricId;
  dbColumn: string;
  unit: "cents" | "count" | "percent" | "boolean";
  label: string;
  validConditions: ConditionId[];
  marketType: MarketType;
}

export const METRICS: Record<MetricId, MetricDef> = {
  mrr: {
    id: "mrr",
    dbColumn: "revenue_mrr",
    unit: "cents",
    label: "MRR",
    validConditions: ["gte", "lte"],
    marketType: "mrr-target",
  },
  revenue_30d: {
    id: "revenue_30d",
    dbColumn: "revenue_last_30_days",
    unit: "cents",
    label: "30d Revenue",
    validConditions: ["gte", "lte"],
    marketType: "mrr-target",
  },
  revenue_total: {
    id: "revenue_total",
    dbColumn: "revenue_total",
    unit: "cents",
    label: "Total Revenue",
    validConditions: ["gte"],
    marketType: "mrr-target",
  },
  on_sale: {
    id: "on_sale",
    dbColumn: "on_sale",
    unit: "boolean",
    label: "Listed for Sale",
    validConditions: ["eq"],
    marketType: "acquisition",
  },
  founder_revenue: {
    id: "founder_revenue",
    dbColumn: "revenue_total",
    unit: "cents",
    label: "Total Revenue",
    validConditions: ["gte"],
    marketType: "founder",
  },
  founder_startups: {
    id: "founder_startups",
    dbColumn: "startup_count",
    unit: "count",
    label: "Startups",
    validConditions: ["gte"],
    marketType: "founder",
  },
  founder_followers: {
    id: "founder_followers",
    dbColumn: "x_follower_count",
    unit: "count",
    label: "X Followers",
    validConditions: ["gte", "lte"],
    marketType: "founder",
  },
  founder_top_startup: {
    id: "founder_top_startup",
    dbColumn: "revenue_total",
    unit: "boolean",
    label: "Top Startup",
    validConditions: ["eq"],
    marketType: "founder",
  },
};

const CONDITION_LABELS: Record<ConditionId, string> = {
  gte: "reach or exceed",
  lte: "drop below or stay under",
  eq: "be",
};

const CONDITIONS: Record<ConditionId, (actual: number, target: number) => boolean> = {
  gte: (actual, target) => actual >= target,
  lte: (actual, target) => actual <= target,
  eq: (actual, target) => actual === target,
};

function formatTarget(target: number, unit: MetricDef["unit"]): string {
  switch (unit) {
    case "cents":
      return formatCents(target);
    case "count":
      return target.toLocaleString();
    case "percent":
      return `${target.toFixed(1)}%`;
    case "boolean":
      return target === 1 ? "yes" : "no";
  }
}

export function generateQuestion(blueprint: MarketBlueprint, startupName: string): string {
  const metric = METRICS[blueprint.metric];
  const founderHandle = blueprint.founderXHandle ? `@${blueprint.founderXHandle}` : startupName;

  if (blueprint.metric === "founder_top_startup") {
    return `Will ${startupName} be ${founderHandle}'s #1 startup by revenue?`;
  }
  if (blueprint.metric === "founder_revenue") {
    const targetStr = formatTarget(blueprint.target, metric.unit);
    return `Will ${founderHandle} reach ${targetStr} total revenue?`;
  }
  if (blueprint.metric === "founder_startups") {
    const targetStr = formatTarget(blueprint.target, metric.unit);
    return `Will ${founderHandle} have ${targetStr}+ startups?`;
  }
  if (blueprint.metric === "founder_followers") {
    const targetStr = formatTarget(blueprint.target, metric.unit);
    const condLabel = blueprint.condition === "gte" ? "reach" : "drop below";
    return `Will ${founderHandle} ${condLabel} ${targetStr} X followers?`;
  }
  if (metric.unit === "boolean") {
    return `Will ${startupName} be listed for sale?`;
  }
  const condLabel = blueprint.condition === "gte" ? "reach" : "drop below";
  const targetStr = formatTarget(blueprint.target, metric.unit);
  return `Will ${startupName} ${condLabel} ${targetStr} ${metric.label}?`;
}

export function generateCriteria(blueprint: MarketBlueprint, startupName: string): string {
  const metric = METRICS[blueprint.metric];
  const targetStr = formatTarget(blueprint.target, metric.unit);
  const founderHandle = blueprint.founderXHandle ? `@${blueprint.founderXHandle}` : startupName;

  if (blueprint.metric === "founder_top_startup") {
    return `Resolves YES if ${startupName} has the highest total revenue among ${founderHandle}'s startups by close date. Data from TrustMRR.`;
  }
  if (blueprint.metric.startsWith("founder_")) {
    return `Resolves YES if ${founderHandle}'s ${metric.label} ${CONDITION_LABELS[blueprint.condition]} ${targetStr} by close date. Data from TrustMRR.`;
  }
  return `Resolves YES if ${startupName}'s ${metric.label} ${CONDITION_LABELS[blueprint.condition]} ${targetStr} by close date. Data from TrustMRR.`;
}

export function buildResolutionConfig(blueprint: MarketBlueprint): ResolutionConfig {
  const metric = METRICS[blueprint.metric];
  return {
    metric: blueprint.metric,
    condition: blueprint.condition,
    target: blueprint.target,
    dbColumn: metric.dbColumn,
  };
}

export function isFounderMetric(metric: MetricId): boolean {
  return metric.startsWith("founder_");
}

export const FOUNDER_METRICS = Object.values(METRICS).filter((m) => m.marketType === "founder");
export const STARTUP_METRICS = Object.values(METRICS).filter((m) => m.marketType !== "founder");

export function validateBlueprint(blueprint: MarketBlueprint): string | null {
  const metric = METRICS[blueprint.metric];
  if (!metric) return `Unknown metric: ${blueprint.metric}`;

  if (isFounderMetric(blueprint.metric) && !blueprint.founderXHandle) {
    return "Founder markets require a founder handle";
  }

  if (!metric.validConditions.includes(blueprint.condition)) {
    return `Condition "${blueprint.condition}" is not valid for metric "${metric.label}"`;
  }

  if (metric.unit === "boolean") {
    if (blueprint.target !== 1 && blueprint.target !== 0) {
      return "Boolean targets must be 0 or 1";
    }
  } else if (blueprint.target <= 0) {
    return "Target must be positive";
  }

  const closesAt = new Date(blueprint.closesAt);
  const now = new Date();
  const diffDays = (closesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "Deadline must be at least 1 day from now";
  if (diffDays > 365) return "Deadline must be within 1 year";

  if (blueprint.seedAmount < 100) return "Seed bet must be at least 100 credits";

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findDuplicate(supabase: any, blueprint: MarketBlueprint): Promise<boolean> {
  const closesDate = new Date(blueprint.closesAt).toISOString().split("T")[0];
  const dayStart = `${closesDate}T00:00:00Z`;
  const dayEnd = `${closesDate}T23:59:59Z`;

  let query = supabase
    .from("markets")
    .select("id")
    .filter("resolution_config->>metric", "eq", blueprint.metric)
    .filter("resolution_config->>condition", "eq", blueprint.condition)
    .filter("resolution_config->>target", "eq", String(blueprint.target))
    .gte("closes_at", dayStart)
    .lte("closes_at", dayEnd)
    .limit(1);

  // For founder markets, dedup by founder handle (not startup_slug, which is just an anchor)
  // For founder_top_startup, also check startup_slug since it matters
  if (blueprint.founderXHandle) {
    query = query.eq("founder_x_handle", blueprint.founderXHandle);
    if (blueprint.metric === "founder_top_startup") {
      query = query.eq("startup_slug", blueprint.startupSlug);
    }
  } else {
    query = query.eq("startup_slug", blueprint.startupSlug);
  }

  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// ---------------------------------------------------------------------------
// Metric descriptions (for tooltips)
// ---------------------------------------------------------------------------

export const METRIC_DESCRIPTIONS: Record<MetricId, string> = {
  mrr: "Monthly Recurring Revenue from active subscriptions",
  revenue_30d: "Total revenue in the last 30 days, including one-time sales",
  revenue_total: "All-time total revenue since launch",
  on_sale: "Whether the startup is listed for sale on a marketplace",
  founder_revenue: "Total revenue across all of this founder's startups",
  founder_startups: "Number of startups this founder is building",
  founder_followers: "The founder's X follower count",
  founder_top_startup: "Which startup will be the founder's highest-revenue product",
};

// ---------------------------------------------------------------------------
// Bet suggestions
// ---------------------------------------------------------------------------

export interface BetSuggestion {
  label: string;
  description: string;
  metric: MetricId;
  condition: ConditionId;
  target: number; // DB units (cents, decimal, count)
  daysFromNow: number;
}

function niceRoundCents(v: number): number {
  if (v >= 100_000) return Math.round(v / 25_000) * 25_000;
  if (v >= 10_000) return Math.round(v / 5_000) * 5_000;
  if (v >= 1_000) return Math.round(v / 500) * 500;
  if (v >= 100) return Math.round(v / 50) * 50;
  return Math.round(v / 10) * 10;
}

function niceRoundCount(n: number): number {
  if (n >= 10_000) return Math.round(n / 5_000) * 5_000;
  if (n >= 1_000) return Math.round(n / 500) * 500;
  if (n >= 100) return Math.round(n / 50) * 50;
  return Math.round(n / 10) * 10;
}

export function generateSuggestions(startup: Startup): BetSuggestion[] {
  const suggestions: BetSuggestion[] = [];
  const mrr = startup.revenue.mrr;
  const growth = startup.growth30d ?? 0;

  // 1. Optimistic MRR target (3 months)
  if (mrr > 0) {
    const projected = mrr * Math.pow(1 + Math.max(growth, 5) / 100, 3);
    const target = niceRoundCents(Math.round(projected * 1.15));
    suggestions.push({
      label: `Reach ${formatCents(target)} MRR`,
      description: `Currently ${formatCents(mrr)}, ${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%/mo`,
      metric: "mrr",
      condition: "gte",
      target,
      daysFromNow: 90,
    });
  }

  // 2. Bearish / drop bet
  if (mrr > 0) {
    const target = niceRoundCents(Math.round(mrr * 0.7));
    suggestions.push({
      label: `Drop below ${formatCents(target)} MRR`,
      description: "Testing the downside risk",
      metric: "mrr",
      condition: "lte",
      target,
      daysFromNow: 180,
    });
  }

  // 4. Listed for sale (if not already)
  if (!startup.onSale) {
    suggestions.push({
      label: "Listed for sale",
      description: "Will they put it on the market?",
      metric: "on_sale",
      condition: "eq",
      target: 1,
      daysFromNow: 180,
    });
  }

  return suggestions.slice(0, 4);
}

export function generateFounderSuggestions(
  founderXHandle: string,
  startups: Startup[]
): BetSuggestion[] {
  const suggestions: BetSuggestion[] = [];
  const totalRevenue = startups.reduce((sum, s) => sum + s.revenue.total, 0);
  const totalFollowers = Math.max(...startups.map((s) => s.xFollowerCount ?? 0));

  // Revenue milestone
  if (totalRevenue > 0) {
    const target = niceRoundCents(Math.round(totalRevenue * 1.5));
    suggestions.push({
      label: `Reach ${formatCents(target)} total revenue`,
      description: `Currently ${formatCents(totalRevenue)} across ${startups.length} startups`,
      metric: "founder_revenue",
      condition: "gte",
      target,
      daysFromNow: 90,
    });
  }

  // Ship another startup
  if (startups.length > 0) {
    suggestions.push({
      label: `Ship ${startups.length + 1}+ startups`,
      description: `Currently building ${startups.length} startup${startups.length !== 1 ? "s" : ""}`,
      metric: "founder_startups",
      condition: "gte",
      target: startups.length + 1,
      daysFromNow: 90,
    });
  }

  // Follower milestone
  if (totalFollowers > 100) {
    const target = niceRoundCount(Math.round(totalFollowers * 1.5));
    suggestions.push({
      label: `Reach ${target.toLocaleString()} X followers`,
      description: `Currently ${totalFollowers.toLocaleString()} followers`,
      metric: "founder_followers",
      condition: "gte",
      target,
      daysFromNow: 90,
    });
  }

  // Top startup (if 2+ startups)
  if (startups.length >= 2) {
    const sorted = [...startups].sort((a, b) => b.revenue.total - a.revenue.total);
    const top = sorted[0];
    suggestions.push({
      label: `${top.name} stays #1`,
      description: `Currently ${formatCents(top.revenue.total)} total revenue`,
      metric: "founder_top_startup",
      condition: "eq",
      target: 1,
      daysFromNow: 180,
    });
  }

  return suggestions.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveMarket(config: { metric: string; condition: string; target: number; dbColumn: string }, startupRow: any): "yes" | "no" | null {
  // Founder metrics require custom resolution (aggregation across all startups)
  if (config.metric.startsWith("founder_")) return null;

  const actual = startupRow[config.dbColumn];
  if (actual === null || actual === undefined) return null;

  const numActual = config.metric === "on_sale" ? (actual ? 1 : 0) : Number(actual);
  if (isNaN(numActual)) return null;

  const comparator = CONDITIONS[config.condition as ConditionId];
  if (!comparator) return null;

  return comparator(numActual, config.target) ? "yes" : "no";
}

/**
 * Resolve a founder market. Requires all startups for the founder.
 * @param config — resolution config from the market
 * @param founderStartups — all startup rows for the founder (raw DB rows with snake_case keys)
 * @param marketStartupSlug — the startup_slug on this market (used for founder_top_startup)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveFounderMarket(
  config: { metric: string; condition: string; target: number; dbColumn: string },
  founderStartups: any[],
  marketStartupSlug: string
): "yes" | "no" | null {
  if (founderStartups.length === 0) return null;

  const comparator = CONDITIONS[config.condition as ConditionId];
  if (!comparator) return null;

  switch (config.metric) {
    case "founder_revenue": {
      const total = founderStartups.reduce((sum, s) => sum + (Number(s.revenue_total) || 0), 0);
      return comparator(total, config.target) ? "yes" : "no";
    }
    case "founder_startups": {
      return comparator(founderStartups.length, config.target) ? "yes" : "no";
    }
    case "founder_followers": {
      const max = Math.max(...founderStartups.map((s) => Number(s.x_follower_count) || 0));
      return comparator(max, config.target) ? "yes" : "no";
    }
    case "founder_top_startup": {
      const sorted = [...founderStartups].sort(
        (a, b) => (Number(b.revenue_total) || 0) - (Number(a.revenue_total) || 0)
      );
      const isTop = sorted[0]?.slug === marketStartupSlug;
      return isTop ? "yes" : "no";
    }
    default:
      return null;
  }
}
