"use client";

interface FilterPillProps {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}

export function FilterPill({ active, children, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-xs ${active ? "btn-primary btn-outline" : "btn-ghost"}`}
    >
      {children}
    </button>
  );
}
