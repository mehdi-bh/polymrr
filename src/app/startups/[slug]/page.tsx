import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketCard } from "@/components/market/market-card";
import { OddsBar } from "@/components/market/odds-bar";
import Image from "next/image";
import { FounderCard } from "@/components/startup/founder-card";
import {
  getStartupBySlug,
  getMarketsForStartup,
  getStartupSentiment,
  getStartupsByFounder,
  formatCents,
} from "@/lib/data";
import { ExternalLink, TrendingUp, TrendingDown, Plus, DollarSign, Activity, CalendarDays, MessageSquare } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) return {};
  return {
    title: `${startup.name} — Prediction Markets`,
    description: `${startup.description}. Current MRR: ${formatCents(startup.revenue.mrr)}. Track ${startup.name}'s growth and bet on their future.`,
    openGraph: {
      title: `${startup.name} on PolyMRR`,
      description: `${startup.description}. MRR: ${formatCents(startup.revenue.mrr)}.`,
    },
  };
}

export default async function StartupPage({ params }: PageProps) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();

  const allMarkets = await getMarketsForStartup(slug);

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
            <Link
              href={`/markets/create?startup=${startup.slug}`}
              className="btn btn-primary btn-sm gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Market
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="mono-num text-2xl font-bold">{startup.revenue.total > 0 ? formatCents(startup.revenue.total) : "-"}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">
                <DollarSign className="h-3 w-3" /> Total Revenue
              </div>
            </div>
            <div>
              <div className="mono-num text-2xl font-bold">{startup.revenue.mrr > 0 ? formatCents(startup.revenue.mrr) : "-"}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">
                <Activity className="h-3 w-3" /> MRR
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                {startup.growth30d !== null && startup.growth30d !== 0 ? (
                  <>
                    {growthPositive ? <TrendingUp className="h-5 w-5 text-yes" /> : <TrendingDown className="h-5 w-5 text-no" />}
                    <span className={`mono-num text-2xl font-bold ${growthPositive ? "text-yes" : "text-no"}`}>
                      {startup.growth30d.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="mono-num text-2xl font-bold">-</span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">
                <TrendingUp className="h-3 w-3" /> 30d Growth
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {startup.foundedDate
                  ? new Date(startup.foundedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  : "-"}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">
                <CalendarDays className="h-3 w-3" /> Founded
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {startup.category && <span className="badge badge-primary badge-outline badge-sm">{startup.category}</span>}
              <span className="badge badge-neutral badge-sm">{startup.paymentProvider}</span>
            </div>
            <div className="flex items-center gap-3">
              {startup.website && (
                <a
                  href={startup.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:brightness-125"
                >
                  Website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-5">
          <div className="mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-base-content/50">
              <MessageSquare className="h-3.5 w-3.5" /> Community Sentiment
            </span>
          </div>
          <OddsBar yesOdds={sentiment} labels={{ yes: "BULLISH", no: "BEARISH" }} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <a
            href={`https://trustmrr.com/startup/${startup.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-[13px] font-medium text-primary/80 transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          >
            <Image src="/trustmrr.webp" alt="TrustMRR" width={18} height={18} className="rounded-sm" />
            View on TrustMRR
          </a>

          {openMarkets.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">Active Markets</h2>
              <div className="stagger-children grid gap-4 sm:grid-cols-2">
                {openMarkets.map((m) => <MarketCard key={m.id} market={m} startup={startup} />)}
              </div>
            </div>
          )}
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
