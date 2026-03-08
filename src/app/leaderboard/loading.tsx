import { LeaderboardRowSkeleton } from "@/components/ui/card-skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded bg-base-300 animate-pulse" />
        <div className="flex gap-0">
          <div className="h-8 w-20 rounded-l-lg bg-base-300 animate-pulse" />
          <div className="h-8 w-24 rounded-r-lg bg-base-300 animate-pulse" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr className="border-base-300">
              <th className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Rank</th>
              <th className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Predictor</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/50">Win Rate</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/50">Predictions</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/50">Won</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/50">Lost</th>
              <th className="text-center text-[10px] font-bold uppercase tracking-wider text-base-content/50">Streak</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 20 }).map((_, i) => (
              <LeaderboardRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
