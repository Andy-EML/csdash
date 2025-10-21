"use client";

import dynamic from "next/dynamic";
import type { TonerKey } from "@/lib/database.types";
import type { DeviceOrderPayload } from "@/lib/orders/create-supply-order";

const LazyTonerGaugeGroup = dynamic(
  () => import("./toner-gauge-group").then((mod) => mod.TonerGaugeGroup),
  {
    ssr: false,
    loading: () => <div className="h-28 w-full" />,
  }
);

export type TonerGaugeGroupClientProps = {
  values: Record<TonerKey, number | null | undefined>;
  size?: "xs" | "sm" | "md";
  className?: string;
  orderConfig?: {
    device: DeviceOrderPayload;
    customerName: string;
    disabled?: boolean;
  };
  activeOrderKeys?: TonerKey[];
};

export default function TonerGaugeGroupClient(props: TonerGaugeGroupClientProps) {
  return <LazyTonerGaugeGroup {...props} />;
}
