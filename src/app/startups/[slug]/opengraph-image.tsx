import { ImageResponse } from "next/og";
import { getStartupBySlug } from "@/lib/data";
import { OG, OgLogo, loadExternalImage, formatCentsShort } from "@/lib/og";

export const alt = "PolyMRR Startup";
export const size = { width: OG.width, height: OG.height };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) return new Response("Not found", { status: 404 });

  const startupIconUri = startup.icon ? await loadExternalImage(startup.icon) : null;
  const mrr = formatCentsShort(startup.revenue.mrr);
  const totalRevenue = formatCentsShort(startup.revenue.total);

  return new ImageResponse(
    (
      <div
        style={{
          background: OG.bg,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "48px 60px",
          fontFamily: "monospace",
        }}
      >
        {/* Header */}
        <OgLogo />

        {/* Startup info */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            gap: "40px",
          }}
        >
          {startupIconUri && (
            <img
              src={startupIconUri}
              width={120}
              height={120}
              style={{ borderRadius: 20 }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: OG.text }}>
              {startup.name}
            </span>
            {startup.description && (
              <span
                style={{
                  fontSize: 22,
                  color: OG.muted,
                  lineHeight: 1.4,
                  maxWidth: "90%",
                }}
              >
                {startup.description.length > 120
                  ? startup.description.slice(0, 120) + "..."
                  : startup.description}
              </span>
            )}
          </div>
        </div>

        {/* Stats footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "40px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: 16, color: OG.subtle }}>MRR</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: OG.gold }}>{mrr}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: 16, color: OG.subtle }}>Total Revenue</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: OG.gold }}>{totalRevenue}</span>
            </div>
          </div>
          <span style={{ fontSize: 16, color: OG.subtle }}>polymrr.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
