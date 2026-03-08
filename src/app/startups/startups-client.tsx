"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { FilterPill } from "@/components/ui/filter-pill";
import { SearchInput } from "@/components/ui/search-input";
import type { TrustMRRCategory } from "@/lib/types";

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
  { value: "customers-desc", label: "Most Customers" },
  { value: "followers-desc", label: "Most Followers" },
  { value: "alpha", label: "A-Z" },
] as const;

interface StartupsFiltersProps {
  filters: { category: string; sort: string; forSale: boolean; search: string };
  children: ReactNode;
}

export function StartupsFilters({ filters, children }: StartupsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all" || (key === "sort" && value === "mrr-desc") || (key === "forSale" && value === "false")) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `/startups?${qs}` : "/startups");
    },
    [router, searchParams]
  );

  function setFilter(key: string, value: string) {
    updateParams({ [key]: value, page: undefined });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Startups</h1>

      <SearchInput
        value={filters.search}
        placeholder="Search startups, founders, tech..."
        onChange={(value) => updateParams({ q: value || undefined, page: undefined })}
      />

      <div className="flex flex-wrap items-center gap-1.5">
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
        <div className="divider divider-horizontal mx-0" />
        <FilterPill active={filters.forSale} onClick={() => setFilter("forSale", filters.forSale ? "false" : "true")}>
          For Sale
        </FilterPill>
      </div>

      {children}
    </div>
  );
}
