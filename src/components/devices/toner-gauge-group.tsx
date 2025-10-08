"use client";

import type { TonerKey } from "@/lib/database.types";
import { TonerGauge } from "@/components/ui/toner-gauge";
import { cn } from "@/lib/utils";

export type TonerGaugeGroupProps = {
  values: Partial<Record<TonerKey, number | null | undefined>>;
  size?: "xs" | "sm" | "md";
  className?: string;
};

const TONER_CONFIG: Array<{
  key: TonerKey;
  label: string;
  color: string;
}> = [
  { key: "c", label: "Cyan", color: "#00BFFF" },
  { key: "m", label: "Magenta", color: "#FF00FF" },
  { key: "y", label: "Yellow", color: "#FFD700" },
  { key: "k", label: "Black", color: "#000000" },
];

export function TonerGaugeGroup({ values, size = "md", className }: TonerGaugeGroupProps) {
  const gridCols =
    size === "md"
      ? "grid-cols-2 lg:grid-cols-4"
      : size === "sm"
        ? "grid-cols-2 md:grid-cols-4"
        : "grid-cols-4";

  return (
    <div className={cn("grid gap-3", gridCols, className)}>
      {TONER_CONFIG.map(({ key, label, color }) => (
        <TonerGauge key={key} label={label} color={color} value={values[key]} size={size} />
      ))}
    </div>
  );
}
