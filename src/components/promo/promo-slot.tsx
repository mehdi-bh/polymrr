"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { PromoSlotPreview } from "./promo-slot-preview";
import { PromoModal } from "./promo-modal";
import { PromoEditModal } from "./promo-edit-modal";
import { STORAGE_KEY, STRIPE_PRICE_DISPLAY, BANANA_COST } from "./constants";
import type { PromoSlot as PromoSlotType, User } from "@/lib/types";

interface PromoSlotProps {
  slotIndex: number;
  slot: PromoSlotType | null;
  user: User | null;
}

export function PromoSlot({ slotIndex, slot, user }: PromoSlotProps) {
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Auto-open modal if restoring from OAuth redirect
  useEffect(() => {
    const restoreSlot = searchParams.get("restore_promo");
    if (restoreSlot && parseInt(restoreSlot) === slotIndex) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setShowModal(true);
        // Clean URL
        window.history.replaceState({}, "", "/");
      }
    }
    // Also open on promo_success
    if (searchParams.get("promo_success") === "1") {
      localStorage.removeItem(STORAGE_KEY);
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, slotIndex]);

  const isOwner = user && slot && slot.userId === user.id;

  // Filled slot
  if (slot) {
    return (
      <>
        <div className="relative">
          <PromoSlotPreview
            startupName={slot.startupName ?? ""}
            startupIcon={slot.startupIcon}
            tagline={slot.tagline}
            font={slot.font}
            color={slot.color}
            href={slot.startupWebsite ?? undefined}
          />
          {isOwner && (
            <button
              onClick={() => setShowEdit(true)}
              className="absolute right-2 top-2 btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              style={{ opacity: undefined }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "")}
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
        {showEdit && slot && (
          <PromoEditModal slot={slot} onClose={() => setShowEdit(false)} />
        )}
      </>
    );
  }

  // Empty slot
  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="group relative flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-primary/20 bg-base-100/50 px-5 py-5 transition-all hover:border-primary/40 hover:bg-base-100"
      >
        <div className="text-center">
          <p className="text-xs font-semibold text-base-content/40 transition-colors group-hover:text-base-content/60">
            Promote your startup here
          </p>
          <p className="text-[10px] font-bold tracking-wide text-primary/40 transition-colors group-hover:text-primary/70">
            {STRIPE_PRICE_DISPLAY} or {BANANA_COST.toLocaleString()}{" "}
            <span className="inline-block align-middle">
              <Image
                src="/banana.svg"
                alt="bananas"
                width={12}
                height={12}
                className="-mt-0.5 inline h-3 w-3"
              />
            </span>
          </p>
        </div>
      </div>
      {showModal && (
        <PromoModal
          slotIndex={slotIndex}
          user={user}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
