import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { MIN_BET } from "@/lib/lmsr";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { marketId, side, amount } = body;

  if (!marketId || !side || !amount) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (side !== "yes" && side !== "no") {
    return NextResponse.json({ error: "Side must be yes or no" }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < MIN_BET) {
    return NextResponse.json({ error: `Minimum bet is ${MIN_BET} credits` }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("place_bet", {
    p_user_id: user.id,
    p_market_id: marketId,
    p_side: side,
    p_amount: amount,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
