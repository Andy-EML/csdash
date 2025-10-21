"use client";

import { useMemo } from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { cn, formatPercent, getTonerStatusLevel } from "@/lib/utils";
import type { DeviceStatusLevel } from "@/lib/database.types";

const STATUS_RING_COLOR: Record<DeviceStatusLevel, string> = {
  normal: "ring-green-400",
  warning: "ring-orange-400",
  critical: "ring-red-500",
  unknown: "ring-zinc-300",
};

const SIZE_STYLES = {
  md: {
    container: "h-40 w-40 p-4",
    chart: "h-24 w-24",
    valueText: "text-xl",
    labelText: "text-sm",
  },
  sm: {
    container: "h-28 w-28 p-3",
    chart: "h-18 w-18",
    valueText: "text-lg",
    labelText: "text-[11px]",
  },
  xs: {
    container: "h-20 w-20 p-2.5",
    chart: "h-14 w-14",
    valueText: "text-base",
    labelText: "text-[10px]",
  },
} as const;

export type TonerGaugeProps = {
  value: number | null | undefined;
  color: string;
  label: string;
  className?: string;
  size?: keyof typeof SIZE_STYLES;
  highlighted?: boolean;
};

export function TonerGauge({
  value,
  color,
  label,
  className,
  size = "md",
  highlighted = false,
}: TonerGaugeProps) {
  const status = getTonerStatusLevel(value);
  const chartValue = value && value > 0 ? Math.max(0, Math.min(100, value)) : 0;
  const styles = SIZE_STYLES[size];

  const chartData = useMemo(
    () => [
      {
        name: label,
        value: chartValue,
        fill: color,
      },
    ],
    [label, chartValue, color]
  );
  const ringClass = highlighted
    ? "ring-blue-500 dark:ring-blue-400"
    : STATUS_RING_COLOR[status];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-full bg-muted/40 shadow-inner ring-4 dark:bg-muted/20",
        styles.container,
        ringClass,
        className
      )}
      aria-label={`${label} toner level ${formatPercent(value)}`}
    >
      <div className={cn("relative", styles.chart)}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={chartData}
            startAngle={220}
            endAngle={-40}
            innerRadius="80%"
            outerRadius="100%"
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              dataKey="value"
              tick={false}
            />
            <RadialBar
              background
              dataKey="value"
              cornerRadius={50}
              fill={color}
              className="drop-shadow"
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-medium uppercase text-muted-foreground", styles.labelText)}>
          {label}
        </span>
        <span className={cn("font-semibold text-foreground", styles.valueText)}>
          {formatPercent(value)}
        </span>
      </div>
    </div>
  );
}
