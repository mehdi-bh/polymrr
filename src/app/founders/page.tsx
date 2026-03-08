import { Suspense } from "react";
import type { Metadata } from "next";
import { getFoundersPaginated, getOpenMarkets } from "@/lib/data";
import { FoundersFilters } from "./founders-client";
import { FounderPageCard } from "@/components/founder/founder-page-card";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton } from "@/components/ui/card-skeleton";

export const metadata: Metadata = {
  title: "Founders",
  description: "Explore indie founders building startups with verified revenue. Bet on their growth, revenue, and next moves.",
  alternates: { canonical: "/founders" },
};

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const PER_PAGE = 12;

export default async function FoundersPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = {
    sort: params.sort ?? "revenue-desc",
    search: params.q ?? "",
  };
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const key = `${filters.sort}-${filters.search}-${page}`;

  return (
    <FoundersFilters filters={filters}>
      <Suspense key={key} fallback={<CardGridSkeleton variant="startup" />}>
        <FoundersResults filters={filters} page={page} />
      </Suspense>
    </FoundersFilters>
  );
}

async function FoundersResults({ filters, page }: { filters: { sort: string; search: string }; page: number }) {
  const [{ data: founders, total }, openMarkets] = await Promise.all([
    getFoundersPaginated({
      sort: filters.sort,
      search: filters.search || undefined,
      page,
      perPage: PER_PAGE,
    }),
    getOpenMarkets(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  if (founders.length === 0) {
    const msg = filters.search
      ? `No founders found for "${filters.search}".`
      : "No founders found.";
    return <p className="py-16 text-center text-base-content/50">{msg}</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between text-xs text-base-content/50">
        <span>{total} founder{total !== 1 ? "s" : ""}</span>
        {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
      </div>
      <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {founders.map((f) => {
          const slugs = new Set(f.startups.map((s) => s.slug));
          const mc = openMarkets.filter(
            (m) => m.founderXHandle === f.xHandle || slugs.has(m.startupSlug)
          ).length;
          return (
            <FounderPageCard
              key={f.xHandle}
              xHandle={f.xHandle}
              xName={f.xName}
              startups={f.startups}
              totalRevenue={f.totalRevenue}
              totalFollowers={f.totalFollowers}
              activeMarketCount={mc}
            />
          );
        })}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} />
    </>
  );
}
