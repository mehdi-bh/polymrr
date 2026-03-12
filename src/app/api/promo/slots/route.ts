import { NextResponse } from "next/server";
import { getAvailableSlotIndices } from "@/lib/data";

export async function GET() {
  const available = await getAvailableSlotIndices();
  return NextResponse.json({ available });
}
