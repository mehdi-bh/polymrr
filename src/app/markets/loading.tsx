import { CardGridSkeleton } from "@/components/ui/card-skeleton";

export default function MarketsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-28 rounded bg-base-300 animate-pulse" />
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 w-16 rounded-lg bg-base-300 animate-pulse" />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-6 w-16 rounded-lg bg-base-300 animate-pulse" />
          ))}
        </div>
      </div>
      <CardGridSkeleton variant="market" />
    </div>
  );
}
