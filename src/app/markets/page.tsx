import { getMarkets, getStartups } from "@/lib/data";
import { MarketsClient } from "./markets-client";

export default async function MarketsPage() {
  const [markets, startups] = await Promise.all([getMarkets(), getStartups()]);

  return <MarketsClient markets={markets} startups={startups} />;
}
