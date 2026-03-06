"use client";

import { useState, useMemo } from "react";
import { StartupCard } from "@/components/startup/startup-card";
import type { Startup, TrustMRRCategory } from "@/lib/types";

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

const sortOptions = [
  { value: "mrr-desc", label: "Highest MRR" },
  { value: "growth-desc", label: "Fastest Growing" },
  { value: "newest", label: "Newest" },
] as const;

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

interface EnrichedStartup {
  startup: Startup;
  activeMarketCount: number;
  sentiment: number;
}

interface StartupsClientProps {
  startups: EnrichedStartup[];
}

export function StartupsClient({ startups }: StartupsClientProps) {
  const [category, setCategory] = useState<TrustMRRCategory | "all">("all");
  const [sort, setSort] = useState<"mrr-desc" | "growth-desc" | "newest">("mrr-desc");
  const [forSaleOnly, setForSaleOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = [...startups];
    if (category !== "all") result = result.filter((e) => e.startup.category === category);
    if (forSaleOnly) result = result.filter((e) => e.startup.onSale);
    switch (sort) {
      case "mrr-desc": result.sort((a, b) => b.startup.revenue.mrr - a.startup.revenue.mrr); break;
      case "growth-desc": result.sort((a, b) => (b.startup.growth30d ?? 0) - (a.startup.growth30d ?? 0)); break;
      case "newest": result.sort((a, b) => {
        if (!a.startup.foundedDate || !b.startup.foundedDate) return 0;
        return new Date(b.startup.foundedDate).getTime() - new Date(a.startup.foundedDate).getTime();
      }); break;
    }
    return result;
  }, [startups, category, sort, forSaleOnly]);

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Startups</h1>

      <div className="flex flex-wrap items-center gap-1.5">
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
        <div className="divider divider-horizontal mx-0" />
        <FilterPill active={forSaleOnly} onClick={() => setForSaleOnly(!forSaleOnly)}>
          For Sale
        </FilterPill>
      </div>

      {filtered.length > 0 ? (
        <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <StartupCard
              key={e.startup.slug}
              startup={e.startup}
              activeMarketCount={e.activeMarketCount}
              sentiment={e.sentiment}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-base-content/50">No startups match your filters.</p>
      )}
    </div>
  );
}
