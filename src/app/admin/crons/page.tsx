import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CronDashboard } from "./cron-dashboard";

export default async function AdminCronsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Cron Jobs</h1>
      <CronDashboard />
    </div>
  );
}
