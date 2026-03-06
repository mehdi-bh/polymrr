import type { Metadata } from "next";
import { Inconsolata } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

const inconsolata = Inconsolata({ variable: "--font-inconsolata", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PolyMRR — Prediction Markets for Indie Startups",
  description: "Bet on real indie startup outcomes. Markets powered by TrustMRR verified revenue data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="polymrr">
      <body className={`${inconsolata.variable} font-sans antialiased`}>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
