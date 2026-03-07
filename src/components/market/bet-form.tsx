"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Credits } from "@/components/ui/credits";
import { useToast } from "@/components/ui/toast";
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
  const { toast } = useToast();
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
    if (!user) { toast("warning", "Sign in required", "Sign in with Google to place a bet"); return; }
    if (credits < MIN_BET) { toast("error", "Invalid amount", `Minimum bet is ${MIN_BET} credits`); return; }
    if (credits > user.credits) { toast("error", "Insufficient credits", "You don't have enough credits"); return; }

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
      toast("error", "Bet failed", data.error);
      return;
    }

    toast("success", "Bet placed", `${credits.toLocaleString()} on ${side.toUpperCase()}`);
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
          <div className="space-y-1.5 text-xs text-base-content/50">
            <div className="flex items-center justify-between">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help items-center gap-1">
                      Est. payout: <Credits amount={preview.payout} className="font-semibold text-base-content" />
                      <span className="text-base-content/30">=</span>
                      <span className="text-base-content/60">{(parseInt(amount) || 0).toLocaleString()} + <span className="text-yes">{preview.profit.toLocaleString()}</span></span>
                      <Info className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="!bg-base-200 max-w-64 space-y-1.5 rounded-lg border border-base-300 p-3 text-[11px] leading-relaxed !text-base-content shadow-xl [&>svg]:hidden">
                    <p className="font-semibold">How payouts work</p>
                    <p className="text-base-content/70">If {side.toUpperCase()} wins, you get your {(parseInt(amount) || 0).toLocaleString()} bet back + {preview.profit.toLocaleString()} profit.</p>
                    <p className="text-base-content/70">Based on current pool size. Payout changes as others bet.</p>
                    <p className="text-base-content/40">{RAKE_PERCENT * 100}% fee on winnings. If {side === "yes" ? "NO" : "YES"} wins, you lose your bet.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span>Odds after: <span className="mono-num font-semibold text-base-content">{preview.newOdds}%</span> YES</span>
            </div>
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
