"use client";

import type { TonerKey } from "@/lib/database.types";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// Dynamically import the client-only TonerGauge (it depends on recharts)
const TonerGauge = dynamic(
  () => import("@/components/ui/toner-gauge").then((mod) => mod.TonerGauge),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 w-28 p-3 flex items-center justify-center">
        <div className="h-14 w-14 rounded-full bg-muted/30 animate-pulse" />
      </div>
    ),
  }
);

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
