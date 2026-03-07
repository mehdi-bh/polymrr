import { cn } from "@/lib/utils";

interface OddsBarProps {
  yesOdds: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  labels?: { yes: string; no: string };
}

export function OddsBar({ yesOdds, size = "md", className, labels }: OddsBarProps) {
  const noOdds = 100 - yesOdds;
  const yesLabel = labels?.yes ?? "YES";
  const noLabel = labels?.no ?? "NO";

  const height = size === "sm" ? "h-7" : size === "lg" ? "h-9" : "h-8";
  const textSize = size === "sm" ? "text-[11px]" : size === "lg" ? "text-sm" : "text-xs";

  return (
    <div className={cn("relative overflow-hidden rounded-lg", height, className)}>
      {/* YES side */}
      <div
        className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
        style={{ width: `${yesOdds}%`, background: "var(--color-yes)" }}
      />
      {/* NO side */}
      <div
        className="absolute inset-y-0 right-0 transition-all duration-700 ease-out"
        style={{ width: `${noOdds}%`, background: "var(--color-no)" }}
      />

      {/* Labels */}
      <div className="relative flex h-full items-center justify-between px-3">
        <span className={cn("mono-num font-bold text-black/70", textSize)}>
          {yesLabel} {yesOdds}%
        </span>
        <span className={cn("mono-num font-bold text-white/80", textSize)}>
          {noLabel} {noOdds}%
        </span>
      </div>
    </div>
  );
}
