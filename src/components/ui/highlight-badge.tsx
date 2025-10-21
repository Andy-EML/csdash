"use client";

import { cn } from "@/lib/utils";

const ICONS = {
  waste: (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 7h14" />
      <path d="m10 11 .5 6" />
      <path d="m14 11-.5 6" />
      <path d="M7 7h10l-.9 10.8a2 2 0 0 1-2 1.8h-4.2a2 2 0 0 1-2-1.8L7 7Z" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    </svg>
  ),
  toner: (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v4" />
      <path d="M8 7h8" />
      <path d="M7 11h10" />
      <path d="M6 15h12" />
      <path d="M9 19h6" />
    </svg>
  ),
  jam: (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M3 13l9-9 9 9-9 9-9-9Z" />
    </svg>
  ),
  parts: (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  ),
} as const;

export type HighlightBadgeProps = {
  children: React.ReactNode;
  icon?: keyof typeof ICONS;
  className?: string;
};

export function HighlightBadge({ children, icon, className }: HighlightBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        className ?? "bg-blue-100 text-blue-700"
      )}
    >
      {icon ? ICONS[icon] : null}
      {children}
    </span>
  );
}
