import Image from "next/image";

interface XIconProps {
  size?: number;
  className?: string;
  dark?: boolean;
}

export function XIcon({ size = 16, className, dark = false }: XIconProps) {
  return (
    <Image
      src="/twitter_transparent.webp"
      alt="X"
      width={size}
      height={size}
      className={`inline-block ${dark ? "" : "invert"} ${className ?? ""}`}
    />
  );
}
