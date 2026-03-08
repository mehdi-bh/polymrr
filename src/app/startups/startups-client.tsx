"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { FilterPill, FilterGroup } from "@/components/ui/filter-pill";
import { SearchInput } from "@/components/ui/search-input";
import type { TrustMRRCategory } from "@/lib/types";
import {
  Sparkles,
  Code2,
  ShoppingCart,
  Blocks,
  BarChart3,
  Pen,
  Share2,
  Layers,
  Bot,
  TrendingUp,
  CalendarPlus,
  Users,
  Heart,
  ArrowDownAZ,
  DollarSign,
  Tag,
} from "lucide-react";

const categoryOptions: { value: TrustMRRCategory | "all"; label: string; icon: ReactNode }[] = [
  { value: "all", label: "All", icon: <Layers /> },
  { value: "ai", label: "AI", icon: <Bot /> },
  { value: "saas", label: "SaaS", icon: <Sparkles /> },
  { value: "developer-tools", label: "Dev Tools", icon: <Code2 /> },
  { value: "ecommerce", label: "E-commerce", icon: <ShoppingCart /> },
  { value: "no-code", label: "No-Code", icon: <Blocks /> },
  { value: "analytics", label: "Analytics", icon: <BarChart3 /> },
  { value: "content-creation", label: "Content", icon: <Pen /> },
  { value: "social-media", label: "Social", icon: <Share2 /> },
];

const sortOptions: { value: string; label: string; icon: ReactNode }[] = [
  { value: "mrr-desc", label: "Highest MRR", icon: <DollarSign /> },
  { value: "growth-desc", label: "Fastest Growing", icon: <TrendingUp /> },
  { value: "newest", label: "Newest", icon: <CalendarPlus /> },
  { value: "customers-desc", label: "Most Customers", icon: <Users /> },
  { value: "followers-desc", label: "Most Followers", icon: <Heart /> },
  { value: "alpha", label: "A-Z", icon: <ArrowDownAZ /> },
];

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

      <div className="flex flex-wrap gap-x-6 gap-y-4">
        <FilterGroup label="Category" icon={<Sparkles />}>
          {categoryOptions.map((o) => (
            <FilterPill key={o.value} active={filters.category === o.value} onClick={() => setFilter("category", o.value)} icon={o.icon}>
              {o.label}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="Sort" icon={<BarChart3 />}>
          {sortOptions.map((o) => (
            <FilterPill key={o.value} active={filters.sort === o.value} onClick={() => setFilter("sort", o.value)} icon={o.icon}>
              {o.label}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="More" icon={<Tag />}>
          <FilterPill active={filters.forSale} onClick={() => setFilter("forSale", filters.forSale ? "false" : "true")} icon={<Tag />}>
            For Sale
          </FilterPill>
        </FilterGroup>
      </div>

      {children}
    </div>
  );
}
