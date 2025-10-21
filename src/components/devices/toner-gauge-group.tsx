"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { QuickOrderButton, TonerScope } from "@/components/orders/quick-order-button";
import type { TonerKey } from "@/lib/database.types";
import type { DeviceOrderPayload } from "@/lib/orders/create-supply-order";

// Dynamically import the client-only TonerGauge (it depends on recharts)
const TonerGauge = dynamic(
  () => import("@/components/ui/toner-gauge").then((mod) => mod.TonerGauge),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-28 w-28 items-center justify-center p-3">
        <div className="bg-muted/30 h-14 w-14 animate-pulse rounded-full" />
      </div>
    ),
  }
);

type OrderConfig = {
  customerName: string;
  device: DeviceOrderPayload;
  disabled?: boolean;
};

export type TonerGaugeGroupProps = {
  values: Partial<Record<TonerKey, number | null | undefined>>;
  size?: "xs" | "sm" | "md";
  className?: string;
  orderConfig?: OrderConfig;
  activeOrderKeys?: TonerKey[];
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

const TONER_SCOPE_MAP: Record<TonerKey, TonerScope> = {
  c: "cyan",
  m: "magenta",
  y: "yellow",
  k: "black",
};

export function TonerGaugeGroup({
  values,
  size = "md",
  className,
  orderConfig,
  activeOrderKeys,
}: TonerGaugeGroupProps) {
  const activeOrderSet = useMemo(() => {
    if (!activeOrderKeys || activeOrderKeys.length === 0) {
      return null;
    }
    return new Set(activeOrderKeys);
  }, [activeOrderKeys]);

  const gridCols =
    size === "md"
      ? "grid-cols-2 lg:grid-cols-4"
      : size === "sm"
        ? "grid-cols-2 md:grid-cols-4"
        : "grid-cols-4";

  return (
    <div className={cn("grid gap-3", gridCols, className)}>
      {TONER_CONFIG.map(({ key, label, color }) => (
        <div key={key} className="flex flex-col items-center gap-2">
          <TonerGauge
            label={label}
            color={color}
            value={values[key]}
            size={size}
            highlighted={activeOrderSet?.has(key)}
          />
          {orderConfig ? (
            <QuickOrderButton
              device={orderConfig.device}
              customerName={orderConfig.customerName}
              scope={TONER_SCOPE_MAP[key]}
              disabled={orderConfig.disabled}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
