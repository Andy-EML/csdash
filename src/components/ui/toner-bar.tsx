"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const SIZE_MAP = {
  compact: {
    container: "min-w-[72px]",
    bar: "h-1.5",
    font: "text-[10px]",
  },
  comfortable: {
    container: "min-w-[84px]",
    bar: "h-2",
    font: "text-[11px]",
  },
  spacious: {
    container: "min-w-[96px]",
    bar: "h-2.5",
    font: "text-[12px]",
  },
} as const;

type TonerBarProps = {
  value: number | null;
  label: string;
  density: "compact" | "comfortable" | "spacious";
  color?: string;
};

export function TonerBar({ value, label, density, color }: TonerBarProps) {
  const styles = SIZE_MAP[density];

  if (value === null || Number.isNaN(value)) {
    return (
      <div className={cn("flex items-center gap-2", styles.container)}>
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">--</span>
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, value));
  const indicatorColor = getIndicatorColor(clamped, color);

  return (
    <div className={cn("flex items-center gap-2", styles.container)}>
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <div className="flex flex-1 items-center gap-1">
        <Progress
          value={clamped}
          className={styles.bar}
          indicatorClassName="bg-transparent"
          indicatorStyle={{ backgroundColor: indicatorColor }}
        />
        <span className={cn("font-semibold text-foreground", styles.font)}>{Math.round(clamped)}%</span>
      </div>
    </div>
  );
}

function getIndicatorColor(value: number, fallback?: string) {
  if (value >= 50) {
    return fallback ?? "#16a34a";
  }
  if (value >= 20) {
    return "#f59e0b";
  }
  return "#dc2626";
}
