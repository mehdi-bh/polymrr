"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QuestPopup } from "@/components/ui/quest-popup";
import { SignInButton } from "@/components/ui/sign-in-button";
import type { User } from "@/lib/types";
import { TrendingUp, BarChart3, Trophy, LayoutDashboard, User as UserIcon, LogOut } from "lucide-react";

const navLinks = [
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/startups", label: "Startups", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

interface NavbarProps {
  user: User | null;
  completedQuests: string[];
}

export function Navbar({ user, completedQuests }: NavbarProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    location.reload();
  };

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
              <QuestPopup credits={user.credits} completedQuests={completedQuests} />
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-1.5 text-[13px]">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{user.xHandle ? `@${user.xHandle}` : user.xName}</span>
                </div>
                <ul tabIndex={0} className="dropdown-content menu menu-sm mt-2 w-48 rounded-lg border border-base-300 bg-base-200 p-1 shadow-xl z-50">
                  <li>
                    <Link href="/dashboard" className="gap-2 text-[13px]">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href={`/profile/${user.id}`} className="gap-2 text-[13px]">
                      <UserIcon className="h-3.5 w-3.5" />
                      Profile
                    </Link>
                  </li>
                  <li className="border-t border-base-300 mt-1 pt-1">
                    <button onClick={handleSignOut} className="gap-2 text-[13px] text-base-content/50">
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <SignInButton className="btn btn-primary btn-sm text-[13px] gap-1.5" />
          )}
        </div>
      </div>
    </div>
  );
}
