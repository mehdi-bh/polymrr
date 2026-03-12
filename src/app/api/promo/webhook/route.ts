import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PROMO_DURATION_DAYS } from "@/components/promo/constants";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const promoSlotId = session.metadata?.promoSlotId;

    if (promoSlotId) {
      const admin = createAdminClient();
      // Activate the slot — idempotent (skip if already active)
      await admin
        .from("promo_slots")
        .update({
          status: "active",
          expires_at: new Date(Date.now() + PROMO_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", parseInt(promoSlotId))
        .eq("stripe_session_id", session.id)
        .eq("status", "pending");
    }
  }

  return NextResponse.json({ received: true });
}
