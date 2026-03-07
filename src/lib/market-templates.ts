// ---------------------------------------------------------------------------
// Market Template Registry — structured market creation & resolution
// ---------------------------------------------------------------------------

import { formatCents } from "./helpers";

export type MetricId =
  | "mrr"
  | "revenue_30d"
  | "revenue_total"
  | "customers"
  | "active_subs"
  | "growth_30d"
  | "profit_margin"
  | "on_sale";

export type ConditionId = "gte" | "lte" | "eq";

export type MarketType = "mrr-target" | "growth-race" | "acquisition" | "survival";

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
  customers: {
    id: "customers",
    dbColumn: "customers",
    unit: "count",
    label: "Customers",
    validConditions: ["gte", "lte"],
    marketType: "growth-race",
  },
  active_subs: {
    id: "active_subs",
    dbColumn: "active_subscriptions",
    unit: "count",
    label: "Active Subs",
    validConditions: ["gte", "lte"],
    marketType: "growth-race",
  },
  growth_30d: {
    id: "growth_30d",
    dbColumn: "growth_30d",
    unit: "percent",
    label: "30d Growth",
    validConditions: ["gte", "lte"],
    marketType: "growth-race",
  },
  profit_margin: {
    id: "profit_margin",
    dbColumn: "profit_margin_last_30_days",
    unit: "percent",
    label: "Profit Margin",
    validConditions: ["gte", "lte"],
    marketType: "survival",
  },
  on_sale: {
    id: "on_sale",
    dbColumn: "on_sale",
    unit: "boolean",
    label: "Listed for Sale",
    validConditions: ["eq"],
    marketType: "acquisition",
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
      return `${(target * 100).toFixed(0)}%`;
    case "boolean":
      return target === 1 ? "yes" : "no";
  }
}

export function generateQuestion(blueprint: MarketBlueprint, startupName: string): string {
  const metric = METRICS[blueprint.metric];
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

export function validateBlueprint(blueprint: MarketBlueprint): string | null {
  const metric = METRICS[blueprint.metric];
  if (!metric) return `Unknown metric: ${blueprint.metric}`;

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

  const { data } = await supabase
    .from("markets")
    .select("id")
    .eq("startup_slug", blueprint.startupSlug)
    .filter("resolution_config->>metric", "eq", blueprint.metric)
    .filter("resolution_config->>condition", "eq", blueprint.condition)
    .filter("resolution_config->>target", "eq", String(blueprint.target))
    .gte("closes_at", dayStart)
    .lte("closes_at", dayEnd)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveMarket(config: { metric: string; condition: string; target: number; dbColumn: string }, startupRow: any): "yes" | "no" | null {
  const actual = startupRow[config.dbColumn];
  if (actual === null || actual === undefined) return null;

  const numActual = config.metric === "on_sale" ? (actual ? 1 : 0) : Number(actual);
  if (isNaN(numActual)) return null;

  const comparator = CONDITIONS[config.condition as ConditionId];
  if (!comparator) return null;

  return comparator(numActual, config.target) ? "yes" : "no";
}
