"use client";

import dynamic from "next/dynamic";
import type { TonerKey } from "@/lib/database.types";

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
};

export default function TonerGaugeGroupClient(props: TonerGaugeGroupClientProps) {
  return <LazyTonerGaugeGroup {...props} />;
}
