import { Suspense } from "react";
import type { Metadata } from "next";
import { getMarketsPaginated, getCurrentUser } from "@/lib/data";
import { MarketsFilters } from "./markets-client";
import { MarketCard } from "@/components/market/market-card";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton } from "@/components/ui/card-skeleton";

export const metadata: Metadata = {
  title: "Markets",
  description: "Browse and bet on prediction markets for indie startups. Will they hit their MRR target? Who wins the growth race?",
  alternates: { canonical: "/markets" },
};

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const PER_PAGE = 12;

export default async function MarketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = {
    status: params.status ?? "all",
    type: params.type ?? "all",
    category: params.category ?? "all",
    sort: params.sort ?? "popular",
    search: params.q ?? "",
  };
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const key = `${filters.status}-${filters.type}-${filters.category}-${filters.sort}-${filters.search}-${page}`;

  const user = await getCurrentUser();

  return (
    <MarketsFilters filters={filters} showCreateButton={!!user}>
      <Suspense key={key} fallback={<CardGridSkeleton variant="market" />}>
        <MarketsResults filters={filters} page={page} />
      </Suspense>
    </MarketsFilters>
  );
}

async function MarketsResults({ filters, page }: { filters: { status: string; type: string; category: string; sort: string; search: string }; page: number }) {
  const { data: markets, total, startups: startupMap } = await getMarketsPaginated({
    status: filters.status,
    type: filters.type === "all" ? undefined : filters.type,
    category: filters.category === "all" ? undefined : filters.category,
    sort: filters.sort,
    search: filters.search || undefined,
    page,
    perPage: PER_PAGE,
  });

  const startups = Object.fromEntries(startupMap);
  const totalPages = Math.ceil(total / PER_PAGE);

  if (markets.length === 0) {
    const msg = filters.search
      ? `No markets found for "${filters.search}".`
      : "No markets match your filters.";
    return <p className="py-16 text-center text-base-content/50">{msg}</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between text-xs text-base-content/50">
        <span>{total} market{total !== 1 ? "s" : ""}</span>
        {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
      </div>
      <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((market) => {
          const startup = startups[market.startupSlug];
          if (!startup) return null;
          return <MarketCard key={market.id} market={market} startup={startup} />;
        })}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} />
    </>
  );
}
