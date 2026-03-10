"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const PH_LINK =
  "https://www.producthunt.com/products/polymrr?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-polymrr";
const PH_IMAGE_LIGHT =
  "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1094275&theme=light&t=1773179471587";

export function ProductHuntBadge({ className }: { className?: string }) {
  return (
    <a
      href={PH_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block transition-transform hover:scale-105 ${className ?? ""}`}
    >
      <img
        src={PH_IMAGE_LIGHT}
        alt="PolyMRR on Product Hunt"
        width={250}
        height={54}
        className="h-[54px] w-[250px] rounded-lg"
      />
    </a>
  );
}

const POPUP_KEY = "ph-popup-dismissed";

export function ProductHuntPopup() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (sessionStorage.getItem(POPUP_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [mounted]);

  function dismiss() {
    setClosing(true);
    sessionStorage.setItem(POPUP_KEY, "1");
    setTimeout(() => setVisible(false), 200);
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      onClick={dismiss}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative overflow-hidden rounded-2xl border border-[#ff6154]/20 bg-base-100 p-8 shadow-2xl max-w-sm w-full flex flex-col items-center gap-5 transition-all duration-200 ${closing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* PH orange glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-40 bg-[#ff6154]/15 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={dismiss}
          className="absolute top-3 right-4 text-base-content/30 hover:text-base-content transition-colors text-xl leading-none cursor-pointer"
        >
          &times;
        </button>

        <div className="relative flex flex-col items-center gap-1.5">
          <p className="text-lg font-bold">
            We&apos;re live on <span className="text-[#ff6154]">Product Hunt</span>!
          </p>
          <p className="text-xs text-base-content/40">Check us out and show some love</p>
        </div>

        <ProductHuntBadge />

        <button
          onClick={dismiss}
          className="text-xs text-base-content/30 hover:text-base-content/50 transition-colors cursor-pointer"
        >
          Maybe later
        </button>
      </div>
    </div>,
    document.body
  );
}
