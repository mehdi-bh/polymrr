"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { FilterSelect, type FilterOption } from "@/components/ui/filter-select";
import { SearchInput } from "@/components/ui/search-input";
import {
  DollarSign, Layers, Heart, ArrowDownAZ,
} from "lucide-react";

const sortOptions: FilterOption[] = [
  { value: "revenue-desc", label: "Highest Revenue", icon: <DollarSign /> },
  { value: "startups-desc", label: "Most Startups", icon: <Layers /> },
  { value: "followers-desc", label: "Most Followers", icon: <Heart /> },
  { value: "alpha", label: "A-Z", icon: <ArrowDownAZ /> },
];

interface FoundersFiltersProps {
  filters: { sort: string; search: string };
  children: ReactNode;
}

export function FoundersFilters({ filters, children }: FoundersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || (key === "sort" && value === "revenue-desc")) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `/founders?${qs}` : "/founders");
    },
    [router, searchParams]
  );

  function setFilter(key: string, value: string) {
    updateParams({ [key]: value, page: undefined });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Founders</h1>

      <SearchInput
        value={filters.search}
        placeholder="Search founders..."
        onChange={(value) => updateParams({ q: value || undefined, page: undefined })}
      />

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={filters.sort} options={sortOptions} onChange={(v) => setFilter("sort", v)} />
      </div>

      {children}
    </div>
  );
}
