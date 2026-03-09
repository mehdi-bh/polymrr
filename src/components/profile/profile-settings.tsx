"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/components/ui/x-icon";
import { Camera, Check, X, Loader2, Pencil } from "lucide-react";
import type { User } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Editable Avatar                                                    */
/* ------------------------------------------------------------------ */

interface EditableAvatarProps {
  user: User;
  googleAvatarUrl: string | null;
}

export function EditableAvatar({ user, googleAvatarUrl }: EditableAvatarProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [activeAvatar, setActiveAvatar] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}`;
  const xAvatarUrl = user.xHandle ? `https://unavatar.io/x/${user.xHandle}` : null;

  // Check if an uploaded avatar exists
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setUploadedUrl(`${storageBase}?t=0`);
    img.onerror = () => {};
    img.src = storageBase;
  }, [storageBase]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function selectAvatar(url: string) {
    setSaving(true);
    setActiveAvatar(url);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_url: url }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      setUploadedUrl(url);
      setActiveAvatar(url);
    }
    setSaving(false);
    setOpen(false);
    router.refresh();
    if (fileRef.current) fileRef.current.value = "";
  }

  const isActive = (url: string | null) => !!url && activeAvatar === url;
  const isUploadActive = !!activeAvatar && !isActive(googleAvatarUrl) && !activeAvatar.includes("unavatar.io");

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="group relative rounded-2xl overflow-hidden"
      >
        {activeAvatar ? (
          <img src={activeAvatar} alt={user.xName} className="h-18 w-18 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
            {user.xName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-4 w-4 text-white" />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 rounded-lg bg-base-200 border border-base-300 shadow-xl z-20 p-2">
          <div className="flex items-center gap-2">
            {googleAvatarUrl && (
              <AvatarOption
                src={googleAvatarUrl}
                active={isActive(googleAvatarUrl)}
                onClick={() => selectAvatar(googleAvatarUrl)}
              />
            )}
            {xAvatarUrl && (
              <AvatarOption
                src={xAvatarUrl}
                active={activeAvatar?.includes("unavatar.io") ?? false}
                onClick={() => selectAvatar(xAvatarUrl)}
              />
            )}
            {uploadedUrl && (
              <AvatarOption
                src={uploadedUrl}
                active={isUploadActive}
                onClick={() => selectAvatar(uploadedUrl)}
              />
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-base-content/20 text-base-content/30 hover:border-primary hover:text-primary transition-colors"
              title="Upload photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-base-content/40" />}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

function AvatarOption({ src, active, onClick }: { src: string; active: boolean; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <button onClick={onClick} className="relative shrink-0">
      <div
        className={`h-9 w-9 rounded-full overflow-hidden transition-all ${
          active ? "ring-2 ring-primary ring-offset-1 ring-offset-base-200" : "opacity-50 hover:opacity-100"
        }`}
      >
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
      {active && (
        <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-content">
          <Check className="h-2 w-2" />
        </div>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable Name                                                      */
/* ------------------------------------------------------------------ */

interface EditableNameProps {
  user: User;
}

export function EditableName({ user }: EditableNameProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.xName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const clean = name.trim();
    if (!clean || clean === user.xName) { cancel(); return; }
    setSaving(true);

    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x_name: clean }),
    });

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    setName(user.xName);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group relative flex items-center gap-1.5"
      >
        <h1 className="text-2xl font-bold truncate">{user.xName}</h1>
        <Pencil className="h-3 w-3 text-base-content/40 opacity-0 group-hover:opacity-60 transition-opacity absolute -right-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-xl font-bold bg-base-200 border border-base-300 rounded-lg px-2 h-8 outline-none w-48"
      />
      <button
        onClick={save}
        disabled={saving}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </button>
      <button
        onClick={cancel}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-base-content/40 hover:bg-base-300 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable X Handle                                                  */
/* ------------------------------------------------------------------ */

interface EditableXHandleProps {
  user: User;
}

export function EditableXHandle({ user }: EditableXHandleProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [handle, setHandle] = useState(user.xHandle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const clean = handle.replace(/^@/, "").trim();
    setSaving(true);
    setError("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x_handle: clean || null }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    setHandle(user.xHandle);
    setEditing(false);
    setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  // Not editing — show handle or "link" prompt
  if (!editing) {
    if (user.xHandle) {
      return (
        <button
          onClick={() => setEditing(true)}
          className="group relative flex items-center gap-1.5 text-sm font-medium text-base-content/60 hover:text-base-content transition-colors"
        >
          <XIcon size={14} />
          <span>@{user.xHandle}</span>
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity absolute -right-5" />
        </button>
      );
    }
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-xs text-base-content/40 hover:text-primary transition-colors"
      >
        <XIcon size={12} />
        <span>Link X account</span>
      </button>
    );
  }

  // Editing mode — compact inline input
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0 rounded-lg bg-base-200 border border-base-300 px-2 h-7">
        <XIcon size={12} className="text-base-content/40 shrink-0" />
        <span className="text-xs text-base-content/40 ml-1">@</span>
        <input
          ref={inputRef}
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="handle"
          className="bg-transparent text-sm w-28 outline-none pl-0.5"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title="Save"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </button>
      <button
        onClick={cancel}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-base-content/40 hover:bg-base-300 transition-colors"
        title="Cancel"
      >
        <X className="h-3 w-3" />
      </button>
      {error && <span className="text-[10px] text-error">{error}</span>}
    </div>
  );
}
