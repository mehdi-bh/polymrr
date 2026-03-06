# PolyMRR — Detailed Product Spec

> Prediction markets for indie startups. Powered by TrustMRR verified revenue data.

---

## 1. Product Vision

PolyMRR lets anyone bet on real indie startup outcomes — MRR milestones, growth races, acquisitions — using virtual credits. Every market resolves automatically from TrustMRR's verified revenue data. No subjectivity, no oracles, no manual resolution for core market types.

The platform serves three distinct audiences with aligned incentives:
- **Players** want status, fun, and a track record that signals credibility
- **Founders** want visibility, accountability, and social proof
- **Acquirers** want a signal layer that doesn't exist anywhere else

---

## 2. App Structure

```
/                          → Landing page
/markets                   → Browse all open markets
/markets/[id]              → Single market page
/startups                  → Browse all startups
/startups/[slug]           → Single startup page
/leaderboard               → Top predictors
/profile/[xHandle]         → Public user profile
/dashboard                 → Private user dashboard (auth required)
```

---

## 3. Page-by-Page Breakdown

---

### 3.1 Landing Page `/`

**Goal:** Communicate the concept in under 5 seconds. Zero friction to first bet.

**Design principle:** No explanatory copy. No "how it works" section. The live feed and market cards make the concept self-evident. A new visitor should understand what PolyMRR is just by watching the feed for 10 seconds.

---

**Layout: two-column above the fold**

```
┌──────────────────────────┬─────────────────────┐
│  Bet on                  │  ● LIVE             │
│  indie startups.         │─────────────────────│
│  Win bragging rights.    │ @marc_louvion        │
│                          │ YES · ShipFast       │
│  Markets powered by      │ "hits $20k MRR"      │
│  TrustMRR verified data. │ 500cr · 2s ago       │
│  All outcomes auto-      │─────────────────────│
│  resolve.                │ @levels              │
│                          │ YES · PhotoAI        │
│  [Sign in with X]        │ "doubles MRR in 60d" │
│  Get 1,000 free credits  │ 1,200cr · 14s ago    │
│                          │─────────────────────│
│  No payment required.    │ @dannypostmaa        │
│                          │ NO · Lemonsqueezy    │
│                          │ "sold in 90 days"    │
│                          │ 300cr · 31s ago      │
└──────────────────────────┴─────────────────────┘
```

**Live feed behavior:**
- Realtime stream of recent bets, newest on top
- New items slide in from the top with a brief highlight animation
- Each row shows: handle / YES or NO badge / startup name / market summary / credits staked / time ago
- Clicking any row navigates to that market page
- No auth required to view — feed is fully public
- Updates every ~3 seconds with simulated or real activity

**Stats bar (below hero, full width):**
- Open Markets / Startups tracked / Bets placed / Total verified revenue ($1.2B from TrustMRR)
- Bets placed counter ticks up in real time

---

**Featured markets grid (below stats bar)**

6 market cards in a 3×2 grid. Each card shows:
- Startup icon + name + current MRR
- Market question in plain English
- YES/NO odds bar (live, updates as bets come in)
- Total credits in pool + number of bettors + time to close
- "FOR SALE" badge if startup is listed for acquisition
- "⚡ CLOSING SOON" badge if deadline < 10 days
- BET → button appears on hover — clicking navigates to market page

**Default market selection for featured grid:**
- 2 high-volume markets (most bettors)
- 2 closing soon (urgency)
- 2 acquisition markets (highest interest / differentiated angle)

---

**What is NOT on the landing page:**
- No "how it works" explainer
- No testimonials
- No FAQ
- No footer links
- No newsletter signup
- No mobile app promo

The page is the product. Watch the feed, see a bet you have an opinion on, click it, sign in, bet. That's the entire flow.

---

### 3.2 Market Browser `/markets`

**Goal:** Discovery of open markets. Entry point for most returning users.

**Filters:**
- Status: Open / Closing soon / Recently resolved
- Type: MRR Target / Growth Race / Acquisition / Survival
- Category: mirrors TrustMRR categories (SaaS, AI, ecommerce, etc.)
- Sort: Most popular / Closing soon / Newest / Biggest pot

**Each market card shows:**
- Startup name + icon
- Market question: "Will Lemonsqueezy reach $50k MRR by Sept 1?"
- Current odds: YES 68% / NO 32%
- Total credits in pool
- Days remaining
- Number of bettors

**Default view:** "Closing soon" — creates urgency on first load.

---

### 3.3 Single Market Page `/markets/[id]`

**Goal:** Full context to make an informed bet. Social layer around each market.

**Layout:**

