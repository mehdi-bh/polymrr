"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/data";
import { XIcon } from "@/components/ui/x-icon";
import { QuestPopup } from "@/components/ui/quest-popup";
import { TrendingUp, BarChart3, Trophy, LayoutDashboard, User } from "lucide-react";

const navLinks = [
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/startups", label: "Startups", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const user = getCurrentUser();

  return (
    <div className="navbar sticky top-0 z-50 border-b border-base-300 bg-base-200/90 backdrop-blur-lg px-4">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Poly<span className="text-primary">MRR</span>
            </span>
          </Link>
          <div className="hidden gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`btn btn-ghost btn-sm gap-1.5 text-[13px] font-medium ${
                  pathname.startsWith(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-base-content/60"
                }`}
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <QuestPopup credits={user.credits} />
              <Link
                href="/dashboard"
                className={`btn btn-ghost btn-sm gap-1.5 text-[13px] ${
                  pathname === "/dashboard" ? "text-primary" : "text-base-content/60"
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href={`/profile/${user.xHandle}`}
                className={`btn btn-ghost btn-sm gap-1.5 text-[13px] ${
                  pathname.startsWith("/profile") ? "text-primary" : "text-base-content/60"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">@{user.xHandle}</span>
              </Link>
            </>
          ) : (
            <button className="btn btn-primary btn-sm text-[13px] gap-1.5">
              <XIcon size={14} />
              Sign in with X
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
