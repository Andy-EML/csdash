"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { DeviceOrderPayload } from "@/lib/orders/create-supply-order";

export type TonerScope = "black" | "cyan" | "magenta" | "yellow" | "waste";

const SCOPE_LABEL: Record<TonerScope, string> = {
  black: "Black toner",
  cyan: "Cyan toner",
  magenta: "Magenta toner",
  yellow: "Yellow toner",
  waste: "Waste toner",
};

type QuickOrderButtonProps = {
  device: DeviceOrderPayload;
  customerName: string;
  scope: TonerScope;
  disabled?: boolean;
  className?: string;
};

export function QuickOrderButton({
  device,
  customerName,
  scope,
  disabled,
  className,
}: QuickOrderButtonProps) {
  const router = useRouter();
  const serialNumber = useMemo(() => device.serial_number ?? "", [device.serial_number]);
  const [isOpen, setIsOpen] = useState(false);
  const [salesOrderNumber, setSalesOrderNumber] = useState("");
  const [orderedAt, setOrderedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setSalesOrderNumber("");
    setOrderedAt(new Date().toISOString().slice(0, 16));
    setError(null);
    setSubmitting(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope,
          device,
          orderedAt: orderedAt ? new Date(orderedAt).toISOString() : undefined,
          salesOrderNumber: salesOrderNumber.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error ?? "Unable to save the order. Please try again.");
        return;
      }

      setIsOpen(false);
      reset();
      router.refresh();
    } catch (unknownError) {
      console.error(unknownError);
      setError("Unable to save the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        size="sm"
        variant="outline"
        className={className ?? "h-7 text-xs"}
      >
        Order
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm dark:bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl dark:bg-card/90">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Quick order</h2>
                <p className="text-sm text-muted-foreground">
                  {customerName} &mdash; SN {serialNumber}
                </p>
                <p className="text-xs text-muted-foreground/80">{SCOPE_LABEL[scope]}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  reset();
                }}
                className="rounded-full border border-transparent px-3 py-1 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
              >
                Close
              </button>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-foreground">Sales order number</span>
                <input
                  value={salesOrderNumber}
                  onChange={(event) => setSalesOrderNumber(event.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm"
                  placeholder="Optional"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-foreground">Order date</span>
                <input
                  type="datetime-local"
                  value={orderedAt}
                  onChange={(event) => setOrderedAt(event.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm"
                  required
                />
              </label>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? "Saving..." : "Save order"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
