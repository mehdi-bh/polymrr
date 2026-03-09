import { NextRequest, NextResponse } from "next/server";
import { getStartupsPaginated, getFoundersPaginated } from "@/lib/data";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tab = sp.get("tab") ?? "startups";
  const search = sp.get("q") ?? "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const perPage = 8;

  if (tab === "founders") {
    const { data, total } = await getFoundersPaginated({
      search: search || undefined,
      sort: "followers-desc",
      page,
      perPage,
    });
    return NextResponse.json({
      founders: data.map((f) => ({
        xHandle: f.xHandle,
        xName: f.xName,
        totalFollowers: f.totalFollowers,
        startupCount: f.startups.length,
      })),
      total,
    });
  }

  const { data, total } = await getStartupsPaginated({
    search: search || undefined,
    sort: "mrr-desc",
    page,
    perPage,
  });
  return NextResponse.json({
    startups: data.map((s) => ({
      slug: s.slug,
      name: s.name,
      icon: s.icon,
      mrr: s.revenue.mrr,
      totalRevenue: s.revenue.total,
    })),
    total,
  });
}
