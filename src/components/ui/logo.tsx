import Image from "next/image";

interface LogoProps {
  showIcon?: boolean;
  className?: string;
}

export function Logo({ showIcon = true, className = "" }: LogoProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      {showIcon && (
        <Image src="/icon.png" alt="PolyMRR" width={28} height={28} className="rounded-md" />
      )}
      <span className="flex items-center gap-2">
        <span className="font-logo text-[22px] font-extrabold tracking-tight leading-none">
          <span className="text-white">Poly</span>
          <span className="text-primary">MRR</span>
        </span>
        <span className="flex items-center gap-1 rounded-md bg-success/15 border border-success/25 px-1.5 py-0.5 font-logo text-[10px] font-bold text-success leading-none">
          <span className="text-[8px]">&#9650;</span>
          42%
        </span>
      </span>
    </span>
  );
}
