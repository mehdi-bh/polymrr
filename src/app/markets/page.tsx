"use client";

import { useState } from "react";
import { MarketCard } from "@/components/market/market-card";
import { getFilteredMarkets } from "@/lib/data";
import type { MarketType, MarketStatus, TrustMRRCategory } from "@/lib/types";

const statusOptions: { value: MarketStatus | "closing-soon" | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closing-soon", label: "Closing Soon" },
  { value: "resolved", label: "Resolved" },
];

const typeOptions: { value: MarketType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "mrr-target", label: "MRR Target" },
  { value: "growth-race", label: "Growth" },
  { value: "acquisition", label: "Acquisition" },
  { value: "survival", label: "Survival" },
];

const sortOptions = [
  { value: "closing-soon", label: "Closing Soon" },
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "biggest-pot", label: "Biggest Pot" },
] as const;

const categoryOptions: { value: TrustMRRCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI" },
  { value: "saas", label: "SaaS" },
  { value: "developer-tools", label: "Dev Tools" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "no-code", label: "No-Code" },
  { value: "analytics", label: "Analytics" },
  { value: "content-creation", label: "Content" },
  { value: "social-media", label: "Social" },
];

function FilterPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-xs ${
        active ? "btn-primary btn-outline" : "btn-ghost"
      }`}
    >
      {children}
    </button>
  );
}

export default function MarketsPage() {
  const [status, setStatus] = useState<MarketStatus | "closing-soon" | "all">("closing-soon");
  const [type, setType] = useState<MarketType | "all">("all");
  const [sort, setSort] = useState<"popular" | "closing-soon" | "newest" | "biggest-pot">("closing-soon");
  const [category, setCategory] = useState<TrustMRRCategory | "all">("all");

  const markets = getFilteredMarkets({
    status: status === "all" ? undefined : status,
    type: type === "all" ? undefined : type,
    category: category === "all" ? undefined : category,
    sort,
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Markets</h1>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((o) => (
            <FilterPill key={o.value} active={status === o.value} onClick={() => setStatus(o.value)}>
              {o.label}
            </FilterPill>
          ))}
          <div className="divider divider-horizontal mx-0" />
          {typeOptions.map((o) => (
            <FilterPill key={o.value} active={type === o.value} onClick={() => setType(o.value)}>
              {o.label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categoryOptions.map((o) => (
            <FilterPill key={o.value} active={category === o.value} onClick={() => setCategory(o.value)}>
              {o.label}
            </FilterPill>
          ))}
          <div className="divider divider-horizontal mx-0" />
          {sortOptions.map((o) => (
            <FilterPill key={o.value} active={sort === o.value} onClick={() => setSort(o.value)}>
              {o.label}
            </FilterPill>
          ))}
        </div>
      </div>

      {markets.length > 0 ? (
        <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-base-content/50">No markets match your filters.</p>
      )}
    </div>
  );
}
