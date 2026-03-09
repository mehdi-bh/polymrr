"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Share2, Download, X, Copy, Check } from "lucide-react";

interface ShareMarketButtonProps {
  question: string;
  startupName: string;
  startupIcon?: string | null;
  yesOdds: number;
  marketId: string;
  className?: string;
  size?: "sm" | "md";
  rounded?: "md" | "full";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch as blob to avoid CORS issues with canvas
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    } catch {
      reject(new Error("Failed to load image"));
    }
  });
}

async function generateShareImage(
  question: string,
  startupName: string,
  yesOdds: number,
  startupIcon?: string | null,
  rounded: "md" | "full" = "md",
): Promise<Blob> {
  const w = 1200;
  const h = 630;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#1e1e28";
  ctx.fillRect(0, 0, w, h);

  // Subtle border
  ctx.strokeStyle = "#252530";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  // Branding: chart icon + text
  const iconX = 60;
  const iconY = 44;
  const iconSize = 28;
  ctx.strokeStyle = "#f5a623";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // L-axis
  ctx.beginPath();
  ctx.moveTo(iconX + 3, iconY + 3);
  ctx.lineTo(iconX + 3, iconY + iconSize - 3);
  ctx.lineTo(iconX + iconSize - 3, iconY + iconSize - 3);
  ctx.stroke();
  // Chart line
  ctx.beginPath();
  ctx.moveTo(iconX + 7, iconY + iconSize * 0.55);
  ctx.lineTo(iconX + iconSize * 0.42, iconY + iconSize * 0.38);
  ctx.lineTo(iconX + iconSize * 0.62, iconY + iconSize * 0.55);
  ctx.lineTo(iconX + iconSize * 0.85, iconY + iconSize * 0.22);
  ctx.stroke();
  // Text
  const textX = iconX + iconSize + 10;
  ctx.fillStyle = "#e5e5e5";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText("Poly", textX, 70);
  const polyW = ctx.measureText("Poly").width;
  ctx.fillStyle = "#f5a623";
  ctx.fillText("MRR", textX + polyW, 70);

  // Startup icon + name
  const nameY = 120;
  let nameX = 60;
  if (startupIcon) {
    try {
      const img = await loadImage(startupIcon);
      const iconSize = 32;
      const iconY = nameY - iconSize + 6;
      const iconR = rounded === "full" ? iconSize / 2 : 6;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(60, iconY, iconSize, iconSize, iconR);
      ctx.clip();
      ctx.drawImage(img, 60, iconY, iconSize, iconSize);
      ctx.restore();
      nameX = 60 + iconSize + 12;
    } catch {
      // icon failed to load, skip it
    }
  }
  ctx.fillStyle = "#a0a0b0";
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText(startupName, nameX, nameY);

  // Question (word wrap)
  ctx.fillStyle = "#e5e5e5";
  ctx.font = "bold 42px system-ui, sans-serif";
  const words = question.split(" ");
  let line = "";
  let y = 200;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > w - 120 && line) {
      ctx.fillText(line.trim(), 60, y);
      line = word + " ";
      y += 56;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), 60, y);

  // Odds bar
  const barY = h - 200;
  const barW = w - 120;
  const barH = 32;
  const barR = 16;

  ctx.fillStyle = "#252530";
  ctx.beginPath();
  ctx.roundRect(60, barY, barW, barH, barR);
  ctx.fill();

  const yesW = (yesOdds / 100) * barW;
  ctx.fillStyle = "#34d399";
  ctx.beginPath();
  ctx.roundRect(60, barY, Math.max(yesW, barR * 2), barH, barR);
  ctx.fill();
  if (yesOdds < 95) {
    ctx.fillRect(60 + yesW - barR, barY, barR, barH);
  }

  const noW = ((100 - yesOdds) / 100) * barW;
  ctx.fillStyle = "#f87171";
  ctx.beginPath();
  ctx.roundRect(60 + barW - noW, barY, noW, barH, barR);
  ctx.fill();
  if (yesOdds > 5) {
    ctx.fillRect(60 + barW - noW, barY, barR, barH);
  }

  // Odds labels
  const labelY = barY + barH + 40;
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillStyle = "#34d399";
  ctx.fillText(`YES ${yesOdds}%`, 60, labelY);
  ctx.fillStyle = "#f87171";
  const noText = `NO ${100 - yesOdds}%`;
  ctx.fillText(noText, w - 60 - ctx.measureText(noText).width, labelY);

  // Footer
  ctx.fillStyle = "#555565";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("polymrr.com", 60, h - 40);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

export function ShareMarketButton({
  question,
  startupName,
  startupIcon,
  yesOdds,
  marketId,
  className,
  size = "md",
  rounded = "md",
}: ShareMarketButtonProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    const b = await generateShareImage(question, startupName, yesOdds, startupIcon, rounded);
    setBlob(b);
    setImageUrl(URL.createObjectURL(b));
  };

  const handleClose = useCallback(() => {
    setOpen(false);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setBlob(null);
    setCopied(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const handleCopy = async () => {
    if (!blob) return;
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `polymrr-${marketId}.png`;
    a.click();
  };

  const handleTweet = () => {
    const text = `${question}\n\nYES ${yesOdds}% · NO ${100 - yesOdds}%\n\nPlace your bet on PolyMRR`;
    const url = `https://polymrr.com/markets/${marketId}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "width=550,height=420",
    );
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`btn btn-ghost gap-1.5 ${size === "sm" ? "btn-sm btn-square" : ""} ${className ?? ""}`}
        title="Share this market"
      >
        <Share2 className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {size === "md" && <span>Share</span>}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-base-200/90 backdrop-blur-md" onClick={handleClose}>
          <div
            className="card w-full max-w-xl bg-base-100 border border-base-300 shadow-2xl mx-4 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-body gap-4 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Share this market</h3>
                <button onClick={handleClose} className="btn btn-ghost btn-sm btn-square">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-hidden rounded-lg">
                {imageUrl ? (
                  <img src={imageUrl} alt="Share preview" className="w-full" />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg text-sm text-base-content/50 bg-base-200">
                    Generating image...
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={handleCopy} className="btn btn-sm btn-ghost gap-1.5 flex-1" disabled={!blob}>
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy image"}
                </button>
                <button onClick={handleDownload} className="btn btn-sm btn-ghost gap-1.5 flex-1" disabled={!imageUrl}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button onClick={handleTweet} className="btn btn-sm btn-primary gap-1.5 flex-1">
                  <Share2 className="h-3.5 w-3.5" />
                  Tweet
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
