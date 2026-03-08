import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — PolyMRR",
  description: "Terms governing your use of PolyMRR.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-up">
      <div>
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-base-content/50">Last updated: March 8, 2025</p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-base-content/70 [&_h2]:text-base-content [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-base-content/90">
        <p>
          PolyMRR is operated by Arche Labs LTD, incorporated in Cyprus. By using the platform, you agree to these terms.
        </p>

        <h2>The service</h2>
        <p>
          PolyMRR is a prediction market platform where users bet on indie startup outcomes (revenue targets, growth milestones, acquisitions, survival). Markets are resolved based on verified revenue data from TrustMRR.
        </p>

        <h2>Virtual credits, not real money</h2>
        <p>
          <strong>PolyMRR uses virtual credits called &ldquo;bananas.&rdquo;</strong> These have no monetary value. You cannot purchase, sell, exchange, or redeem bananas for real currency. New users receive a starting balance of bananas for free. This is not gambling — no real money is wagered, won, or lost at any point.
        </p>

        <h2>Your account</h2>
        <p>
          You sign in via Google OAuth. You&apos;re responsible for keeping your Google account secure. One account per person — don&apos;t create multiple accounts to game the system.
        </p>

        <h2>Fair play</h2>
        <p>
          Don&apos;t manipulate markets, use bots, exploit bugs, or collude with other users. Don&apos;t use insider information about a startup&apos;s revenue that isn&apos;t publicly available. We reserve the right to void bets and suspend accounts if we detect abuse.
        </p>

        <h2>Market resolution</h2>
        <p>
          Markets resolve based on TrustMRR verified data. In rare cases, we may void a market if the underlying data becomes unreliable or a startup delists from TrustMRR before resolution. Our resolution decisions are final.
        </p>

        <h2>Content and conduct</h2>
        <p>
          Users can create markets. We reserve the right to remove markets that are offensive, nonsensical, or clearly designed to manipulate. Don&apos;t impersonate founders or other users.
        </p>

        <h2>Revenue data accuracy</h2>
        <p>
          Startup revenue data is sourced from TrustMRR. While TrustMRR verifies data through payment processor integrations (Stripe, etc.), we can&apos;t guarantee absolute accuracy. Use the data at your own discretion.
        </p>

        <h2>Availability</h2>
        <p>
          We aim to keep PolyMRR running but make no uptime guarantees. We may modify, suspend, or shut down the service at any time. If we shut down, all open markets will be voided and positions returned.
        </p>

        <h2>Liability</h2>
        <p>
          PolyMRR is provided &ldquo;as is.&rdquo; Since no real money is involved, our liability is limited to the service itself. We&apos;re not liable for any decisions you make based on information displayed on the platform.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms. Continued use after changes means you accept them. We&apos;ll make reasonable efforts to notify users of significant changes.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of Cyprus. Any disputes will be resolved in the courts of Cyprus.
        </p>

        <h2>Contact</h2>
        <p>
          Questions? Reach out on X at{" "}
          <a href="https://x.com/mehdibhaddou" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@mehdibhaddou</a> or email mehdi at chessigma.com.
        </p>
      </div>
    </div>
  );
}
