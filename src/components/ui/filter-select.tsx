"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface FilterSelectProps {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function FilterSelect({ value, options, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button className="btn btn-sm btn-ghost border border-base-content/10 gap-1.5 font-normal" onClick={() => setOpen(!open)}>
        {current?.icon && <span className="text-primary [&>svg]:size-3.5">{current.icon}</span>}
        {current?.label}
        <ChevronDown className="size-3 opacity-50" />
      </button>
      {open && (
        <ul className="menu absolute left-0 z-50 mt-1 w-max rounded-lg border border-base-content/10 bg-base-200 p-1 shadow-lg">
          {options.map((o) => (
            <li key={o.value}>
              <button
                className={`flex items-center gap-2 text-sm ${o.value === value ? "text-primary font-medium" : ""}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.icon && <span className="[&>svg]:size-3.5">{o.icon}</span>}
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
