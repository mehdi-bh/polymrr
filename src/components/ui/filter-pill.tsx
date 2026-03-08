"use client";

interface FilterPillProps {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}

export function FilterPill({ active, children, onClick, icon }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-xs gap-1 ${active ? "btn-primary btn-outline" : "btn-ghost"}`}
    >
      {icon && <span className="opacity-70 [&>svg]:size-3">{icon}</span>}
      {children}
    </button>
  );
}

interface FilterGroupProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function FilterGroup({ label, icon, children }: FilterGroupProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-base-content/40 font-semibold pl-0.5">
        {icon && <span className="[&>svg]:size-3">{icon}</span>}
        {label}
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}
