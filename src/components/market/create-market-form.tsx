"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Credits } from "@/components/ui/credits";
import {
  METRICS,
  generateQuestion,
  generateCriteria,
  type MetricId,
  type ConditionId,
  type MarketBlueprint,
} from "@/lib/market-templates";
import { formatCents } from "@/lib/helpers";
import type { Startup, User } from "@/lib/types";
import { ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";

interface CreateMarketFormProps {
  startups: Startup[];
  user: User;
}

const METRIC_LIST = Object.values(METRICS);

const CONDITION_LABELS: Record<ConditionId, string> = {
  gte: "Reach or exceed",
  lte: "Drop below",
  eq: "Equals",
};

export function CreateMarketForm({ startups, user }: CreateMarketFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Startup
  const [search, setSearch] = useState("");
  const [startupSlug, setStartupSlug] = useState("");

  // Step 2 — Metric
  const [metric, setMetric] = useState<MetricId | null>(null);

  // Step 3 — Condition & Target
  const [condition, setCondition] = useState<ConditionId>("gte");
  const [target, setTarget] = useState("");

  // Step 4 — Deadline
  const [closesAt, setClosesAt] = useState("");

  // Step 5 — Seed bet
  const [seedSide, setSeedSide] = useState<"yes" | "no">("yes");
  const [seedAmount, setSeedAmount] = useState("100");

  const selectedStartup = startups.find((s) => s.slug === startupSlug);
  const selectedMetric = metric ? METRICS[metric] : null;

  const filteredStartups = useMemo(() => {
    if (!search) return startups.slice(0, 20);
    const q = search.toLowerCase();
    return startups.filter(
      (s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [startups, search]);

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

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  }, []);

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

  const handleSubmit = async () => {
    if (!blueprint) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blueprint),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push(`/markets/${data.id}`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Create a Market</h1>

      {/* Steps indicator */}
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

      {/* Step 2 — Metric */}
      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">What are you predicting?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {METRIC_LIST.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMetric(m.id); setCondition(m.validConditions[0]); }}
                className={`btn btn-ghost justify-start h-auto py-3 ${
                  metric === m.id ? "btn-outline btn-primary" : ""
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-xs text-base-content/50 capitalize">
                    {m.marketType.replace("-", " ")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Condition & Target */}
      {step === 3 && selectedMetric && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Set the target</h2>

          {selectedMetric.unit !== "boolean" ? (
            <>
              <div className="flex gap-2">
                {selectedMetric.validConditions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    className={`btn btn-sm flex-1 ${
                      condition === c ? "btn-primary" : "btn-ghost border-base-300"
                    }`}
                  >
                    {CONDITION_LABELS[c]}
                  </button>
                ))}
              </div>
              <div className="relative">
                {selectedMetric.unit === "cents" && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">$</span>
                )}
                <input
                  type="number"
                  placeholder={selectedMetric.unit === "cents" ? "e.g. 5000" : selectedMetric.unit === "percent" ? "e.g. 20" : "e.g. 100"}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className={`input input-bordered w-full bg-base-200 mono-num ${
                    selectedMetric.unit === "cents" ? "pl-7" : ""
                  }`}
                />
                {selectedMetric.unit === "percent" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">%</span>
                )}
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setTarget("1"); setCondition("eq"); }}
                className={`btn flex-1 ${target === "1" ? "btn-primary" : "btn-ghost border-base-300"}`}
              >
                Yes (listed for sale)
              </button>
              <button
                onClick={() => { setTarget("0"); setCondition("eq"); }}
                className={`btn flex-1 ${target === "0" ? "btn-primary" : "btn-ghost border-base-300"}`}
              >
                No (not for sale)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Deadline */}
      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">When does this resolve?</h2>
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
            Every market needs a first bet to get started. Which side are you on?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSeedSide("yes")}
              className={`btn mono-num ${
                seedSide === "yes" ? "btn-success" : "btn-ghost border-base-300"
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

      {/* Error */}
      {error && (
        <div className="alert alert-error text-sm">{error}</div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="btn btn-ghost gap-1">
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
            disabled={loading || !blueprint || (parseInt(seedAmount) || 0) > user.credits}
            className="btn btn-primary gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Creating..." : "Create Market"}
          </button>
        )}
      </div>
    </div>
  );
}
