"use client";

import { cn, formatPercent } from "@/lib/utils";
import { HighlightBadge } from "@/components/ui/highlight-badge";

export type WasteTonerBarProps = {
  value: number | null | undefined;
  className?: string;
  highlight?: boolean;
  highlightLabel?: string;
};

export function WasteTonerBar({
  value,
  className,
  highlight = false,
  highlightLabel,
}: WasteTonerBarProps) {
  const percent = value && value > 0 ? Math.min(100, Math.max(0, value)) : 0;
  const isCritical = value !== null && value !== undefined && value >= 85;

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-xs font-medium tracking-wide text-neutral-500 uppercase">
        <span>Waste Toner</span>
        <div className="flex items-center gap-2">
          {highlight ? (
            <HighlightBadge icon="waste" className="bg-red-100 text-red-700">
              {highlightLabel ?? "Order active"}
            </HighlightBadge>
          ) : null}
          <span className={cn(isCritical && "text-red-600")}>{formatPercent(value)}</span>
        </div>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-muted/50 dark:bg-muted/30">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isCritical ? "bg-destructive" : "bg-muted-foreground/70 dark:bg-muted-foreground/60"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
