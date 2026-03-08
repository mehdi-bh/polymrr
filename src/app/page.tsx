import Image from "next/image";
import { LiveFeed } from "@/components/market/live-feed";
import { StatsBar } from "@/components/market/stats-bar";
import { MarketCard } from "@/components/market/market-card";
import { getFeaturedMarkets, getFeedItems, getStartupBySlug, getCurrentUser } from "@/lib/data";
import { SignInButton } from "@/components/ui/sign-in-button";

export default async function HomePage() {
  const [featured, feedItems, user] = await Promise.all([
    getFeaturedMarkets(),
    getFeedItems(),
    getCurrentUser(),
  ]);

  const startupMap = new Map<string, Awaited<ReturnType<typeof getStartupBySlug>>>();
  for (const m of featured) {
    if (!startupMap.has(m.startupSlug)) {
      startupMap.set(m.startupSlug, await getStartupBySlug(m.startupSlug));
    }
  }

  return (
    <div className="space-y-10 animate-fade-up">
      {/* Hero */}
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight lg:text-6xl">
          Bet on <span className="text-primary">startups.</span>{" "}
          <span className="inline-flex items-baseline gap-2">
            Win<Image src="/banana.svg" alt="bananas" width={40} height={40} className="inline-block -mb-1" />
          </span>
        </h1>
        <p className="text-sm text-base-content/50">
          Markets powered by TrustMRR verified data.
        </p>
        {!user && (
          <div className="flex flex-col items-center gap-2">
            <SignInButton className="btn btn-primary btn-lg font-bold gap-1.5" />
            <p className="text-xs text-base-content/40">
              Start with 1,000 bananas now.
            </p>
          </div>
        )}
      </div>

      <StatsBar />

      {/* Live Feed + Featured Markets */}
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LiveFeed items={feedItems} />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-bold">Featured Markets</h2>
          <div className="stagger-children grid gap-4">
            {featured.map((market) => {
              const startup = startupMap.get(market.startupSlug);
              if (!startup) return null;
              return <MarketCard key={market.id} market={market} startup={startup} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
