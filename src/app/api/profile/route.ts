import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, string | null> = {};

  if ("x_handle" in body) {
    const xHandle = typeof body.x_handle === "string" ? body.x_handle.trim() : null;
    updates.x_handle = xHandle || null;
  }

  if ("x_name" in body) {
    const xName = typeof body.x_name === "string" ? body.x_name.trim() : null;
    if (xName) updates.x_name = xName;
  }

  if ("avatar_url" in body) {
    const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url.trim() : null;
    updates.avatar_url = avatarUrl || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
