import { Suspense } from "react";
import type { Metadata } from "next";
import { getStartupsPaginated, getStartupMarketStats } from "@/lib/data";
import { StartupsFilters } from "./startups-client";
import { StartupCard } from "@/components/startup/startup-card";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton } from "@/components/ui/card-skeleton";

export const metadata: Metadata = {
  title: "Startups",
  description: "Explore indie startups with verified MRR data from TrustMRR. Track growth, revenue, and community sentiment.",
  alternates: { canonical: "/startups" },
};

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const PER_PAGE = 12;

export default async function StartupsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = {
    category: params.category ?? "all",
    sort: params.sort ?? "mrr-desc",
    forSale: params.forSale === "true",
    search: params.q ?? "",
  };
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const key = `${filters.category}-${filters.sort}-${filters.forSale}-${filters.search}-${page}`;

  return (
    <StartupsFilters filters={filters}>
      <Suspense key={key} fallback={<CardGridSkeleton variant="startup" />}>
        <StartupsResults filters={filters} page={page} />
      </Suspense>
    </StartupsFilters>
  );
}

async function StartupsResults({ filters, page }: { filters: { category: string; sort: string; forSale: boolean; search: string }; page: number }) {
  const { data: startups, total } = await getStartupsPaginated({
    ...filters,
    search: filters.search || undefined,
    page,
    perPage: PER_PAGE,
  });

  const stats = await getStartupMarketStats(startups.map((s) => s.slug));
  const totalPages = Math.ceil(total / PER_PAGE);

  if (startups.length === 0) {
    const msg = filters.search
      ? `No startups found for "${filters.search}".`
      : "No startups match your filters.";
    return <p className="py-16 text-center text-base-content/50">{msg}</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between text-xs text-base-content/50">
        <span>{total} startup{total !== 1 ? "s" : ""}</span>
        {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
      </div>
      <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {startups.map((s) => {
          const st = stats.get(s.slug);
          return (
            <StartupCard
              key={s.slug}
              startup={s}
              activeMarketCount={st?.activeMarketCount ?? 0}
              sentiment={st?.sentiment ?? 50}
            />
          );
        })}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} />
    </>
  );
}
