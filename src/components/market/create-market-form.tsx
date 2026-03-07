"use client";

import { useState, useMemo } from "react";
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
  generateQuestion,
  generateCriteria,
  generateSuggestions,
  type MetricId,
  type ConditionId,
  type MarketBlueprint,
  type BetSuggestion,
} from "@/lib/market-templates";
import { formatCents } from "@/lib/helpers";
import type { Startup, User } from "@/lib/types";
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
} from "lucide-react";

interface CreateMarketFormProps {
  startups: Startup[];
  user: User;
  initialStartupSlug?: string;
}

const METRIC_LIST = Object.values(METRICS);

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
}: CreateMarketFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [startupSlug, setStartupSlug] = useState(initialStartupSlug ?? "");
  const [search, setSearch] = useState("");
  const [metric, setMetric] = useState<MetricId | null>(null);
  const [condition, setCondition] = useState<ConditionId>("gte");
  const [target, setTarget] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [seedSide, setSeedSide] = useState<"yes" | "no">("yes");
  const [seedAmount, setSeedAmount] = useState("100");

  // Step: skip step 1 if startup pre-selected
  const [step, setStep] = useState(initialStartupSlug ? 2 : 1);

  const selectedStartup = startups.find((s) => s.slug === startupSlug);
  const selectedMetric = metric ? METRICS[metric] : null;

  const filteredStartups = useMemo(() => {
    if (!search) return startups.slice(0, 20);
    const q = search.toLowerCase();
    return startups
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [startups, search]);

  const suggestions = useMemo(
    () => (selectedStartup ? generateSuggestions(selectedStartup) : []),
    [selectedStartup]
  );

  const targetNum = useMemo(() => {
    if (!selectedMetric || !target) return 0;
    const val = parseFloat(target);
    if (isNaN(val)) return 0;
    if (selectedMetric.unit === "cents") return Math.round(val * 100);
    if (selectedMetric.unit === "percent") return val / 100;
    if (selectedMetric.unit === "boolean") return val;
    return val;
  }, [selectedMetric, target]);

  const blueprint: MarketBlueprint | null = useMemo(() => {
    if (!startupSlug || !metric || !targetNum || !closesAt) return null;
    return {
      startupSlug,
      metric,
      condition,
      target: targetNum,
      closesAt: new Date(closesAt).toISOString(),
      seedSide,
      seedAmount: parseInt(seedAmount) || 100,
    };
  }, [startupSlug, metric, condition, targetNum, closesAt, seedSide, seedAmount]);

  const previewQuestion = useMemo(() => {
    if (!blueprint || !selectedStartup) return null;
    return generateQuestion(blueprint, selectedStartup.name);
  }, [blueprint, selectedStartup]);

  const previewCriteria = useMemo(() => {
    if (!blueprint || !selectedStartup) return null;
    return generateCriteria(blueprint, selectedStartup.name);
  }, [blueprint, selectedStartup]);

  const minDate = useMemo(() => isoDate(1), []);
  const maxDate = useMemo(() => isoDate(365), []);

  const canProceed = () => {
    switch (step) {
      case 1: return !!startupSlug;
      case 2: return !!metric;
      case 3: return targetNum > 0;
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
    } else {
      setTarget(String(s.target));
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
      router.push(`/markets/${data.id}`);
    } catch {
      toast("error", "Something went wrong", "Please try again");
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
        <h1 className="text-2xl font-bold">Create a Market</h1>

        {/* Step indicator */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-base-300"
              }`}
            />
          ))}
        </div>

        {/* Startup context card — visible on all steps after selection */}
        {selectedStartup && step > 1 && (
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
                        ? `${(selectedStartup.growth30d * 100).toFixed(0)}%/mo`
                        : "N/A"}
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {selectedStartup.customers.toLocaleString()}
                  </span>
                </div>
              </div>
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
        )}

        {/* Step 1 — Startup */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Pick a startup</h2>
            <input
              type="text"
              placeholder="Search startups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-bordered w-full bg-base-200"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredStartups.map((s) => (
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
                  <div className="text-left">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-base-content/50">
                      {formatCents(s.revenue.mrr)} MRR
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Suggestions + Metric picker */}
        {step === 2 && selectedStartup && (
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
                {METRIC_LIST.map((m) => (
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
        {step === 3 && selectedMetric && selectedStartup && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Set the target</h2>

            {/* Current value hint */}
            {selectedMetric.unit === "cents" && (
              <div className="text-sm text-base-content/50">
                Current {selectedMetric.label}:{" "}
                <span className="mono-num font-semibold text-base-content/70">
                  {selectedMetric.id === "mrr" && formatCents(selectedStartup.revenue.mrr)}
                  {selectedMetric.id === "revenue_30d" && formatCents(selectedStartup.revenue.last30Days)}
                  {selectedMetric.id === "revenue_total" && formatCents(selectedStartup.revenue.total)}
                </span>
              </div>
            )}
            {selectedMetric.unit === "count" && (
              <div className="text-sm text-base-content/50">
                Current {selectedMetric.label}:{" "}
                <span className="mono-num font-semibold text-base-content/70">
                  {selectedMetric.id === "customers" && selectedStartup.customers.toLocaleString()}
                  {selectedMetric.id === "active_subs" && selectedStartup.activeSubscriptions.toLocaleString()}
                </span>
              </div>
            )}
            {selectedMetric.unit === "percent" && selectedMetric.id === "growth_30d" && (
              <div className="text-sm text-base-content/50">
                Current growth:{" "}
                <span className="mono-num font-semibold text-base-content/70">
                  {selectedStartup.growth30d !== null
                    ? `${(selectedStartup.growth30d * 100).toFixed(0)}%`
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
            ) : (
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
          {step > 1 && (
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
    </TooltipProvider>
  );
}
