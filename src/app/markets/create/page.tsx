import { redirect } from "next/navigation";
import { getCurrentUser, getStartups } from "@/lib/data";
import { CreateMarketForm } from "@/components/market/create-market-form";

interface PageProps {
  searchParams: Promise<{ startup?: string }>;
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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <CreateMarketForm
        startups={startups}
        user={user}
        initialStartupSlug={initialStartupSlug}
      />
    </div>
  );
}
