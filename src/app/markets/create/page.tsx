import { redirect } from "next/navigation";
import { getCurrentUser, getStartups } from "@/lib/data";
import { CreateMarketForm } from "@/components/market/create-market-form";

export default async function CreateMarketPage() {
  const [user, startups] = await Promise.all([getCurrentUser(), getStartups()]);

  if (!user) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <CreateMarketForm startups={startups} user={user} />
    </div>
  );
}
