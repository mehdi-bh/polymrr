import { ImageResponse } from "next/og";
import { getMarketById, getStartupBySlug } from "@/lib/data";
import { OG, OgLogo, loadExternalImage } from "@/lib/og";

export const alt = "PolyMRR Market";
export const size = { width: OG.width, height: OG.height };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const market = await getMarketById(id);
  if (!market) return new Response("Not found", { status: 404 });

  const isFounderMarket = market.type === "founder" && market.founderXHandle;
  const startup = await getStartupBySlug(market.startupSlug);

  const iconUri = isFounderMarket
    ? await loadExternalImage(`https://unavatar.io/x/${market.founderXHandle}`)
    : startup?.icon ? await loadExternalImage(startup.icon) : null;

  const yesOdds = Math.round(market.yesOdds);
  const noOdds = 100 - yesOdds;
  const label = isFounderMarket
    ? `@${market.founderXHandle}`
    : startup?.name ?? "Market";

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
        {/* Header: logo + startup */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <OgLogo />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {iconUri && (
              <img
                src={iconUri}
                width={28}
                height={28}
                style={{ borderRadius: isFounderMarket ? 14 : 6 }}
              />
            )}
            <span style={{ fontSize: 22, color: OG.muted, fontWeight: 500 }}>{label}</span>
          </div>
        </div>

        {/* Question */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            fontSize: 46,
            fontWeight: 800,
            color: OG.text,
            lineHeight: 1.3,
            maxWidth: "90%",
          }}
        >
          {market.question}
        </div>

        {/* Odds bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "28px",
              borderRadius: "14px",
            }}
          >
            <div
              style={{
                width: `${yesOdds}%`,
                height: "100%",
                background: OG.green,
                borderRadius: yesOdds >= 100 ? "14px" : "14px 0 0 14px",
              }}
            />
            <div
              style={{
                width: `${noOdds}%`,
                height: "100%",
                background: OG.red,
                borderRadius: noOdds >= 100 ? "14px" : "0 14px 14px 0",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: OG.green }}>
              YES {yesOdds}%
            </span>
            <span style={{ fontSize: 16, color: OG.subtle }}>
              {market.totalBettors} bettor{market.totalBettors !== 1 ? "s" : ""} · polymrr.com
            </span>
            <span style={{ fontSize: 28, fontWeight: 700, color: OG.red }}>
              NO {noOdds}%
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
