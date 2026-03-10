"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveButton({ marketId }: { marketId: string }) {
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const router = useRouter();

  async function resolve(outcome?: "yes" | "no") {
    setLoading(true);
    try {
      const res = await fetch("/api/markets/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to resolve");
        // If auto-resolve can't determine, prompt manual choice
        if (res.status === 400 && !outcome) {
          setPicking(true);
        }
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (picking) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-base-content/50">Resolve as:</span>
        <button
          onClick={() => resolve("yes")}
          disabled={loading}
          className="btn btn-success btn-outline btn-xs"
        >
          {loading ? "..." : "YES"}
        </button>
        <button
          onClick={() => resolve("no")}
          disabled={loading}
          className="btn btn-error btn-outline btn-xs"
        >
          {loading ? "..." : "NO"}
        </button>
        <button
          onClick={() => setPicking(false)}
          className="btn btn-ghost btn-xs text-base-content/40"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => resolve()}
      disabled={loading}
      className="btn btn-warning btn-outline btn-sm"
    >
      {loading ? "Resolving..." : "Resolve Market"}
    </button>
  );
}
