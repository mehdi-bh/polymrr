export const OG = {
  width: 1200,
  height: 630,
  bg: "#16161f",
  gold: "#f5a623",
  green: "#34d399",
  red: "#f87171",
  text: "#e5e5e5",
  muted: "#a0a0b0",
  subtle: "#555565",
  border: "#252530",
};

export function OgLogo({ size = 32 }: { size?: number } = {}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={OG.gold}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M7 14l4 -4 4 4 4 -6" />
      </svg>
      <span style={{ fontSize: 26, fontWeight: 800, color: OG.text }}>
        Poly<span style={{ color: OG.gold }}>MRR</span>
      </span>
    </div>
  );
}

export async function loadExternalImage(
  url: string
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = (res.headers.get("content-type") ?? "image/png").split(";")[0].trim();
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function formatCentsShort(cents: number): string {
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(cents % 100_000 === 0 ? 0 : 1)}k`;
  if (cents >= 100) return `$${(cents / 100).toFixed(0)}`;
  return `$${(cents / 100).toFixed(2)}`;
}
