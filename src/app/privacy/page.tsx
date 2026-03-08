import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — PolyMRR",
  description: "How PolyMRR handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-up">
      <div>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-base-content/50">Last updated: March 8, 2025</p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-base-content/70 [&_h2]:text-base-content [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-base-content/90">
        <p>
          PolyMRR is operated by Arche Labs LTD, a company incorporated in Cyprus. This policy explains what data we collect, why, and how we handle it.
        </p>

        <h2>What we collect</h2>
        <p>
          When you sign in with Google, we receive your name, email address, and profile picture from Google OAuth. We store this to create and manage your account.
        </p>
        <p>
          We also store your betting activity on the platform (markets you bet on, amounts, outcomes) and any profile information you choose to add, like an X/Twitter handle.
        </p>

        <h2>What we don&apos;t collect</h2>
        <p>
          We don&apos;t collect payment information — PolyMRR uses virtual credits (&ldquo;bananas&rdquo;), not real money. We don&apos;t sell or share your personal data with third parties for marketing purposes.
        </p>

        <h2>Infrastructure &amp; third parties</h2>
        <p>
          <strong>Hosting:</strong> The application is hosted on Vercel (US-based). Your requests are routed through Vercel&apos;s edge network.
        </p>
        <p>
          <strong>Database &amp; Auth:</strong> We use Supabase for data storage and Google OAuth authentication. Supabase processes your data on AWS infrastructure.
        </p>
        <p>
          <strong>Revenue data:</strong> Startup revenue figures displayed on the platform come from TrustMRR, a third-party verification service. We don&apos;t share your personal data with TrustMRR.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies only — specifically, session cookies to keep you signed in. No tracking cookies, no analytics cookies, no ad cookies.
        </p>

        <h2>Your rights</h2>
        <p>
          You can request deletion of your account and all associated data at any time by contacting us. Since we operate under Cyprus/EU jurisdiction, you have full GDPR rights: access, rectification, erasure, portability, and the right to object to processing.
        </p>

        <h2>Contact</h2>
        <p>
          For any privacy-related questions: reach out to us on X at{" "}
          <a href="https://x.com/mehdibhaddou" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@mehdibhaddou</a> or email mehdi at chessigma.com.
        </p>
      </div>
    </div>
  );
}
