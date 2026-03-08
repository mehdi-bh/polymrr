export function StartupCardSkeleton() {
  return (
    <div className="card bg-base-100 border border-base-300 animate-pulse">
      <div className="card-body gap-3 p-5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-base-300" />
          <div className="h-4 w-24 rounded bg-base-300" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-base-300" />
          <div className="h-3 w-2/3 rounded bg-base-300" />
        </div>
        <div className="flex items-end gap-4">
          <div>
            <div className="h-6 w-20 rounded bg-base-300" />
            <div className="mt-1 h-2.5 w-8 rounded bg-base-300" />
          </div>
          <div className="h-4 w-12 rounded bg-base-300" />
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-base-300" />
          <div className="h-3 w-20 rounded bg-base-300" />
        </div>
      </div>
    </div>
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="card bg-base-100 border border-base-300 animate-pulse">
      <div className="card-body gap-3 p-5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-base-300" />
          <div className="h-4 w-32 rounded bg-base-300" />
        </div>
        <div className="h-4 w-full rounded bg-base-300" />
        <div className="h-3 w-full rounded-full bg-base-300" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-16 rounded bg-base-300" />
            <div className="h-3 w-8 rounded bg-base-300" />
          </div>
          <div className="h-3 w-12 rounded bg-base-300" />
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 12, variant = "startup" }: { count?: number; variant?: "startup" | "market" }) {
  const Card = variant === "startup" ? StartupCardSkeleton : MarketCardSkeleton;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <tr className="border-base-300/50">
      <td><div className="h-4 w-4 rounded bg-base-300 animate-pulse" /></td>
      <td>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-base-300 animate-pulse" />
          <div className="space-y-1">
            <div className="h-3.5 w-20 rounded bg-base-300 animate-pulse" />
            <div className="h-2.5 w-14 rounded bg-base-300 animate-pulse" />
          </div>
        </div>
      </td>
      <td className="text-right"><div className="ml-auto h-4 w-10 rounded bg-base-300 animate-pulse" /></td>
      <td className="text-right"><div className="ml-auto h-4 w-6 rounded bg-base-300 animate-pulse" /></td>
      <td className="text-right"><div className="ml-auto h-4 w-14 rounded bg-base-300 animate-pulse" /></td>
      <td className="text-right"><div className="ml-auto h-4 w-14 rounded bg-base-300 animate-pulse" /></td>
      <td className="text-center"><div className="mx-auto h-4 w-6 rounded bg-base-300 animate-pulse" /></td>
    </tr>
  );
}
