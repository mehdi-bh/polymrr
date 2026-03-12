import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { PROMO_FONTS, PROMO_COLORS } from "@/components/promo/constants";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: slot } = await admin
    .from("promo_slots")
    .select("user_id, status")
    .eq("id", parseInt(id))
    .single();

  if (!slot || slot.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (slot.status !== "active") {
    return NextResponse.json({ error: "Slot not active" }, { status: 400 });
  }

  const { tagline, font, color } = await request.json();

  const safeFont = font !== undefined ? (PROMO_FONTS.find((f) => f.id === font)?.id ?? undefined) : undefined;
  const safeColor = color !== undefined ? (PROMO_COLORS.find((c) => c.hex === color)?.hex ?? undefined) : undefined;

  await admin
    .from("promo_slots")
    .update({
      ...(tagline !== undefined && { tagline: String(tagline).slice(0, 60) }),
      ...(safeFont && { font: safeFont }),
      ...(safeColor && { color: safeColor }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parseInt(id));

  return NextResponse.json({ success: true });
}
