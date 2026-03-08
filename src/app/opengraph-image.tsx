import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PolyMRR — Prediction Markets for Indie Startups";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#16161f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <div style={{ fontSize: "72px", fontWeight: 800, color: "#e5e5e5", letterSpacing: "-2px" }}>
            Poly<span style={{ color: "#f5a623" }}>MRR</span>
          </div>
        </div>
        <div style={{ fontSize: "28px", color: "#a0a0a0", textAlign: "center", maxWidth: "700px", lineHeight: 1.4 }}>
          Prediction markets for indie startups. Bet on real outcomes with virtual credits.
        </div>
        <div
          style={{
            display: "flex",
            gap: "40px",
            marginTop: "48px",
            fontSize: "18px",
            color: "#666",
          }}
        >
          <span>Verified by TrustMRR</span>
          <span style={{ color: "#f5a623" }}>polymrr.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
