"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { PromoSlotPreview } from "./promo-slot-preview";
import { PROMO_FONTS, PROMO_COLORS } from "./constants";
import type { PromoFont, PromoSlot } from "@/lib/types";

interface PromoEditModalProps {
  slot: PromoSlot;
  onClose: () => void;
}

export function PromoEditModal({ slot, onClose }: PromoEditModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [tagline, setTagline] = useState(slot.tagline);
  const [font, setFont] = useState<PromoFont>(slot.font);
  const [color, setColor] = useState(slot.color);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/promo/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagline, font, color }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      toast("success", "Slot updated!");
      onClose();
      router.refresh();
    } catch {
      toast("error", "Something went wrong");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-fade-up rounded-2xl border border-base-300 bg-base-100 shadow-xl">
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
          <h3 className="text-sm font-bold">Edit your slot</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Preview */}
          <PromoSlotPreview
            startupName={slot.startupName ?? ""}
            startupIcon={slot.startupIcon}
            tagline={tagline}
            font={font}
            color={color}
          />

          {/* Tagline */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value.slice(0, 60))}
              className="input input-bordered w-full bg-base-200 text-sm"
              maxLength={60}
            />
            <div className="mt-1 text-right text-[10px] text-base-content/30">
              {tagline.length}/60
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PROMO_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === c.hex
                      ? "border-white scale-110"
                      : "border-transparent hover:border-white/30"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
              Font
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROMO_FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                    font === f.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-300 hover:border-base-content/30"
                  }`}
                  style={{ fontFamily: f.family }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary w-full"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
