import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-base-300 bg-base-200/50 mt-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 text-xs text-base-content/40 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-1.5">
          <span>&copy; {new Date().getFullYear()} Arche Labs LTD</span>
          <span className="text-base-content/20">&middot;</span>
          <span>All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="transition-colors hover:text-base-content/60">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-base-content/60">Terms</Link>
          <a href="https://x.com/mehdibhaddou" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-base-content/60">X/Twitter</a>
        </div>
      </div>
    </footer>
  );
}
