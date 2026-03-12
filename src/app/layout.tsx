import type { Metadata } from "next";
import Script from "next/script";
import { Inconsolata, JetBrains_Mono, Inter, Space_Grotesk, DM_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentUser, getUserQuestCompletions } from "@/lib/data";
import "./globals.css";

const inconsolata = Inconsolata({ variable: "--font-inconsolata", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "600", "700"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["400", "600", "700"] });
const dmMono = DM_Mono({ variable: "--font-dm-mono", subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: {
    default: "PolyMRR — Prediction Markets for Indie Startups",
    template: "%s — PolyMRR",
  },
  description: "Bet on real indie startup outcomes with virtual credits. Prediction markets powered by TrustMRR verified revenue data.",
  metadataBase: new URL("https://www.polymrr.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.polymrr.com",
    siteName: "PolyMRR",
    title: "PolyMRR — Prediction Markets for Indie Startups",
    description: "Bet on real indie startup outcomes with virtual credits. Markets powered by TrustMRR verified revenue.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@mehdibhaddou",
    title: "PolyMRR — Prediction Markets for Indie Startups",
    description: "Bet on real indie startup outcomes with virtual credits. Markets powered by TrustMRR verified revenue.",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  keywords: ["prediction markets", "indie startups", "MRR", "startup betting", "TrustMRR", "indie hackers", "startup growth"],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PolyMRR",
  url: "https://www.polymrr.com",
  description: "Prediction markets for indie startups. Bet on real startup outcomes with virtual credits, powered by TrustMRR verified revenue data.",
  applicationCategory: "Finance",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  creator: {
    "@type": "Organization",
    name: "Arche Labs LTD",
    url: "https://www.polymrr.com",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const completedQuests = user ? await getUserQuestCompletions(user.id) : [];

  return (
    <html lang="en" data-theme="polymrr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <Script
          src="/js/script.js"
          data-website-id="dfid_TK8zUELoEtzSMWKG34YHi"
          data-domain="polymrr.com"
          strategy="afterInteractive"
        />
      <body className={`${inconsolata.variable} ${jetbrainsMono.variable} ${inter.variable} ${spaceGrotesk.variable} ${dmMono.variable} font-sans antialiased flex min-h-dvh flex-col`}>
        <ToastProvider>
          <Navbar user={user} completedQuests={completedQuests} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-20 md:pb-8">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
