import { getStartups, getMarketsForStartup, getStartupSentiment } from "@/lib/data";
import { StartupsClient } from "./startups-client";

export default async function StartupsPage() {
  const startups = await getStartups();

  const enriched = await Promise.all(
    startups.map(async (s) => {
      const markets = await getMarketsForStartup(s.slug);
      const activeMarketCount = markets.filter((m) => m.status === "open").length;
      const sentiment = getStartupSentiment(markets);
      return { startup: s, activeMarketCount, sentiment };
    })
  );

  return <StartupsClient startups={enriched} />;
}
