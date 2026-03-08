"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { FilterPill, FilterGroup } from "@/components/ui/filter-pill";
import { SearchInput } from "@/components/ui/search-input";
import type { MarketType, MarketStatus, TrustMRRCategory } from "@/lib/types";
import {
  CircleDot,
  Clock,
  CheckCircle2,
  Target,
  TrendingUp,
  Handshake,
  HeartPulse,
  Sparkles,
  Code2,
  ShoppingCart,
  Blocks,
  BarChart3,
  Pen,
  Share2,
  Flame,
  Star,
  CalendarPlus,
  Coins,
  ArrowUpCircle,
  ArrowDownCircle,
  Layers,
  Bot,
} from "lucide-react";

const statusOptions: { value: MarketStatus | "closing-soon" | "all"; label: string; icon: ReactNode }[] = [
  { value: "all", label: "All", icon: <Layers /> },
  { value: "open", label: "Open", icon: <CircleDot /> },
  { value: "closing-soon", label: "Closing Soon", icon: <Clock /> },
  { value: "resolved", label: "Resolved", icon: <CheckCircle2 /> },
];

const typeOptions: { value: MarketType | "all"; label: string; icon: ReactNode }[] = [
  { value: "all", label: "All", icon: <Layers /> },
  { value: "mrr-target", label: "MRR Target", icon: <Target /> },
  { value: "growth-race", label: "Growth", icon: <TrendingUp /> },
  { value: "acquisition", label: "Acquisition", icon: <Handshake /> },
  { value: "survival", label: "Survival", icon: <HeartPulse /> },
];

const sortOptions: { value: string; label: string; icon: ReactNode }[] = [
  { value: "closing-soon", label: "Closing Soon", icon: <Clock /> },
  { value: "popular", label: "Popular", icon: <Flame /> },
  { value: "newest", label: "Newest", icon: <CalendarPlus /> },
  { value: "biggest-pot", label: "Biggest Pot", icon: <Coins /> },
  { value: "yes-odds-desc", label: "Most Bullish", icon: <ArrowUpCircle /> },
  { value: "yes-odds-asc", label: "Most Bearish", icon: <ArrowDownCircle /> },
];

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

      <div className="flex flex-wrap gap-x-6 gap-y-4">
        <FilterGroup label="Status" icon={<CircleDot />}>
          {statusOptions.map((o) => (
            <FilterPill key={o.value} active={filters.status === o.value} onClick={() => setFilter("status", o.value)} icon={o.icon}>
              {o.label}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="Type" icon={<Target />}>
          {typeOptions.map((o) => (
            <FilterPill key={o.value} active={filters.type === o.value} onClick={() => setFilter("type", o.value)} icon={o.icon}>
              {o.label}
            </FilterPill>
          ))}
        </FilterGroup>

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
      </div>

      {children}
    </div>
  );
}
