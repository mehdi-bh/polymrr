import Image from "next/image";
import { LiveFeed } from "@/components/market/live-feed";
import { StatsBar } from "@/components/market/stats-bar";
import { MarketCard } from "@/components/market/market-card";
import { getFeaturedMarkets, getFeedItems, getStartupBySlug, getCurrentUser } from "@/lib/data";
import { SignInButton } from "@/components/ui/sign-in-button";
import { ProductHuntBadge, ProductHuntPopup } from "@/components/ui/product-hunt-badge";

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
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Bet on <span className="text-primary">startups.</span>{" "}
          <span className="inline-flex items-baseline gap-2">
            Win<Image src="/banana.svg" alt="bananas" width={40} height={40} className="inline-block -mb-1 h-6 w-6 sm:h-10 sm:w-10" />
          </span>
        </h1>
        <p className="text-sm text-base-content/50">
          Markets powered by TrustMRR verified data.
        </p>
        <ProductHuntBadge />
      </div>

      <ProductHuntPopup />

      {/* Mobile: Featured → Stats → Feed. Desktop: Stats full → Feed + Featured side by side */}
      <div className="home-grid">
        <div className="min-w-0 space-y-4" style={{ gridArea: 'featured' }}>
          <h2 className="text-lg font-bold">Featured Markets</h2>
          <div className="stagger-children grid gap-4">
            {featured.map((market) => {
              const startup = startupMap.get(market.startupSlug);
              if (!startup) return null;
              return <MarketCard key={market.id} market={market} startup={startup} />;
            })}
          </div>
        </div>
        <div style={{ gridArea: 'stats' }}>
          <StatsBar />
        </div>
        <div className="min-w-0" style={{ gridArea: 'feed' }}>
          <LiveFeed items={feedItems} />
        </div>
      </div>
    </div>
  );
}
