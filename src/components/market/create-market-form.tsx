"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Credits } from "@/components/ui/credits";
import { useToast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  METRICS,
  METRIC_DESCRIPTIONS,
  FOUNDER_METRICS,
  STARTUP_METRICS,
  generateQuestion,
  generateCriteria,
  generateSuggestions,
  generateFounderSuggestions,
  isFounderMetric,
  type MetricId,
  type ConditionId,
  type MarketBlueprint,
  type BetSuggestion,
} from "@/lib/market-templates";
import { formatCents } from "@/lib/helpers";
import type { Startup, User, Market } from "@/lib/types";

interface PickerStartup {
  slug: string;
  name: string;
  icon: string | null;
  mrr: number;
}

interface PickerFounder {
  xHandle: string;
  xName: string | null;
  totalFollowers: number;
  startupCount: number;
}
import { QUEST_MAP } from "@/lib/quests";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Info,
  TrendingUp,
  TrendingDown,
  Users,
  Sparkles,
  Pencil,
  X,
} from "lucide-react";
import Link from "next/link";
import { OddsBar } from "@/components/market/odds-bar";
import { FounderAvatar } from "@/components/founder/founder-avatar";

interface CreateMarketFormProps {
  startups: Startup[];
  user: User;
  initialStartupSlug?: string;
  initialFounder?: {
    xHandle: string;
    xName: string | null;
    startups: Startup[];
  };
  openMarkets: Market[];
}

const CONDITION_LABELS: Record<ConditionId, string> = {
  gte: "Reach or exceed",
  lte: "Drop below",
  eq: "Equals",
};

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

