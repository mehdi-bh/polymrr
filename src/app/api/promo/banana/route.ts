import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PROMO_FONTS, PROMO_COLORS } from "@/components/promo/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slotIndex, startupSlug, customName, customIcon, customWebsite, tagline, font, color } = await request.json();
  if (slotIndex == null || (!startupSlug && !customName)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const safeFont = PROMO_FONTS.find((f) => f.id === font)?.id ?? "inconsolata";
  const safeColor = PROMO_COLORS.find((c) => c.hex === color)?.hex ?? "#f59e0b";

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("purchase_promo_slot", {
    p_user_id: user.id,
    p_slot_index: slotIndex,
    p_startup_slug: startupSlug || null,
    p_custom_name: customName || null,
    p_custom_icon: customIcon || null,
    p_custom_website: customWebsite || null,
    p_tagline: tagline || "",
    p_font: safeFont,
    p_color: safeColor,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Insufficient credits")) {
      return NextResponse.json({ error: "Not enough bananas" }, { status: 400 });
    }
    if (msg.includes("Slot not available")) {
      return NextResponse.json({ error: "Slot not available" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true, slotId: data });
}
