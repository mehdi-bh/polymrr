import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { PROMO_FONTS, PROMO_COLORS, STRIPE_PRICE_CENTS, PROMO_SLOT_NAME, PROMO_DURATION_LABEL } from "@/components/promo/constants";

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

  // Clean up stale pending slots (older than 30 min)
  await admin
    .from("promo_slots")
    .delete()
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

  // Check availability
  const { data: existing } = await admin
    .from("promo_slots")
    .select("id")
    .eq("slot_index", slotIndex)
    .in("status", ["active", "pending"])
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Slot not available" }, { status: 409 });
  }

  // Insert pending row to claim the slot
  const { data: row, error: insertError } = await admin
    .from("promo_slots")
    .upsert({
      slot_index: slotIndex,
      user_id: user.id,
      startup_slug: startupSlug || null,
      custom_name: customName || null,
      custom_icon: customIcon || null,
      custom_website: customWebsite || null,
      tagline: tagline || "",
      font: safeFont,
      color: safeColor,
      payment_method: "stripe",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "slot_index" })
    .select("id")
    .single();

  if (insertError || !row) {
    return NextResponse.json({ error: "Failed to claim slot" }, { status: 500 });
  }

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: STRIPE_PRICE_CENTS,
          product_data: { name: `${PROMO_SLOT_NAME} (${PROMO_DURATION_LABEL})` },
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    metadata: { promoSlotId: String(row.id), userId: user.id },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.polymrr.com"}/?promo_success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.polymrr.com"}/?promo_cancelled=1`,
  });

  // Store stripe session ID
  await admin
    .from("promo_slots")
    .update({ stripe_session_id: session.id })
    .eq("id", row.id);

  return NextResponse.json({ url: session.url });
}
