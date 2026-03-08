"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, placeholder = "Search...", onChange }: SearchInputProps) {
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    if (input === value) return;
    const timer = setTimeout(() => onChange(input), 300);
    return () => clearTimeout(timer);
  }, [input, value, onChange]);

  return (
    <label className="input input-sm flex w-full items-center gap-2 border-base-content/20 bg-base-200/50 focus-within:border-primary/50 focus-within:outline-none">
      <Search className="h-4 w-4 shrink-0 text-base-content/40" />
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="grow bg-transparent outline-none placeholder:text-base-content/30"
      />
      {input && (
        <button
          onClick={() => { setInput(""); onChange(""); }}
          className="text-base-content/40 hover:text-base-content"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );
}
