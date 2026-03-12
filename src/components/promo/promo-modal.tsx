"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, ChevronRight, Loader2, CreditCard, Plus, Upload } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { PromoSlotPreview } from "./promo-slot-preview";
import {
  PROMO_FONTS,
  PROMO_COLORS,
  BANANA_COST,
  STRIPE_PRICE_DISPLAY,
  STORAGE_KEY,
} from "./constants";
import type { PromoFont, PromoSlotDraft, User } from "@/lib/types";

interface PickerStartup {
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  website: string | null;
  mrr: number;
}

interface PromoModalProps {
  slotIndex: number;
  user: User | null;
  onClose: () => void;
}

type PickerMode = "search" | "custom";

export function PromoModal({ slotIndex, user, onClose }: PromoModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);

  // Picker state
  const [pickerMode, setPickerMode] = useState<PickerMode>("search");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PickerStartup[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PickerStartup | null>(null);

  // Custom startup state
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Design state
  const [tagline, setTagline] = useState("");
  const [website, setWebsite] = useState("");
  const [font, setFont] = useState<PromoFont>("inconsolata");
  const [color, setColor] = useState(PROMO_COLORS[0].hex);

  // Payment state
  const [paying, setPaying] = useState(false);

  // Derived
  const isCustom = pickerMode === "custom";
  const hasStartup = isCustom ? customName.trim().length > 0 : !!selected;
  const displayName = isCustom ? customName : selected?.name ?? "";
  const displayIcon = isCustom ? customIcon : selected?.icon ?? null;

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { draft: PromoSlotDraft; savedAt: string };
      const age = Date.now() - new Date(saved.savedAt).getTime();
      if (age > 86_400_000) return;
      if (saved.draft.slotIndex !== slotIndex) return;
      if (saved.draft.startupSlug === "__custom__") {
        setPickerMode("custom");
        setCustomName(saved.draft.startupName);
        setCustomIcon(saved.draft.startupIcon);
      } else {
        setSelected({
          slug: saved.draft.startupSlug,
          name: saved.draft.startupName,
          icon: saved.draft.startupIcon,
          description: null,
          website: saved.draft.startupWebsite,
          mrr: 0,
        });
      }
      setWebsite(saved.draft.startupWebsite ?? "");
      setTagline(saved.draft.tagline);
      setFont(saved.draft.font);
      setColor(saved.draft.color);
      setStep(2);
    } catch {}
  }, [slotIndex]);

  // Startup search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/picker?tab=startups&q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setResults(data.startups ?? []);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load initial results
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/picker?tab=startups&page=1");
        const data = await res.json();
        setResults(data.startups ?? []);
      } catch {}
    })();
  }, []);

  const handleSelectStartup = (s: PickerStartup) => {
    setSelected(s);
    setSearch("");
    if (s.description && !tagline) {
      setTagline(s.description.slice(0, 60));
    }
    if (s.website && !website) {
      setWebsite(s.website);
    }
  };

  const handleIconUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/promo/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast("error", data.error ?? "Upload failed");
      } else {
        setCustomIcon(data.url);
      }
    } catch {
      toast("error", "Upload failed");
    }
    setUploading(false);
  };

  const saveDraft = useCallback(() => {
    if (!hasStartup) return;
    const draft: PromoSlotDraft = {
      slotIndex,
      startupSlug: isCustom ? "__custom__" : selected!.slug,
      startupName: displayName,
      startupIcon: displayIcon,
      startupWebsite: website || null,
      tagline,
      font,
      color,
    };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ draft, savedAt: new Date().toISOString() })
    );
  }, [hasStartup, isCustom, selected, displayName, displayIcon, website, slotIndex, tagline, font, color]);

  const handleNext = () => {
    if (!hasStartup) return;
    saveDraft();
    setStep(2);
  };

  const handleSignIn = async () => {
    saveDraft();
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/api/auth/callback?next=${encodeURIComponent(`/?restore_promo=${slotIndex}`)}` },
    });
  };

  const buildPayload = () => ({
    slotIndex,
    startupSlug: isCustom ? null : selected!.slug,
    customName: isCustom ? customName : null,
    customIcon: isCustom ? customIcon : null,
    customWebsite: website || null,
    tagline,
    font,
    color,
  });

  const payWithStripe = async () => {
    if (!hasStartup) return;
    setPaying(true);
    try {
      const res = await fetch("/api/promo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("error", data.error ?? "Failed to start checkout");
        setPaying(false);
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = data.url;
    } catch {
      toast("error", "Something went wrong");
      setPaying(false);
    }
  };

  const payWithBananas = async () => {
    if (!hasStartup) return;
    setPaying(true);
    try {
      const res = await fetch("/api/promo/banana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("error", data.error ?? "Payment failed");
        setPaying(false);
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      toast("success", "Slot activated!", "Your promo slot is now live.");
      onClose();
      router.refresh();
    } catch {
      toast("error", "Something went wrong");
      setPaying(false);
    }
  };

  const canPayBananas = user && user.credits >= BANANA_COST;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up rounded-2xl border border-base-300 bg-base-100 shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-base-300 bg-base-100 px-5 py-4 rounded-t-2xl">
          <h3 className="text-sm font-bold">
            {step === 1 ? "Design your slot" : "Confirm & Pay"}
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className={`h-1.5 w-6 rounded-full ${step >= 1 ? "bg-primary" : "bg-base-300"}`} />
              <div className={`h-1.5 w-6 rounded-full ${step >= 2 ? "bg-primary" : "bg-base-300"}`} />
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4 p-5">
            {/* Startup picker */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                Choose a startup
              </label>

              {/* Mode tabs */}
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => { setPickerMode("search"); setCustomName(""); setCustomIcon(null); }}
                  className={`btn btn-xs ${pickerMode === "search" ? "btn-primary" : "btn-ghost"}`}
                >
                  From database
                </button>
                <button
                  onClick={() => { setPickerMode("custom"); setSelected(null); }}
                  className={`btn btn-xs ${pickerMode === "custom" ? "btn-primary" : "btn-ghost"}`}
                >
                  <Plus className="h-3 w-3" />
                  Custom
                </button>
              </div>

              {pickerMode === "search" ? (
                selected ? (
                  <div className="flex items-center gap-3 rounded-xl border border-base-300 bg-base-200 px-4 py-3">
                    {selected.icon && (
                      <img src={selected.icon} alt="" className="h-6 w-6 rounded-md" />
                    )}
                    <span className="flex-1 text-sm font-semibold">{selected.name}</span>
                    <button
                      onClick={() => setSelected(null)}
                      className="btn btn-ghost btn-xs btn-square"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search startups..."
                      className="input input-bordered w-full bg-base-200 text-sm"
                    />
                    <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-base-300 bg-base-200">
                      {searching ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-base-content/40" />
                        </div>
                      ) : results.length === 0 ? (
                        <div className="py-4 text-center text-xs text-base-content/40">
                          {search ? "No startups found" : "Type to search"}
                        </div>
                      ) : (
                        results.map((s) => (
                          <button
                            key={s.slug}
                            onClick={() => handleSelectStartup(s)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-base-300"
                          >
                            {s.icon ? (
                              <img src={s.icon} alt="" className="h-5 w-5 rounded" />
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded bg-base-300 text-[10px] font-bold">
                                {s.name[0]}
                              </div>
                            )}
                            <span className="flex-1 truncate text-sm">{s.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )
              ) : (
                /* Custom startup fields */
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Icon upload */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-base-content/20 bg-base-200 transition-colors hover:border-base-content/40"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-base-content/40" />
                      ) : customIcon ? (
                        <img src={customIcon} alt="" className="h-10 w-10 rounded-lg" />
                      ) : (
                        <Upload className="h-4 w-4 text-base-content/40" />
                      )}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleIconUpload(f);
                      }}
                    />
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value.slice(0, 40))}
                      placeholder="Startup name"
                      className="input input-bordered flex-1 bg-base-200 text-sm"
                      maxLength={40}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tagline + Website */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value.slice(0, 60))}
                placeholder="e.g. Ship faster with AI"
                className="input input-bordered w-full bg-base-200 text-sm"
                maxLength={60}
              />
              <div className="mt-1 text-right text-[10px] text-base-content/30">
                {tagline.length}/60
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                Link URL
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="input input-bordered w-full bg-base-200 text-sm"
              />
            </div>

            {/* Color + Font side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                  Color
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROMO_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setColor(c.hex)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
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
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                  Font
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PROMO_FONTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFont(f.id)}
                      className={`rounded-lg border px-2 py-1.5 text-xs transition-all ${
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
            </div>

            {/* Live preview */}
            {hasStartup && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                  Preview
                </label>
                <PromoSlotPreview
                  startupName={displayName}
                  startupIcon={displayIcon}
                  tagline={tagline}
                  font={font}
                  color={color}
                />
              </div>
            )}

            {/* Next button */}
            <button
              onClick={handleNext}
              disabled={!hasStartup}
              className="btn btn-primary w-full"
            >
              Continue to payment
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {/* Preview */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                Your slot
              </label>
              <PromoSlotPreview
                startupName={displayName}
                startupIcon={displayIcon}
                tagline={tagline}
                font={font}
                color={color}
              />
            </div>

            {/* Payment options */}
            {!user ? (
              <div className="space-y-3">
                <p className="text-center text-xs text-base-content/50">
                  Sign in to activate your slot
                </p>
                <button onClick={handleSignIn} className="btn btn-primary w-full">
                  Sign in with{" "}
                  <Image
                    src="/google.webp"
                    alt="Google"
                    width={20}
                    height={20}
                    className="inline-block"
                  />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                    Choose payment
                  </label>
                  <span className="text-[10px] text-base-content/40">One-time, no subscription</span>
                </div>

                {/* Stripe */}
                <button
                  onClick={payWithStripe}
                  disabled={paying}
                  className="btn btn-primary w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pay {STRIPE_PRICE_DISPLAY}
                  </span>
                  {paying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="badge badge-sm badge-ghost">1 month</span>
                  )}
                </button>

                {/* Bananas */}
                <button
                  onClick={payWithBananas}
                  disabled={paying || !canPayBananas}
                  className={`btn w-full justify-between ${
                    canPayBananas
                      ? "btn-outline btn-warning"
                      : "btn-disabled opacity-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Image src="/banana.svg" alt="" width={16} height={16} />
                    Pay {BANANA_COST.toLocaleString()} bananas
                  </span>
                  {paying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="badge badge-sm badge-ghost">
                      Balance: {user.credits.toLocaleString()}
                    </span>
                  )}
                </button>
                {!canPayBananas && (
                  <p className="text-center text-[10px] text-error/60">
                    Not enough bananas
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => setStep(1)}
              className="btn btn-ghost btn-sm w-full"
            >
              Back to design
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
