import Image from "next/image";

interface CreditsProps {
  amount: number;
  prefix?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const sizes = {
  xs: { icon: 10, text: "text-[10px]" },
  sm: { icon: 12, text: "text-xs" },
  md: { icon: 14, text: "text-sm" },
  lg: { icon: 18, text: "text-xl" },
};

export function Credits({ amount, prefix, className, size = "sm" }: CreditsProps) {
  const s = sizes[size];
  return (
    <span className={`mono-num inline-flex items-center gap-0.5 ${className ?? ""}`}>
      {prefix}{amount.toLocaleString()}
      <Image src="/banana.svg" alt="" width={s.icon} height={s.icon} className="inline-block" />
    </span>
  );
}
