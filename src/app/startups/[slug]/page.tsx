import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketCard } from "@/components/market/market-card";
import { MrrChart } from "@/components/startup/mrr-chart";
import { FounderCard } from "@/components/startup/founder-card";
import {
  getStartupBySlug,
  getMarketsForStartup,
  getStartupSentiment,
  getStartupsByFounder,
  getMrrHistory,
  formatCents,
} from "@/lib/data";
import { ExternalLink, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StartupPage({ params }: PageProps) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();

  const [allMarkets, mrrData] = await Promise.all([
    getMarketsForStartup(slug),
    getMrrHistory(slug),
  ]);

  const openMarkets = allMarkets.filter((m) => m.status === "open");
  const resolvedMarkets = allMarkets.filter((m) => m.status === "resolved");
  const sentiment = getStartupSentiment(allMarkets);
  const growthPositive = (startup.growth30d ?? 0) >= 0;
  const resolvedCorrectly = resolvedMarkets.filter((m) => m.resolvedOutcome === "yes").length;

  const founderData = await Promise.all(
    startup.cofounders.map(async (founder) => {
      const allStartups = await getStartupsByFounder(founder.xHandle);
      const founderMarkets: Awaited<ReturnType<typeof getMarketsForStartup>> = [];
      for (const s of allStartups) {
        const m = await getMarketsForStartup(s.slug);
        founderMarkets.push(...m);
      }
      return { founder, allStartups, allMarkets: founderMarkets };
    })
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-5 p-6">
          {startup.onSale && (
            <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-sm font-medium text-warning">
              For Sale — Asking {startup.askingPrice ? formatCents(startup.askingPrice) : "N/A"}
              {startup.multiple ? ` (${startup.multiple.toFixed(1)}x multiple)` : ""}
            </div>
          )}

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {startup.icon ? (
                <img src={startup.icon} alt={startup.name} className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                  {startup.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{startup.name}</h1>
                <p className="mt-0.5 text-sm text-base-content/50">{startup.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {startup.website && (
                <a
                  href={startup.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary transition-colors hover:brightness-125"
                >
                  Website <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <a
                href={`https://trustmrr.com/startup/${startup.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-base-content/50 transition-colors hover:text-base-content"
              >
                TrustMRR <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="mono-num text-2xl font-bold">{formatCents(startup.revenue.mrr)}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">MRR</div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                {growthPositive ? <TrendingUp className="h-5 w-5 text-yes" /> : <TrendingDown className="h-5 w-5 text-no" />}
                <span className={`mono-num text-2xl font-bold ${growthPositive ? "text-yes" : "text-no"}`}>
                  {startup.growth30d !== null ? `${(startup.growth30d * 100).toFixed(0)}%` : "N/A"}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">30d Growth</div>
            </div>
            <div>
              <div className="mono-num text-2xl font-bold">{formatCents(startup.revenue.total)}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">Total Revenue</div>
            </div>
            <div>
              <div className="mono-num flex items-center gap-1.5 text-2xl font-bold">
                <Users className="h-5 w-5 text-base-content/50" />
                {startup.customers.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">Customers</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {startup.category && <span className="badge badge-primary badge-outline badge-sm">{startup.category}</span>}
            <span className="badge badge-neutral badge-sm">{startup.paymentProvider}</span>
            {startup.foundedDate && (
              <span className="badge badge-neutral badge-sm gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(startup.foundedDate).getFullYear()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sentiment */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">Community Sentiment</span>
            <span className={`mono-num text-lg font-bold ${sentiment >= 50 ? "text-yes" : "text-no"}`}>
              {sentiment}% bullish
            </span>
          </div>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-base-300">
            <div className="rounded-full bg-yes transition-all duration-700" style={{ width: `${sentiment}%` }} />
            <div className="rounded-full bg-no transition-all duration-700" style={{ width: `${100 - sentiment}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card bg-base-100 border border-base-300 lg:col-span-2">
          <div className="card-body p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-base-content/50">MRR History</h3>
            <MrrChart slug={startup.slug} data={mrrData} height={240} />
          </div>
        </div>

        {founderData.map((fd) => (
          <FounderCard
            key={fd.founder.xHandle}
            founder={fd.founder}
            xFollowerCount={startup.xFollowerCount}
            allStartups={fd.allStartups}
            allMarkets={fd.allMarkets}
          />
        ))}
      </div>

      {openMarkets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Active Markets</h2>
          <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openMarkets.map((m) => <MarketCard key={m.id} market={m} startup={startup} />)}
          </div>
        </div>
      )}

      {resolvedMarkets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Market History</h2>
            <span className="mono-num text-sm text-base-content/50">
              {Math.round((resolvedCorrectly / resolvedMarkets.length) * 100)}% correct
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resolvedMarkets.map((m) => <MarketCard key={m.id} market={m} startup={startup} />)}
          </div>
        </div>
      )}
    </div>
  );
}
