import Link from "next/link";
import { getMarkets, getStartups, getCurrentUser } from "@/lib/data";
import { MarketsClient } from "./markets-client";
import { Plus } from "lucide-react";

export default async function MarketsPage() {
  const [markets, startups, user] = await Promise.all([
    getMarkets(),
    getStartups(),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-4">
      {user && (
        <div className="flex justify-end">
          <Link href="/markets/create" className="btn btn-primary btn-sm gap-1.5">
            <Plus className="h-4 w-4" />
            Create Market
          </Link>
        </div>
      )}
      <MarketsClient markets={markets} startups={startups} />
    </div>
  );
}
