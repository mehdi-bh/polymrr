import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;
  return user.email === process.env.ADMIN_EMAIL;
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sync_log")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  console.log(`[progress] id=${id} status=${data?.status} details_keys=${data?.details ? Object.keys(data.details).join(",") : "null"} error=${error?.message ?? "none"}`);

  return NextResponse.json({ log: data ?? null });
}
