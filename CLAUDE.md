# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint

No test runner is configured.

## What is PolyMRR

A prediction market platform for indie startups. Users bet on startup outcomes (MRR targets, growth races, acquisitions, survival) using virtual credits ("bananas"). Market data is powered by TrustMRR verified revenue.

## Architecture

- **Next.js 16** with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4 + DaisyUI v5 with a custom dark theme (`polymrr` in `globals.css`)
- **UI components**: shadcn/ui (new-york style) + DaisyUI classes. shadcn config in `components.json`.
- **Font**: Inconsolata (monospace) used globally via CSS variable `--font-inconsolata`
- **Backend**: Supabase (configured via `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`)

## Data Layer

All data access goes through `src/lib/data.ts` (async Supabase queries, server-only). Pure helpers (formatCents, timeAgo, etc.) live in `src/lib/helpers.ts` and are safe for client components. Types in `src/lib/types.ts` mirror TrustMRR API shapes. Revenue values are in **USD cents**.

## Key Directories

- `src/app/` — Pages: home, markets, markets/[id], startups, startups/[slug], leaderboard, dashboard, profile/[id]
- `src/components/ui/` — Reusable UI primitives (shadcn + custom)
- `src/components/market/` — Market-specific components (MarketCard, BetForm, OddsBar, LiveFeed, StatsBar)
- `src/components/startup/` — Startup components (StartupCard, FounderCard, MrrChart)
- `src/components/profile/` — Profile components (PnlChart)
- `src/components/layout/` — Navbar

## Conventions

- Path aliases: `@/components`, `@/lib`, `@/hooks`
- Custom CSS classes: `.animate-fade-up`, `.stagger-children`, `.card-hover`, `.mono-num`
- Custom theme colors: `--color-yes` (green), `--color-no` (red), `--color-gold` (primary/accent)
- All pages are server components by default
