import { NextRequest, NextResponse } from "next/server";
import { getStartupBySlug } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(startup);
}
