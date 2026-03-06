"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface SignInButtonProps {
  className?: string;
}

export function SignInButton({ className }: SignInButtonProps) {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    });
  };

  return (
    <button onClick={handleSignIn} className={className}>
      Sign in with <Image src="/google.webp" alt="Google" width={20} height={20} className="inline-block" />
    </button>
  );
}
