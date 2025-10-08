"use client";

import { cn } from "@/lib/utils";
import type { TonerColor } from "@/lib/database.types";

export type TonerBarDisplayProps = {
  black: number | null;
  cyan: number | null;
  magenta: number | null;
  yellow: number | null;
  wasteToner?: number | null;
  className?: string;
  showLabels?: boolean;
};

const TONER_COLORS: Record<string, { bg: string; text: string; label: string; fill: string }> = {
  black: {
    bg: "bg-neutral-100",
    text: "text-neutral-900",
    label: "K",
    fill: "bg-neutral-900",
  },
  cyan: {
    bg: "bg-cyan-50",
    text: "text-cyan-900",
    label: "C",
    fill: "bg-cyan-500",
  },
  magenta: {
    bg: "bg-pink-50",
    text: "text-pink-900",
    label: "M",
    fill: "bg-pink-500",
  },
  yellow: {
    bg: "bg-yellow-50",
    text: "text-yellow-900",
    label: "Y",
    fill: "bg-yellow-400",
  },
  waste: {
    bg: "bg-red-50",
    text: "text-red-900",
    label: "Waste",
    fill: "bg-red-500",
  },
};

type TonerBarProps = {
  label: string;
  value: number | null;
  colorKey: string;
  threshold?: number;
};

function TonerBar({ label, value, colorKey, threshold = 15 }: TonerBarProps) {
  const config = TONER_COLORS[colorKey];
  const percentage = value ?? 0;
  const isLow = percentage <= threshold;
  const isCritical = percentage <= 5;

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <div className={cn("w-14 text-sm font-semibold", config.text)}>
        {label}
      </div>

      {/* Bar Container */}
      <div className="flex-1 relative">
        <div
          className={cn(
            "h-10 rounded-lg overflow-hidden border-2",
            config.bg,
            isLow ? "border-orange-300" : "border-neutral-200",
            isCritical && "border-red-400 shadow-sm shadow-red-100"
          )}
        >
          {/* Fill */}
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out",
              config.fill,
              isCritical && "animate-pulse"
            )}
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          />

          {/* Percentage Label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "text-sm font-bold drop-shadow-sm",
                percentage > 50 ? "text-white" : config.text
              )}
            >
              {value !== null ? `${Math.round(percentage)}%` : "--"}
            </span>
          </div>
        </div>

        {/* Warning Icon for Low Levels */}
        {isLow && value !== null && (
          <div className="absolute -right-8 top-1/2 -translate-y-1/2">
            <svg
              className={cn(
                "h-6 w-6",
                isCritical ? "text-red-500" : "text-orange-500"
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export function TonerBarDisplay({
  black,
  cyan,
  magenta,
  yellow,
  wasteToner,
  className,
  showLabels = true,
}: TonerBarDisplayProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <TonerBar label="Black" value={black} colorKey="black" />
      <TonerBar label="Cyan" value={cyan} colorKey="cyan" />
      <TonerBar label="Magenta" value={magenta} colorKey="magenta" />
      <TonerBar label="Yellow" value={yellow} colorKey="yellow" />
      {wasteToner !== null && wasteToner !== undefined && (
        <TonerBar label="Waste" value={wasteToner} colorKey="waste" threshold={85} />
      )}
    </div>
  );
}
