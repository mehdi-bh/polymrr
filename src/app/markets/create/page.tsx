import { redirect } from "next/navigation";
import { getCurrentUser, getStartups, getStartupsByFounder } from "@/lib/data";
import { CreateMarketForm } from "@/components/market/create-market-form";

interface PageProps {
  searchParams: Promise<{ startup?: string; founder?: string }>;
}

export default async function CreateMarketPage({ searchParams }: PageProps) {
  const [user, startups, params] = await Promise.all([
    getCurrentUser(),
    getStartups(),
    searchParams,
  ]);

  if (!user) {
    redirect("/");
  }

  const initialStartupSlug = startups.some((s) => s.slug === params.startup)
    ? params.startup
    : undefined;

  // Founder mode: prefill founder data
  let initialFounder: { xHandle: string; xName: string | null; startups: typeof startups } | undefined;
  if (params.founder) {
    const founderStartups = await getStartupsByFounder(params.founder);
    if (founderStartups.length > 0) {
      const cofounder = founderStartups[0].cofounders.find((c) => c.xHandle === params.founder);
      initialFounder = {
        xHandle: params.founder,
        xName: cofounder?.xName ?? null,
        startups: founderStartups,
      };
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <CreateMarketForm
        startups={startups}
        user={user}
        initialStartupSlug={initialStartupSlug}
        initialFounder={initialFounder}
      />
    </div>
  );
}
