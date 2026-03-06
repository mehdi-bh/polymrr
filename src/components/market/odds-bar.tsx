import { cn } from "@/lib/utils";

interface OddsBarProps {
  yesOdds: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function OddsBar({ yesOdds, size = "md", className }: OddsBarProps) {
  const noOdds = 100 - yesOdds;
  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-4" : "h-2.5";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className={cn("flex gap-0.5 overflow-hidden rounded-full bg-base-300", height)}>
        <div className="rounded-full bg-yes transition-all duration-700 ease-out" style={{ width: `${yesOdds}%` }} />
        <div className="rounded-full bg-no transition-all duration-700 ease-out" style={{ width: `${noOdds}%` }} />
      </div>
      <div className="flex justify-between">
        <span className="mono-num text-xs font-semibold text-yes">YES {yesOdds}%</span>
        <span className="mono-num text-xs font-semibold text-no">NO {noOdds}%</span>
      </div>
    </div>
  );
}
