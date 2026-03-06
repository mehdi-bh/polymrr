"use client";

import { useEffect, useRef } from "react";

interface PnlPoint {
  date: string;
  value: number;
}

interface PnlChartProps {
  data: PnlPoint[];
}

export function PnlChart({ data }: PnlChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padTop = 16;
    const padBottom = 28;
    const padLeft = 8;
    const padRight = 60;

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values) * 0.95;
    const maxVal = Math.max(...values) * 1.05;
    const range = maxVal - minVal || 1;

    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    function x(i: number) {
      return padLeft + (i / (data.length - 1)) * chartW;
    }
    function y(v: number) {
      return padTop + chartH - ((v - minVal) / range) * chartH;
    }

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines + right-side labels
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px Inconsolata, monospace";
    ctx.textAlign = "right";
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = minVal + (range * i) / steps;
      const yPos = y(val);
      ctx.beginPath();
      ctx.moveTo(padLeft, yPos);
      ctx.lineTo(W - padRight, yPos);
      ctx.stroke();
      ctx.fillText(Math.round(val).toLocaleString(), W - 4, yPos + 4);
    }

    // X-axis date labels
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    const labelCount = Math.min(5, data.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      const d = new Date(data[idx].date);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      ctx.fillText(label, x(idx), H - 6);
    }

    // Fill gradient under line
    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    gradient.addColorStop(0, "rgba(245,166,35,0.15)");
    gradient.addColorStop(1, "rgba(245,166,35,0)");

    ctx.beginPath();
    ctx.moveTo(x(0), y(values[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(x(i), y(values[i]));
    }
    ctx.lineTo(x(data.length - 1), padTop + chartH);
    ctx.lineTo(x(0), padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(x(0), y(values[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(x(i), y(values[i]));
    }
    ctx.strokeStyle = "#f5a623";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // End dot
    const lastX = x(data.length - 1);
    const lastY = y(values[values.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f5a623";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(245,166,35,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="h-[180px] w-full"
      style={{ display: "block" }}
    />
  );
}
