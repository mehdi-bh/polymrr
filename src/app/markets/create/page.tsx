import { redirect } from "next/navigation";
import { getCurrentUser, getStartups, getStartupBySlug, getStartupsByFounder, getOpenMarkets } from "@/lib/data";
import { CreateMarketForm } from "@/components/market/create-market-form";

interface PageProps {
  searchParams: Promise<{ startup?: string; founder?: string }>;
}

export default async function CreateMarketPage({ searchParams }: PageProps) {
  const [user, startups, openMarkets, params] = await Promise.all([
    getCurrentUser(),
    getStartups(),
    getOpenMarkets(),
    searchParams,
  ]);

  if (!user) {
    redirect("/");
  }

  // Validate startup slug directly from DB
  const initialStartup = params.startup
    ? await getStartupBySlug(params.startup)
    : undefined;

  // Founder mode: prefill founder data
  let initialFounder: { xHandle: string; xName: string | null; startups: typeof startups } | undefined;
  if (params.founder) {
    const founderStartups = await getStartupsByFounder(params.founder);
    if (founderStartups.length > 0) {
      initialFounder = {
        xHandle: params.founder,
        xName: null,
        startups: founderStartups,
      };
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <CreateMarketForm
        key={initialFounder?.xHandle ?? initialStartup?.slug ?? "picker"}
        startups={startups}
        user={user}
        initialStartup={initialStartup}
        initialFounder={initialFounder}
        openMarkets={openMarkets}
      />
    </div>
  );
}
