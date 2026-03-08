import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PolyMRR — Prediction Markets for Indie Startups",
    short_name: "PolyMRR",
    description: "Bet on real indie startup outcomes with virtual credits. Markets powered by TrustMRR verified revenue.",
    start_url: "/",
    display: "standalone",
    background_color: "#16161f",
    theme_color: "#f5a623",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
