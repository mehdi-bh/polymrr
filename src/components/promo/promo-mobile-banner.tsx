"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { PromoSlotPreview } from "./promo-slot-preview";
import { PromoModal } from "./promo-modal";
import { STRIPE_PRICE_DISPLAY, BANANA_COST } from "./constants";
import type { PromoSlot as PromoSlotType, User } from "@/lib/types";

interface PromoCarouselProps {
  slots: (PromoSlotType | null)[];
  user: User | null;
  indexOffset?: number;
}

function PromoCarousel({ slots, user, indexOffset = 0 }: PromoCarouselProps) {
  const total = slots.length;
  const [activeIndex, setActiveIndex] = useState(indexOffset % total);
  const [sliding, setSliding] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [showModal, setShowModal] = useState(false);
  const [modalSlotIndex, setModalSlotIndex] = useState(1);

  const goNext = useCallback(() => {
    setDirection("left");
    setSliding(true);
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % total);
      setSliding(false);
    }, 300);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    const interval = setInterval(goNext, 4000);
    return () => clearInterval(interval);
  }, [total, goNext]);

  const positionClasses = "bottom-[52px] border-t border-primary/20";

  const current = slots[activeIndex];

  const handleEmptyClick = () => {
    setModalSlotIndex(activeIndex + 1);
    setShowModal(true);
  };

  const slideTransform = sliding
    ? direction === "left"
      ? "translate-x-[-100%] opacity-0"
      : "translate-x-[100%] opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <>
      <div className={`fixed inset-x-0 z-40 md:hidden ${positionClasses}`}>
        <div className="bg-base-200/95 backdrop-blur-sm overflow-hidden">
          <div
            className={`px-4 h-[80px] flex items-center transition-all duration-300 ease-in-out ${slideTransform}`}
          >
            {current ? (
              <div className="w-full">
                <PromoSlotPreview
                  startupName={current.startupName ?? ""}
                  startupIcon={current.startupIcon}
                  tagline={current.tagline}
                  font={current.font}
                  color={current.color}
                  href={current.startupWebsite ?? undefined}
                  compact
                />
              </div>
            ) : (
              <div
                onClick={handleEmptyClick}
                className="flex w-full cursor-pointer items-center justify-center gap-2"
              >
                <span className="text-xs font-semibold text-base-content/70">
                  Promote your startup
                </span>
                <span className="text-[10px] font-bold text-primary/80">
                  {STRIPE_PRICE_DISPLAY} or {BANANA_COST.toLocaleString()}
                </span>
                <Image
                  src="/banana.svg"
                  alt="bananas"
                  width={12}
                  height={12}
                  className="h-3 w-3"
                />
              </div>
            )}
          </div>

          {total > 1 && (
            <div className="flex justify-center gap-1.5 pb-2.5">
              {slots.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-4 bg-primary/70"
                      : "w-1.5 bg-base-content/20"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {showModal && (
        <PromoModal
          slotIndex={modalSlotIndex}
          user={user}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface PromoMobileBannerProps {
  slots: (PromoSlotType | null)[];
  user: User | null;
}

export function PromoMobileBanner({ slots, user }: PromoMobileBannerProps) {
  return (
    <PromoCarousel slots={slots} user={user} indexOffset={0} />
  );
}
