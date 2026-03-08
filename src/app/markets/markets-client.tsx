"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { FilterPill } from "@/components/ui/filter-pill";
import { SearchInput } from "@/components/ui/search-input";
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
  { value: "yes-odds-desc", label: "Most Bullish" },
  { value: "yes-odds-asc", label: "Most Bearish" },
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

interface MarketsFiltersProps {
  filters: { status: string; type: string; category: string; sort: string; search: string };
  children: ReactNode;
}

export function MarketsFilters({ filters, children }: MarketsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (
          !value ||
          value === "all" ||
          (key === "sort" && value === "closing-soon") ||
          (key === "status" && value === "closing-soon")
        ) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `/markets?${qs}` : "/markets");
    },
    [router, searchParams]
  );

  function setFilter(key: string, value: string) {
    updateParams({ [key]: value, page: undefined });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Markets</h1>

      <SearchInput
        value={filters.search}
        placeholder="Search markets, startups..."
        onChange={(value) => updateParams({ q: value || undefined, page: undefined })}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((o) => (
            <FilterPill key={o.value} active={filters.status === o.value} onClick={() => setFilter("status", o.value)}>
              {o.label}
            </FilterPill>
          ))}
          <div className="divider divider-horizontal mx-0" />
          {typeOptions.map((o) => (
            <FilterPill key={o.value} active={filters.type === o.value} onClick={() => setFilter("type", o.value)}>
              {o.label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categoryOptions.map((o) => (
            <FilterPill key={o.value} active={filters.category === o.value} onClick={() => setFilter("category", o.value)}>
              {o.label}
            </FilterPill>
          ))}
          <div className="divider divider-horizontal mx-0" />
          {sortOptions.map((o) => (
            <FilterPill key={o.value} active={filters.sort === o.value} onClick={() => setFilter("sort", o.value)}>
              {o.label}
            </FilterPill>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
