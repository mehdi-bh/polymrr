"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { FilterSelect, type FilterOption } from "@/components/ui/filter-select";
import { SearchInput } from "@/components/ui/search-input";
import type { MarketType, MarketStatus, TrustMRRCategory } from "@/lib/types";
import {
  CircleDot, Clock, CheckCircle2, Target, Handshake,
  Sparkles, Code2, ShoppingCart, Blocks, BarChart3, Pen, Share2, Flame,
  CalendarPlus, Coins, ArrowUpCircle, ArrowDownCircle, Layers, Bot,
} from "lucide-react";

const statusOptions: FilterOption[] = [
  { value: "all", label: "All Statuses", icon: <Layers /> },
  { value: "open", label: "Open", icon: <CircleDot /> },
  { value: "closing-soon", label: "Closing Soon", icon: <Clock /> },
  { value: "resolved", label: "Resolved", icon: <CheckCircle2 /> },
];

const typeOptions: FilterOption[] = [
  { value: "all", label: "All Types", icon: <Layers /> },
  { value: "mrr-target", label: "MRR Target", icon: <Target /> },
  { value: "acquisition", label: "Acquisition", icon: <Handshake /> },
  { value: "founder", label: "Founder", icon: <Flame /> },
];

const sortOptions: FilterOption[] = [
  { value: "popular", label: "Popular", icon: <Flame /> },
  { value: "newest", label: "Newest", icon: <CalendarPlus /> },
  { value: "biggest-pot", label: "Biggest Pot", icon: <Coins /> },
  { value: "yes-odds-desc", label: "Most Bullish", icon: <ArrowUpCircle /> },
  { value: "yes-odds-asc", label: "Most Bearish", icon: <ArrowDownCircle /> },
];

const categoryOptions: FilterOption[] = [
  { value: "all", label: "All Categories", icon: <Layers /> },
  { value: "ai", label: "AI", icon: <Bot /> },
  { value: "saas", label: "SaaS", icon: <Sparkles /> },
  { value: "developer-tools", label: "Dev Tools", icon: <Code2 /> },
  { value: "ecommerce", label: "E-commerce", icon: <ShoppingCart /> },
  { value: "no-code", label: "No-Code", icon: <Blocks /> },
  { value: "analytics", label: "Analytics", icon: <BarChart3 /> },
  { value: "content-creation", label: "Content", icon: <Pen /> },
  { value: "social-media", label: "Social", icon: <Share2 /> },
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
          (key === "sort" && value === "popular")
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

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={filters.status} options={statusOptions} onChange={(v) => setFilter("status", v)} />
        <FilterSelect value={filters.type} options={typeOptions} onChange={(v) => setFilter("type", v)} />
        <FilterSelect value={filters.category} options={categoryOptions} onChange={(v) => setFilter("category", v)} />
        <FilterSelect value={filters.sort} options={sortOptions} onChange={(v) => setFilter("sort", v)} />
      </div>

      {children}
    </div>
  );
}
