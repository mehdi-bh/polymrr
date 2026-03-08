"use client";

import { useState } from "react";

interface FounderAvatarProps {
  xHandle: string;
  name: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
}

export function FounderAvatar({ xHandle, name, size = 64, className = "", fallbackClassName = "" }: FounderAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-base-200 font-bold text-primary ${fallbackClassName}`}
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={`https://unavatar.io/x/${xHandle}`}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full bg-base-200 object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