export function CreateMarketForm({
  startups,
  user,
  initialStartupSlug,
  initialFounder,
  openMarkets,
}: CreateMarketFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showMarkets, setShowMarkets] = useState(false);

  const isFounderMode = !!initialFounder;

  // Form state
  const [startupSlug, setStartupSlug] = useState(initialStartupSlug ?? "");
  const [search, setSearch] = useState("");
  const [pickerTab, setPickerTab] = useState<"startups" | "founders">("startups");
  const [pickerPage, setPickerPage] = useState(1);
  const [metric, setMetric] = useState<MetricId | null>(null);
  const [condition, setCondition] = useState<ConditionId>("gte");
  const [target, setTarget] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [seedSide, setSeedSide] = useState<"yes" | "no">("yes");
  const [seedAmount, setSeedAmount] = useState("100");
  // For founder_top_startup: which startup is being bet on
  const [topStartupSlug, setTopStartupSlug] = useState("");

  // In founder mode, skip step 1 (startup picker) — go straight to metric
  const [step, setStep] = useState(initialStartupSlug || isFounderMode ? 2 : 1);

  const selectedStartup = startups.find((s) => s.slug === startupSlug);
  const selectedMetric = metric ? METRICS[metric] : null;

  // Metric list depends on mode
  const metricList = isFounderMode ? FOUNDER_METRICS : STARTUP_METRICS;

  // Picker: server-side search via /api/picker
  const [pickerStartups, setPickerStartups] = useState<PickerStartup[]>([]);
  const [pickerFounders, setPickerFounders] = useState<PickerFounder[]>([]);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerReadyTab, setPickerReadyTab] = useState<string | null>(null);
  const PICKER_PAGE_SIZE = 8;
  const pickerPageCount = Math.max(1, Math.ceil(pickerTotal / PICKER_PAGE_SIZE));

  // Debounced fetch — keeps stale results visible while loading
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ tab: pickerTab, page: String(pickerPage) });
        if (search) params.set("q", search);
        const res = await fetch(`/api/picker?${params}`);
        const data = await res.json();
        if (cancelled) return;
        setPickerTotal(data.total);
        if (pickerTab === "founders") {
          setPickerFounders(data.founders ?? []);
        } else {
          setPickerStartups(data.startups ?? []);
        }
        setPickerReadyTab(pickerTab);
      } catch {
        // silent
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pickerTab, search, pickerPage]);

  const suggestions = useMemo(() => {
    if (isFounderMode && initialFounder) {
      return generateFounderSuggestions(initialFounder.xHandle, initialFounder.startups);
    }
    return selectedStartup ? generateSuggestions(selectedStartup) : [];
  }, [isFounderMode, initialFounder, selectedStartup]);

  const targetNum = useMemo(() => {
    if (!selectedMetric || !target) return 0;
    const val = parseFloat(target);
    if (isNaN(val)) return 0;
    if (selectedMetric.unit === "cents") return Math.round(val * 100);
    if (selectedMetric.unit === "percent") return val / 100;
    if (selectedMetric.unit === "boolean") return val;
    return val;
  }, [selectedMetric, target]);

  // For founder_top_startup, the startup_slug is the one being bet on
  const effectiveStartupSlug = useMemo(() => {
    if (metric === "founder_top_startup" && topStartupSlug) return topStartupSlug;
    if (isFounderMode && initialFounder && initialFounder.startups.length > 0) {
      // Default to top startup by revenue
      const sorted = [...initialFounder.startups].sort((a, b) => b.revenue.total - a.revenue.total);
      return sorted[0].slug;
    }
    return startupSlug;
  }, [metric, topStartupSlug, isFounderMode, initialFounder, startupSlug]);

  const effectiveStartup = useMemo(() => {
    if (isFounderMode && initialFounder) {
      return initialFounder.startups.find((s) => s.slug === effectiveStartupSlug) ?? initialFounder.startups[0];
    }
    return startups.find((s) => s.slug === effectiveStartupSlug);
  }, [isFounderMode, initialFounder, effectiveStartupSlug, startups]);

  const blueprint: MarketBlueprint | null = useMemo(() => {
    if (!effectiveStartupSlug || !metric || !closesAt) return null;
    // For non-boolean metrics, target must be > 0
    if (selectedMetric?.unit !== "boolean" && !targetNum) return null;
    // For boolean metrics, target must be set
    if (selectedMetric?.unit === "boolean" && target === "") return null;
    return {
      startupSlug: effectiveStartupSlug,
      metric,
      condition,
      target: targetNum,
      closesAt: new Date(closesAt).toISOString(),
      seedSide,
      seedAmount: parseInt(seedAmount) || 100,
      founderXHandle: isFounderMode ? initialFounder?.xHandle : undefined,
    };
  }, [effectiveStartupSlug, metric, condition, targetNum, target, closesAt, seedSide, seedAmount, isFounderMode, initialFounder, selectedMetric]);

  const previewQuestion = useMemo(() => {
    if (!blueprint || !effectiveStartup) return null;
    return generateQuestion(blueprint, effectiveStartup.name);
  }, [blueprint, effectiveStartup]);

  const previewCriteria = useMemo(() => {
    if (!blueprint || !effectiveStartup) return null;
    return generateCriteria(blueprint, effectiveStartup.name);
  }, [blueprint, effectiveStartup]);

  const minDate = useMemo(() => isoDate(1), []);
  const maxDate = useMemo(() => isoDate(365), []);

  const canProceed = () => {
    switch (step) {
      case 1: return !!startupSlug;
      case 2: return !!metric;
      case 3: {
        if (metric === "founder_top_startup") return !!topStartupSlug;
        return targetNum > 0;
      }
      case 4: return !!closesAt;
      case 5: return (parseInt(seedAmount) || 0) >= 100;
      default: return false;
    }
  };

  function applySuggestion(s: BetSuggestion) {
    const m = METRICS[s.metric];
    setMetric(s.metric);
    setCondition(s.condition);
    if (m.unit === "cents") {
      setTarget(String(s.target / 100));
    } else if (m.unit === "percent") {
      setTarget(String(s.target * 100));
    } else if (m.unit === "boolean") {
      setTarget(String(s.target));
    } else {
      setTarget(String(s.target));
    }
    // For founder_top_startup, auto-select the top startup
    if (s.metric === "founder_top_startup" && initialFounder) {
      const sorted = [...initialFounder.startups].sort((a, b) => b.revenue.total - a.revenue.total);
      setTopStartupSlug(sorted[0].slug);
    }
    setClosesAt(isoDate(s.daysFromNow));
    setStep(4);
  }

  const handleSubmit = async () => {
    if (!blueprint) return;
    setLoading(true);
    try {
      const res = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blueprint),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("error", "Market creation failed", data.error);
        setLoading(false);
        return;
      }
      if (data.warning) {
        toast("warning", "Market created", data.warning);
      } else {
        toast("success", "Market created", "Your seed bet has been placed");
      }

      // Quest completion toasts
      const completedQuests: string[] = data.completedQuests ?? [];
      for (const qid of completedQuests) {
        const q = QUEST_MAP.get(qid);
        if (q) toast("quest", "Quest completed!", `${q.label} — +${q.reward.toLocaleString()} bananas`);
      }

      router.push(`/markets/${data.id}`);
    } catch {
      toast("error", "Something went wrong", "Please try again");
      setLoading(false);
    }
  };

  // Founder context card stats
  const founderStats = useMemo(() => {
    if (!initialFounder) return null;
    const s = initialFounder.startups;
    return {
      totalRevenue: s.reduce((sum, st) => sum + st.revenue.total, 0),
      totalMrr: s.reduce((sum, st) => sum + st.revenue.mrr, 0),
      totalFollowers: Math.max(0, ...s.map((st) => st.xFollowerCount ?? 0)),
      startupCount: s.length,
    };
  }, [initialFounder]);

  // Active markets for the selected startup or founder
  const relatedMarkets = useMemo(() => {
    if (isFounderMode && initialFounder) {
      const founderSlugs = new Set(initialFounder.startups.map((s) => s.slug));
      return openMarkets.filter(
        (m) => m.founderXHandle === initialFounder.xHandle || founderSlugs.has(m.startupSlug)
      );
    }
    if (startupSlug) {
      return openMarkets.filter((m) => m.startupSlug === startupSlug);
    }
    return [];
  }, [isFounderMode, initialFounder, startupSlug, openMarkets]);

  const getMarketsForSlug = (slug: string) =>
    openMarkets.filter((m) => m.startupSlug === slug);

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
        <h1 className="text-2xl font-bold">
          {isFounderMode ? "Bet on a Founder" : "Create a Market"}
        </h1>

        {/* Step indicator */}
        <div className="flex gap-2">
          {(isFounderMode ? [2, 3, 4, 5] : [1, 2, 3, 4, 5]).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-base-300"
              }`}
            />
          ))}
        </div>

        {/* Founder context card — visible in founder mode on all steps */}
        {isFounderMode && initialFounder && founderStats && step >= 2 && (
          <div className="card bg-base-200/50 border border-base-300">
            <div className="card-body flex-row items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {(initialFounder.xName ?? initialFounder.xHandle).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">@{initialFounder.xHandle}</div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/50">
                  <span className="mono-num font-semibold text-base-content/70">
                    {formatCents(founderStats.totalRevenue)} revenue
                  </span>
                  <span>{founderStats.startupCount} startups</span>
                  {founderStats.totalFollowers > 0 && (
                    <span>{founderStats.totalFollowers.toLocaleString()} followers</span>
                  )}
                </div>
              </div>
              {relatedMarkets.length > 0 && (
                <button
                  onClick={() => setShowMarkets(true)}
                  className="btn btn-ghost btn-xs gap-1 text-primary"
                >
                  {relatedMarkets.length} active market{relatedMarkets.length !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Startup context card — visible on all steps after selection (non-founder mode) */}
        {!isFounderMode && selectedStartup && step > 1 && (
          <div className="card bg-base-200/50 border border-base-300">
            <div className="card-body flex-row items-center gap-4 p-4">
              {selectedStartup.icon ? (
                <img
                  src={selectedStartup.icon}
                  alt=""
                  className="h-10 w-10 rounded-lg"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {selectedStartup.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{selectedStartup.name}</div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/50">
                  <span className="mono-num font-semibold text-base-content/70">
                    {formatCents(selectedStartup.revenue.mrr)} MRR
                  </span>
                  <span className="flex items-center gap-0.5">
                    {(selectedStartup.growth30d ?? 0) >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-yes" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-no" />
                    )}
                    <span
                      className={`mono-num ${
                        (selectedStartup.growth30d ?? 0) >= 0
                          ? "text-yes"
                          : "text-no"
                      }`}
                    >
                      {selectedStartup.growth30d !== null
                        ? `${selectedStartup.growth30d.toFixed(1)}%/mo`
                        : "N/A"}
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {selectedStartup.customers.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {relatedMarkets.length > 0 && (
                  <button
                    onClick={() => setShowMarkets(true)}
                    className="btn btn-ghost btn-xs gap-1 text-primary"
                  >
                    {relatedMarkets.length} active market{relatedMarkets.length !== 1 ? "s" : ""}
                  </button>
                )}
                <button
                  onClick={() => {
                    setStep(1);
                    setStartupSlug("");
                    setMetric(null);
                    setTarget("");
                    setClosesAt("");
                  }}
                  className="btn btn-ghost btn-xs"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Pick startup or founder (non-founder mode only) */}
        {!isFounderMode && step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              {pickerTab === "startups" ? "Pick a startup" : "Pick a founder"}
            </h2>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-base-200 p-1">
              <button
                onClick={() => { setPickerTab("startups"); setPickerPage(1); setSearch(""); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pickerTab === "startups" ? "bg-base-100 text-base-content shadow-sm" : "text-base-content/50 hover:text-base-content/70"
                }`}
              >
                Startups
              </button>
              <button
                onClick={() => { setPickerTab("founders"); setPickerPage(1); setSearch(""); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pickerTab === "founders" ? "bg-base-100 text-base-content shadow-sm" : "text-base-content/50 hover:text-base-content/70"
                }`}
              >
                Founders
              </button>
            </div>

            <input
              type="text"
              placeholder={pickerTab === "startups" ? "Search startups..." : "Search founders..."}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPickerPage(1); }}
              className="input input-bordered w-full bg-base-200"
            />

            {pickerReadyTab !== pickerTab && (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: PICKER_PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-3 animate-pulse">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-base-300" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-24 rounded bg-base-300" />
                      <div className="h-2.5 w-16 rounded bg-base-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Startups grid */}
            {pickerReadyTab === pickerTab && pickerTab === "startups" && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pickerStartups.map((s) => {
                    const mc = getMarketsForSlug(s.slug).length;
                    return (
                      <button
                        key={s.slug}
                        onClick={() => setStartupSlug(s.slug)}
                        className={`btn btn-ghost justify-start gap-3 h-auto py-3 ${
                          startupSlug === s.slug ? "btn-outline btn-primary" : ""
                        }`}
                      >
                        {s.icon && (
                          <img src={s.icon} alt="" className="h-8 w-8 rounded" />
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-base-content/50">
                            {formatCents(s.mrr)} MRR
                          </div>
                        </div>
                        {mc > 0 && (
                          <span className="badge badge-sm badge-primary badge-outline mono-num">
                            {mc}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {pickerPageCount > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setPickerPage(pickerPage - 1)}
                      disabled={pickerPage <= 1}
                      className="btn btn-ghost btn-sm gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </button>
                    <span className="text-xs text-base-content/50 mono-num">
                      {pickerPage} / {pickerPageCount}
                    </span>
                    <button
                      onClick={() => setPickerPage(pickerPage + 1)}
                      disabled={pickerPage >= pickerPageCount}
                      className="btn btn-ghost btn-sm gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Founders grid */}
            {pickerReadyTab === pickerTab && pickerTab === "founders" && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pickerFounders.map((f) => (
                    <Link
                      key={f.xHandle}
                      href={`/markets/create?founder=${f.xHandle}`}
                      className="btn btn-ghost justify-start gap-3 h-auto py-3"
                    >
                      <FounderAvatar
                        xHandle={f.xHandle}
                        name={f.xName ?? f.xHandle}
                        size={32}
                      />
                      <div className="flex-1 text-left">
                        <div className="font-semibold">@{f.xHandle}</div>
                        <div className="text-xs text-base-content/50">
                          {f.totalFollowers > 0
                            ? `${f.totalFollowers.toLocaleString()} followers`
                            : `${f.startupCount} startup${f.startupCount !== 1 ? "s" : ""}`}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {pickerPageCount > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setPickerPage(pickerPage - 1)}
                      disabled={pickerPage <= 1}
                      className="btn btn-ghost btn-sm gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </button>
                    <span className="text-xs text-base-content/50 mono-num">
                      {pickerPage} / {pickerPageCount}
                    </span>
                    <button
                      onClick={() => setPickerPage(pickerPage + 1)}
                      disabled={pickerPage >= pickerPageCount}
                      className="btn btn-ghost btn-sm gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2 — Suggestions + Metric picker */}
        {step === 2 && (isFounderMode || selectedStartup) && (
          <div className="space-y-5">
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-semibold">Quick picks</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => applySuggestion(s)}
                      className="btn btn-ghost h-auto justify-start border border-base-300 py-3 hover:border-primary/50"
                    >
                      <div className="text-left">
                        <div className="font-semibold">{s.label}</div>
                        <div className="text-xs text-base-content/50">
                          {s.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom metric picker */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-base-content/50" />
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider">
                  Or choose a metric
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {metricList.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMetric(m.id);
                      setCondition(m.validConditions[0]);
                    }}
                    className={`btn btn-ghost justify-start h-auto py-3 gap-3 ${
                      metric === m.id ? "btn-outline btn-primary" : ""
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{m.label}</div>
                      <div className="text-xs text-base-content/50 capitalize">
                        {m.marketType.replace("-", " ")}
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-3.5 w-3.5 shrink-0 text-base-content/30 hover:text-base-content/60" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        {METRIC_DESCRIPTIONS[m.id]}
                      </TooltipContent>
                    </Tooltip>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Condition & Target */}
        {step === 3 && selectedMetric && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Set the target</h2>

            {/* founder_top_startup: show startup picker */}
            {metric === "founder_top_startup" && initialFounder ? (
              <div className="space-y-3">
                <p className="text-sm text-base-content/50">
                  Which startup will be @{initialFounder.xHandle}&apos;s #1 by revenue?
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {initialFounder.startups
                    .sort((a, b) => b.revenue.total - a.revenue.total)
                    .map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => {
                          setTopStartupSlug(s.slug);
                          setTarget("1");
                          setCondition("eq");
                        }}
                        className={`btn btn-ghost justify-start gap-3 h-auto py-3 ${
                          topStartupSlug === s.slug ? "btn-outline btn-primary" : ""
                        }`}
                      >
                        {s.icon ? (
                          <img src={s.icon} alt="" className="h-8 w-8 rounded" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="text-left">
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-base-content/50 mono-num">
                            {formatCents(s.revenue.total)} total
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <>
                {/* Current value hint for founder metrics */}
                {metric === "founder_revenue" && initialFounder && (
                  <div className="text-sm text-base-content/50">
                    Current total revenue:{" "}
                    <span className="mono-num font-semibold text-base-content/70">
                      {formatCents(initialFounder.startups.reduce((sum, s) => sum + s.revenue.total, 0))}
                    </span>
                  </div>
                )}
                {metric === "founder_startups" && initialFounder && (
                  <div className="text-sm text-base-content/50">
                    Current startups:{" "}
                    <span className="mono-num font-semibold text-base-content/70">
                      {initialFounder.startups.length}
                    </span>
                  </div>
                )}
                {metric === "founder_followers" && initialFounder && (
                  <div className="text-sm text-base-content/50">
                    Current X followers:{" "}
                    <span className="mono-num font-semibold text-base-content/70">
                      {Math.max(0, ...initialFounder.startups.map((s) => s.xFollowerCount ?? 0)).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Current value hint for startup metrics */}
                {!isFounderMode && selectedMetric.unit === "cents" && selectedStartup && (
                  <div className="text-sm text-base-content/50">
                    Current {selectedMetric.label}:{" "}
                    <span className="mono-num font-semibold text-base-content/70">
                      {selectedMetric.id === "mrr" && formatCents(selectedStartup.revenue.mrr)}
                      {selectedMetric.id === "revenue_30d" && formatCents(selectedStartup.revenue.last30Days)}
                      {selectedMetric.id === "revenue_total" && formatCents(selectedStartup.revenue.total)}
                    </span>
                  </div>
                )}
                {!isFounderMode && selectedMetric.unit === "count" && selectedStartup && (
                  <div className="text-sm text-base-content/50">
                    Current {selectedMetric.label}:{" "}
                    <span className="mono-num font-semibold text-base-content/70">
                      {selectedMetric.id === "customers" && selectedStartup.customers.toLocaleString()}
                      {selectedMetric.id === "active_subs" && selectedStartup.activeSubscriptions.toLocaleString()}
                    </span>
                  </div>
                )}
                {!isFounderMode && selectedMetric.unit === "percent" && selectedMetric.id === "growth_30d" && selectedStartup && (
                  <div className="text-sm text-base-content/50">
                    Current growth:{" "}
                    <span className="mono-num font-semibold text-base-content/70">
                      {selectedStartup.growth30d !== null
                        ? `${selectedStartup.growth30d.toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>
                )}

                {selectedMetric.unit !== "boolean" ? (
                  <>
                    <div className="flex gap-2">
                      {selectedMetric.validConditions.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCondition(c)}
                          className={`btn btn-sm flex-1 ${
                            condition === c
                              ? "btn-primary"
                              : "btn-ghost border-base-300"
                          }`}
                        >
                          {CONDITION_LABELS[c]}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      {selectedMetric.unit === "cents" && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
                          $
                        </span>
                      )}
                      <input
                        type="number"
                        placeholder={
                          selectedMetric.unit === "cents"
                            ? "e.g. 5000"
                            : selectedMetric.unit === "percent"
                            ? "e.g. 20"
                            : "e.g. 100"
                        }
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        className={`input input-bordered w-full bg-base-200 mono-num ${
                          selectedMetric.unit === "cents" ? "pl-7" : ""
                        }`}
                      />
                      {selectedMetric.unit === "percent" && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">
                          %
                        </span>
                      )}
                    </div>
                  </>
                ) : selectedMetric.id === "on_sale" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTarget("1");
                        setCondition("eq");
                      }}
                      className={`btn flex-1 ${
                        target === "1" ? "btn-primary" : "btn-ghost border-base-300"
                      }`}
                    >
                      Yes (listed for sale)
                    </button>
                    <button
                      onClick={() => {
                        setTarget("0");
                        setCondition("eq");
                      }}
                      className={`btn flex-1 ${
                        target === "0" ? "btn-primary" : "btn-ghost border-base-300"
                      }`}
                    >
                      No (not for sale)
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* Step 4 — Deadline */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">When does this resolve?</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "1 week", days: 7 },
                { label: "2 weeks", days: 14 },
                { label: "1 month", days: 30 },
                { label: "3 months", days: 90 },
                { label: "6 months", days: 180 },
              ].map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setClosesAt(isoDate(opt.days))}
                  className={`btn btn-sm ${
                    closesAt === isoDate(opt.days)
                      ? "btn-primary"
                      : "btn-ghost border-base-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              min={minDate}
              max={maxDate}
              className="input input-bordered w-full bg-base-200"
            />
          </div>
        )}

        {/* Step 5 — Seed bet */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Place your seed bet</h2>
            <p className="text-sm text-base-content/60">
              Every market needs a first bet to get started. Which side are you
              on?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSeedSide("yes")}
                className={`btn mono-num ${
                  seedSide === "yes"
                    ? "btn-success"
                    : "btn-ghost border-base-300"
                }`}
              >
                YES
              </button>
              <button
                onClick={() => setSeedSide("no")}
                className={`btn mono-num ${
                  seedSide === "no" ? "btn-error" : "btn-ghost border-base-300"
                }`}
              >
                NO
              </button>
            </div>
            <input
              type="number"
              placeholder="Amount (min 100)"
              value={seedAmount}
              onChange={(e) => setSeedAmount(e.target.value)}
              min={100}
              className="input input-bordered w-full bg-base-200 mono-num"
            />
            <p className="text-center text-xs text-base-content/50">
              Balance: <Credits amount={user.credits} />
            </p>
          </div>
        )}

        {/* Live Preview */}
        {previewQuestion && (
          <div className="card bg-base-300/30 border border-base-300">
            <div className="card-body gap-2 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </div>
              <p className="font-semibold">{previewQuestion}</p>
              <p className="text-xs text-base-content/50">{previewCriteria}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > (isFounderMode ? 2 : 1) && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn btn-ghost gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn btn-primary gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                !blueprint ||
                (parseInt(seedAmount) || 0) > user.credits
              }
              className="btn btn-primary gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {loading ? "Creating..." : "Create Market"}
            </button>
          )}
        </div>
      </div>

      {/* Active markets modal */}
      {showMarkets && relatedMarkets.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMarkets(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-base-300 bg-base-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Active Markets ({relatedMarkets.length})
              </h3>
              <button onClick={() => setShowMarkets(false)} className="btn btn-ghost btn-xs btn-square">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
              {relatedMarkets.map((m) => (
                <Link
                  key={m.id}
                  href={`/markets/${m.id}`}
                  className="block rounded-lg border border-base-300 p-4 transition-colors hover:border-primary/30 hover:bg-base-200/50"
                >
                  <div className="text-[13px] font-semibold leading-snug">{m.question}</div>
                  <div className="mt-2">
                    <OddsBar yesOdds={m.yesOdds} size="sm" />
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-[11px] text-base-content/50">
                    <span className="mono-num"><Credits amount={m.totalCredits} size="xs" /> pool</span>
                    <span className="mono-num">{m.totalBettors} bettor{m.totalBettors !== 1 ? "s" : ""}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
