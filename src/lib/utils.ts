import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TonerStatusLevel = "normal" | "warning" | "critical" | "unknown";

export function getTonerStatusLevel(value: number | null | undefined): TonerStatusLevel {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "unknown";
  }
  if (value >= 50) {
    return "normal";
  }
  if (value >= 20) {
    return "warning";
  }
  return "critical";
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value)}%`;
}

export function formatRelativeTime(
  iso: string | null | undefined,
  referenceTime: number = Date.now()
) {
  if (!iso) {
    return "unknown";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const diffMinutes = Math.floor((referenceTime - date.getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
