// ---------------------------------------------------------------------------
// Market Validation — ensures markets are logically valid given current data
// ---------------------------------------------------------------------------

import { METRICS, type MarketBlueprint, type MetricId } from "./market-templates";

export interface StartupData {
  slug: string;
  name: string;
  revenue_mrr: number;
  revenue_last_30_days: number;
  revenue_total: number;
  on_sale: boolean;
  x_handle: string | null;
  x_follower_count: number | null;
  growth_30d: number | null;
  customers: number | null;
}

export interface FounderData {
  x_handle: string;
  startups: StartupData[];
  totalRevenue: number;
  startupCount: number;
  maxFollowers: number;
}

/**
 * Validate that a market blueprint makes logical sense given current data.
 * Returns null if valid, or an error string explaining why it's invalid.
 */
export function validateMarketAgainstData(
  blueprint: MarketBlueprint,
  startup: StartupData,
  founderData?: FounderData
): string | null {
  const metric = METRICS[blueprint.metric];
  if (!metric) return `Unknown metric: ${blueprint.metric}`;

  // Skip anonymous startups
  if (/^anonymous\s/i.test(startup.name)) {
    return "Cannot create markets for anonymous startups";
  }

  // --- Startup metric checks ---

  if (blueprint.metric === "mrr") {
    const currentMrr = startup.revenue_mrr ?? 0;
    if (blueprint.condition === "gte" && blueprint.target <= currentMrr) {
      return `MRR target ${blueprint.target} already reached (current: ${currentMrr})`;
    }
    if (blueprint.condition === "lte" && blueprint.target >= currentMrr) {
      return `MRR drop target ${blueprint.target} is above current MRR (${currentMrr})`;
    }
  }

  if (blueprint.metric === "revenue_30d") {
    const current = startup.revenue_last_30_days ?? 0;
    if (blueprint.condition === "gte" && blueprint.target <= current) {
      return `30d revenue target ${blueprint.target} already reached (current: ${current})`;
    }
    if (blueprint.condition === "lte" && blueprint.target >= current) {
      return `30d revenue drop target ${blueprint.target} is above current (${current})`;
    }
  }

  if (blueprint.metric === "revenue_total") {
    const current = startup.revenue_total ?? 0;
    if (blueprint.condition === "gte" && blueprint.target <= current) {
      return `Total revenue target ${blueprint.target} already reached (current: ${current})`;
    }
  }

  if (blueprint.metric === "on_sale") {
    if (blueprint.target === 1 && startup.on_sale) {
      return `${startup.name} is already listed for sale`;
    }
    if (blueprint.target === 0 && !startup.on_sale) {
      return `${startup.name} is already not for sale`;
    }
  }

  // --- Founder metric checks ---

  if (blueprint.metric.startsWith("founder_") && founderData) {
    if (blueprint.metric === "founder_revenue") {
      if (blueprint.condition === "gte" && blueprint.target <= founderData.totalRevenue) {
        return `Founder revenue target ${blueprint.target} already reached (current: ${founderData.totalRevenue})`;
      }
    }

    if (blueprint.metric === "founder_startups") {
      if (blueprint.condition === "gte" && blueprint.target <= founderData.startupCount) {
        return `Founder already has ${founderData.startupCount} startups (target: ${blueprint.target})`;
      }
    }

    if (blueprint.metric === "founder_followers") {
      if (blueprint.condition === "gte" && blueprint.target <= founderData.maxFollowers) {
        return `Founder already has ${founderData.maxFollowers} followers (target: ${blueprint.target})`;
      }
      if (blueprint.condition === "lte" && blueprint.target >= founderData.maxFollowers) {
        return `Follower drop target ${blueprint.target} is above current (${founderData.maxFollowers})`;
      }
    }
  }

  // --- Sanity checks ---

  // MRR/revenue targets should be within reasonable range of current value
  if (blueprint.metric === "mrr" && blueprint.condition === "gte") {
    const currentMrr = startup.revenue_mrr ?? 0;
    if (currentMrr > 0 && blueprint.target > currentMrr * 10) {
      return `MRR target ${blueprint.target} is >10x current MRR (${currentMrr}) — unrealistic`;
    }
  }

  // Startups with zero MRR shouldn't get MRR milestone markets
  if (blueprint.metric === "mrr" && (startup.revenue_mrr ?? 0) === 0) {
    return "Startup has no MRR data";
  }

  return null;
}

/**
 * Check if a market would already resolve immediately (making it pointless).
 * Returns true if the market would resolve right now.
 */
export function wouldResolveImmediately(
  blueprint: MarketBlueprint,
  startup: StartupData,
  founderData?: FounderData
): boolean {
  const metric = METRICS[blueprint.metric];
  if (!metric) return false;

  const CONDITIONS: Record<string, (actual: number, target: number) => boolean> = {
    gte: (actual, target) => actual >= target,
    lte: (actual, target) => actual <= target,
    eq: (actual, target) => actual === target,
  };

  const comparator = CONDITIONS[blueprint.condition];
  if (!comparator) return false;

  // Check startup metrics
  if (!blueprint.metric.startsWith("founder_")) {
    if (blueprint.metric === "on_sale") {
      const actual = startup.on_sale ? 1 : 0;
      return comparator(actual, blueprint.target);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = Number((startup as any)[metric.dbColumn] ?? 0);
    return comparator(actual, blueprint.target);
  }

  // Check founder metrics
  if (founderData) {
    switch (blueprint.metric) {
      case "founder_revenue":
        return comparator(founderData.totalRevenue, blueprint.target);
      case "founder_startups":
        return comparator(founderData.startupCount, blueprint.target);
      case "founder_followers":
        return comparator(founderData.maxFollowers, blueprint.target);
    }
  }

  return false;
}