```
┌─────────────────────────────────────────┐
│  [Startup icon + name]                  │
│  "Will X reach $10k MRR by June 1?"     │
│                                         │
│  YES ████████████░░░░ 72%   NO 28%      │
│  1,240 credits in pool · 18 betters     │
│  Closes in 14 days                      │
│                                         │
│  [Bet YES]  [Bet NO]                    │
│  Amount: [___] credits                  │
└─────────────────────────────────────────┘

┌─────────────────┐  ┌──────────────────┐
│  Current MRR    │  │  30d Growth      │
│  $7,842         │  │  +24%            │
│  (verified)     │  │  (last snapshot) │
└─────────────────┘  └──────────────────┘

MRR History chart (platform's own historical data)

Recent bets:
· @sarahbuilds bet 200cr YES — 2h ago
· @indiejan bet 500cr NO — 5h ago
· @marc_louvion bet 300cr YES — 1d ago

Resolution criteria:
"Resolves YES if revenue.mrr ≥ $10,000 on 
the June 1st daily snapshot from TrustMRR."
```

**Key UX decisions:**
- Resolution criteria written in plain English, always visible
- MRR chart built from platform's own historical snapshots — unique data asset
- Recent bets feed creates social proof and FOMO
- Sharing: "Share this market" generates a tweet-ready image with current odds

---

### 3.4 Startup Page `/startups/[slug]`

**Goal:** Hub for everything related to a single startup. Shareable by founders.

**Header:**
- Startup name, icon, description, website link, X handle
- Key stats: MRR, 30d growth, total revenue, customers, founded date
- Category badge, payment provider badge (trust signal)
- "For Sale" banner if `onSale = true` with asking price and multiple

**Active Markets section:**
- All open markets for this startup
- Quick-bet inline (no need to go to market page)

**Market History section:**
- Resolved markets with outcomes
- "Community called it right X% of the time" — credibility signal for acquirers

**MRR Chart:**
- Historical MRR built from platform snapshots
- The only place on the internet with this chart for most of these startups

**Sentiment Bar:**
- Aggregated across all open markets — "Community is 74% bullish on this startup"
- This is the key signal for acquirers

**Founder Card:**
- X profile, follower count, other startups by same founder on TrustMRR
- "Bet on this founder" — shortcut to all markets across their portfolio

**Share CTA:**
- "Share your startup page" button — for founders to post on X
- Auto-generated OG image with current MRR and community sentiment

---

### 3.5 Startup Browser `/startups`

**Goal:** Discovery layer. Also useful as a standalone tool (startup screener).

**Filters** (maps directly to TrustMRR API params):
- Category
- MRR range slider
- Growth range slider
- For sale only toggle
- Sort: Highest MRR / Fastest growing / Best deal / Newest

**Each startup card:**
- Icon, name, one-line description
- MRR + growth badge (color coded: green/red)
- "For Sale" badge with asking price if applicable
- Number of active markets
- Community sentiment pill: "74% bullish"

**Value beyond TrustMRR:** The sentiment overlay and active market count are unique to PolyMRR — gives a reason to use this browser even without betting.

---

### 3.6 Leaderboard `/leaderboard`

**Goal:** Public ranking. Core status mechanic. Drives sharing.

