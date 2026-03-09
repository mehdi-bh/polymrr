import { ImageResponse } from "next/og";
import { getUserById } from "@/lib/data";
import { OG, OgLogo, loadExternalImage } from "@/lib/og";

export const alt = "PolyMRR Profile";
export const size = { width: OG.width, height: OG.height };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return new Response("Not found", { status: 404 });

  const avatarUri = user.avatarUrl ? await loadExternalImage(user.avatarUrl) : null;

  return new ImageResponse(
    (
      <div
        style={{
          background: OG.bg,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "monospace",
          padding: "48px 60px",
        }}
      >
        {/* Logo */}
        <OgLogo />

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          {/* Avatar */}
          {avatarUri ? (
            <img
              src={avatarUri}
              width={120}
              height={120}
              style={{ borderRadius: "50%" }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: OG.border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 48,
                color: OG.muted,
              }}
            >
              {(user.xName?.[0] ?? "?").toUpperCase()}
            </div>
          )}

          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: OG.text }}>
              {user.xName}
            </span>
            {user.xHandle && (
              <span style={{ fontSize: 24, color: OG.muted }}>@{user.xHandle}</span>
            )}
          </div>

          {/* Credits */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: 28,
              color: OG.gold,
              fontWeight: 700,
            }}
          >
            {user.credits.toLocaleString()} bananas
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <span style={{ fontSize: 16, color: OG.subtle }}>polymrr.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
