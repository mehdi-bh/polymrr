"use client";

import { useState } from "react";
import { Credits } from "@/components/ui/credits";
import type { User } from "@/lib/types";

interface BetFormProps {
  marketId: string;
  yesOdds: number;
  user: User | null;
}

export function BetForm({ marketId, yesOdds, user }: BetFormProps) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");

  void marketId;

  const handleBet = () => {
    if (!user) { alert("Sign in with Google to place a bet"); return; }
    const credits = parseInt(amount);
    if (!credits || credits < 50) { alert("Minimum bet is 50 credits"); return; }
    alert(`Mock: Placed ${credits}cr ${side.toUpperCase()} bet`);
    setAmount("");
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
          placeholder="Amount (min 50)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={50}
          className="input input-bordered mono-num w-full bg-base-200"
        />
        <button onClick={handleBet} className="btn btn-primary w-full font-bold">
          Place Bet
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