**Tabs:**
- All time
- This month
- By category (who's best at predicting SaaS?)

**Each row:**
- Rank, avatar, X handle
- Win rate %
- Total predictions
- Credits won/lost
- "Hot streak" badge if 5+ correct in a row
- Link to public profile

**Why this works:** Being rank #1 at predicting SaaS startup growth is a legitimate credibility signal in this community. People will share it. People will try to climb it.

---

### 3.7 Public Profile `/profile/[xHandle]`

**Goal:** Shareable proof of your prediction track record. The exportable credibility asset.

**Header:**
- X profile pic, name, handle
- "87% accuracy · 40 predictions · +2,400 credits"
- Shareable badge image (auto-generated)

**Stats:**
- Win rate overall and by market type
- Best prediction: "Called ShipFast $20k MRR 3 months early"
- Longest streak
- Favorite categories

**Active bets** (public):
- Current open positions
- Potential upside if correct

**Bet history:**
- Full resolved bet history with outcomes
- Filter by correct / incorrect

**The key moment:** When a market resolves in your favor, you get a notification with a one-click share: "I called it ✅ — share your win" → generates a card with your bet, the outcome, and a link to your profile.

---

### 3.8 Private Dashboard `/dashboard`

**Goal:** Personal command center for logged-in users.

**Sections:**
- Credit balance + recent transactions
- Active bets with current odds movement (is the market moving for or against you?)
- Markets closing in next 7 days (urgency)
- Recommended markets based on categories you've bet on

---

## 4. User Flows

---

### Flow A: New Visitor → First Bet

```
Landing page
  → sees live ticker of bets
  → clicks a featured market
  → reads market page (no auth required)
  → clicks "Bet YES"
  → prompted to sign in with X or Google
  → signs in → gets 1,000 credits automatically
  → places first bet
  → sees profile created with first bet
  → nudged to share: "I just bet that [startup] hits $10k MRR →"
```

**Friction points to eliminate:**
- Auth via X or Google, single click
- First bet should be possible in under 60 seconds from landing
- No email, no onboarding wizard, no tutorial

---

### Flow B: Returning User Daily Loop

```
Dashboard
  → checks active bets (odds moved overnight?)
  → sees "3 markets closing in 48h" alert
  → adds more credits to a position
  → browses new markets (created daily from TrustMRR sync)
  → places 1-2 new bets
  → checks leaderboard position
```

---

### Flow C: Market Resolution

```
Daily cron runs at 00:00 UTC
  → fetches all TrustMRR startups
  → stores snapshot in DB
  → checks all markets with deadline = today
  → compares resolution condition vs snapshot data
  → marks markets as resolved YES or NO
  → distributes credits to winners (proportional to stake)
  → sends resolution notifications
  → winners see "Share your win" prompt
  → share card generated: "[User] called it ✅ ShipFast hit $10k MRR"
```

---

### Flow D: Founder Discovers Their Page

```
Founder sees PolyMRR mentioned on X
  → searches their startup name
  → finds /startups/[their-slug] already exists
  → sees active markets, MRR chart, community sentiment
  → signs in with X or Google (same auth, becomes a user)
  → claims their startup page (verified badge)
  → shares page with their audience: "People are betting on my startup 👀"
  → their followers sign up to bet
```

**The founder sharing their page is the primary acquisition loop.**

---

### Flow E: Acquirer Using PolyMRR for Due Diligence

```
Acquirer browses /startups?onSale=true
  → filters by category, MRR range, growth
  → finds interesting target
  → sees: MRR chart (historical), community sentiment, market odds
  → "73% of predictors think this startup will 2x in 6 months"
  → clicks through to active markets to understand why
  → sees recent bet activity and comments
  → uses this as one signal in due diligence
```

---

## 5. Market Creation Logic

Markets are either **system-generated** (automatic) or **user-created** (manual).

### System-Generated Markets

Created automatically by the daily cron based on rules:

| Trigger | Market Created |
|---------|---------------|
| Startup joins TrustMRR | "Will [startup] reach $X MRR by [3 months]?" where X = next round number above current MRR |
| Startup lists for sale | "Will [startup] sell within 90 days?" + "Will it sell above asking price?" |
| Startup shows >50% growth | "Will [startup] maintain growth next month?" |
| Startup crosses MRR milestone ($1k/$5k/$10k/$50k/$100k) | "Will [startup] reach next milestone by [3 months]?" |

### User-Created Markets

Any logged-in user can propose a market:
- Select a startup
- Choose a market type template
- Set the resolution condition and deadline
- Stake a minimum of 100 credits to "seed" the market (creates initial liquidity)

Platform reviews user-created markets before publishing (lightweight moderation — mostly checking resolution condition is unambiguous).

---

## 6. Credit System

**Earning credits:**
- Signup bonus: 1,000 credits
- Daily login: 10 credits
- Winning a bet: proportional payout from pool
- Seeding a market that gets > 10 bettors: 50 credit bonus
- Sharing a win on X (verified via tweet): 25 credits

**Spending credits:**
- Placing bets (minimum 50 credits per bet)
- Seeding a new user-created market (minimum 100 credits)
- Boosting your startup's page visibility (founder feature, paid)

**Buying credits:**
- $4.99 → 1,000 credits
- $9.99 → 2,500 credits
- $24.99 → 7,500 credits

**Market mechanics (LMSR):**
- Automated Market Maker — you can always bet, no need for a counterparty
- Odds shift as more people bet on one side
- Payout proportional to stake and odds at time of bet
- Platform takes 5% rake on winning payouts (this is the revenue from credits)

---

## 7. Monetization

| Revenue stream | Mechanism | Est. price |
|---------------|-----------|-----------|
| Featured listing | Startup boosted on homepage + market browser for 30 days | $99-199/mo |
| Founder analytics | Who's betting, sentiment trend, market history dashboard | $29/mo |
| Credit purchases | Users buy credits after losing theirs | $5-25 |
| Platform rake | 5% of winning payouts (taken from pool) | automatic |

**Priority order for MVP:** Launch free → add credit purchases → add founder featured listing once founders are engaged.