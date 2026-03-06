"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Credits } from "@/components/ui/credits";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { sharesToBuy, stateAfterBet, yesOdds as calcYesOdds, estimatePayout, MIN_BET, RAKE_PERCENT } from "@/lib/lmsr";
import type { LmsrState } from "@/lib/lmsr";
import type { User } from "@/lib/types";
import { Info } from "lucide-react";

interface BetFormProps {
  marketId: string;
  yesOdds: number;
  yesShares: number;
  noShares: number;
  liquidityParam: number;
  totalCredits: number;
  user: User | null;
}

export function BetForm({ marketId, yesOdds, yesShares, noShares, liquidityParam, totalCredits, user }: BetFormProps) {
  const router = useRouter();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const credits = parseInt(amount) || 0;
  const state: LmsrState = { yesShares, noShares, b: liquidityParam };

  const preview = useMemo(() => {
    if (credits < MIN_BET) return null;
    const shares = sharesToBuy(state, side, credits);
    const newState = stateAfterBet(state, side, shares);
    const payout = estimatePayout(state, side, shares, totalCredits, credits);
    const profit = Math.max(0, payout - credits);
    return {
      payout,
      profit,
      newOdds: calcYesOdds(newState),
    };
  }, [credits, side, state.yesShares, state.noShares, state.b, totalCredits]);

  const handleBet = async () => {
    if (!user) { alert("Sign in with Google to place a bet"); return; }
    if (credits < MIN_BET) { setError(`Minimum bet is ${MIN_BET} credits`); return; }
    if (credits > user.credits) { setError("Insufficient credits"); return; }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId, side, amount: credits }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setAmount("");
    router.refresh();
  };

  return (
    <div className="card bg-base-300/30 border border-base-300">
      <div className="card-body gap-3 p-5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("yes")}
            className={`btn mono-num ${
              side === "yes" ? "btn-success" : "btn-ghost border-base-300"
            }`}
          >
            YES {yesOdds}%
          </button>
          <button
            onClick={() => setSide("no")}
            className={`btn mono-num ${
              side === "no" ? "btn-error" : "btn-ghost border-base-300"
            }`}
          >
            NO {100 - yesOdds}%
          </button>
        </div>
        <input
          type="number"
          placeholder={`Amount (min ${MIN_BET})`}
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(null); }}
          min={MIN_BET}
          className="input input-bordered mono-num w-full bg-base-200"
        />
        {preview && (
          <div className="flex items-center justify-between text-xs text-base-content/50">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1">
                    Est. win: <Credits amount={preview.profit} className="font-semibold text-yes" />
                    <Info className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8} className="!bg-base-200 max-w-64 space-y-1.5 rounded-lg border border-base-300 p-3 text-[11px] leading-relaxed !text-base-content shadow-xl [&>svg]:hidden">
                  <p className="font-semibold">How payouts work</p>
                  <p className="text-base-content/70">Your bet buys shares in the outcome. If {side.toUpperCase()} wins, you split the entire pool proportional to your shares.</p>
                  <p className="text-base-content/70">Estimated payout: <span className="font-semibold text-base-content">{preview.payout.toLocaleString()}</span> bananas (profit of {preview.profit.toLocaleString()})</p>
                  <p className="text-base-content/40">Platform takes a {RAKE_PERCENT * 100}% fee on winnings. If {side === "yes" ? "NO" : "YES"} wins, you get nothing.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span>Odds after: <span className="mono-num font-semibold text-base-content">{preview.newOdds}%</span> YES</span>
          </div>
        )}
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
        <button
          onClick={handleBet}
          disabled={loading || credits < MIN_BET}
          className="btn btn-primary w-full font-bold"
        >
          {loading ? "Placing..." : "Place Bet"}
        </button>
        {user && (
          <p className="text-center text-xs text-base-content/50">
            Balance: <Credits amount={user.credits} />
          </p>
        )}
      </div>
    </div>
  );
}
