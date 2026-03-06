"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Credits } from "@/components/ui/credits";
import { Check, UserPlus, Target, Flame, PlusCircle } from "lucide-react";

interface Quest {
  id: string;
  label: string;
  reward: number;
  completed: boolean;
  icon: React.ReactNode;
}

// Mock quest state — will be replaced by real backend data
const quests: Quest[] = [
  { id: "signup", label: "Sign up to PolyMRR", reward: 10000, completed: true, icon: <UserPlus className="h-4 w-4" /> },
  { id: "first-bet", label: "Place your first bet", reward: 1000, completed: true, icon: <Target className="h-4 w-4" /> },
  { id: "underdog-bet", label: "Bet on a <30% outcome", reward: 1000, completed: false, icon: <Flame className="h-4 w-4" /> },
  { id: "create-market", label: "Create a market", reward: 1000, completed: false, icon: <PlusCircle className="h-4 w-4" /> },
];

interface QuestPopupProps {
  credits: number;
}

export function QuestPopup({ credits }: QuestPopupProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const completed = quests.filter((q) => q.completed).length;
  const total = quests.length;
  const earned = quests.filter((q) => q.completed).reduce((sum, q) => sum + q.reward, 0);
  const remaining = quests.filter((q) => !q.completed).reduce((sum, q) => sum + q.reward, 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="badge badge-neutral py-3 px-3 cursor-pointer hover:bg-neutral/80 transition-colors"
      >
        <Credits amount={credits} size="md" className="font-semibold text-primary" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] z-[100] animate-fade-up">
          {/* Arrow */}
          <div className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-base-100 border-l border-t border-base-300" />

          <div className="rounded-xl border border-base-300 bg-base-100 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Image src="/banana.svg" alt="" width={20} height={20} />
                  <span className="text-sm font-bold">Quests</span>
                </div>
                <span className="mono-num text-xs text-base-content/50">{completed}/{total} done</span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-2 w-full rounded-full bg-base-300 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(completed / total) * 100}%` }}
                />
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-base-content/40">
                  <Credits amount={earned} size="xs" className="font-semibold text-yes" /> earned
                </span>
                {remaining > 0 && (
                  <span className="text-[10px] text-base-content/40">
                    <Credits amount={remaining} size="xs" className="font-semibold text-primary" /> remaining
                  </span>
                )}
              </div>
            </div>

            <div className="h-px bg-base-300" />

            {/* Quest list */}
            <div className="px-2 py-2 space-y-0.5">
              {quests.map((quest) => (
                <div
                  key={quest.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    quest.completed ? "opacity-60" : "bg-base-200/50"
                  }`}
                >
                  {/* Icon */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    quest.completed
                      ? "bg-success/10 text-yes"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {quest.completed ? <Check className="h-4 w-4" /> : quest.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-medium ${quest.completed ? "line-through text-base-content/40" : ""}`}>
                      {quest.label}
                    </div>
                  </div>

                  {/* Reward */}
                  <div className={`shrink-0 rounded-md px-2 py-1 ${
                    quest.completed
                      ? "bg-success/10"
                      : "bg-primary/10"
                  }`}>
                    <Credits
                      amount={quest.reward}
                      prefix="+"
                      size="xs"
                      className={`font-bold ${quest.completed ? "text-yes" : "text-primary"}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {remaining > 0 && (
              <>
                <div className="h-px bg-base-300" />
                <div className="px-4 py-3 text-center">
                  <span className="text-[11px] text-base-content/40">
                    Complete all quests to earn <Credits amount={earned + remaining} size="xs" className="font-bold text-primary" />
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
