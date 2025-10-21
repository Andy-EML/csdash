"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const ORDER_TYPES = [
  { value: "toner", label: "Toner" },
  { value: "waste_toner", label: "Waste Toner" },
  { value: "service", label: "Service" },
] as const;

const ORDER_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export type CreateOrderButtonProps = {
  deviceId: string;
  customerName: string;
};

export function CreateOrderButton({ deviceId, customerName }: CreateOrderButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [orderType, setOrderType] =
    useState<(typeof ORDER_TYPES)[number]["value"]>("toner");
  const [status, setStatus] = useState<(typeof ORDER_STATUSES)[number]["value"]>("open");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function resetForm() {
    setOrderType("toner");
    setStatus("open");
    setSubmitting(false);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: insertError } = await supabase.from("orders").insert({
        device_id: deviceId,
        customer_name: customerName,
        order_type: orderType,
        status,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        resetForm();
        router.refresh();
      }, 600);
    } catch (unknownError) {
      console.error(unknownError);
      setError("Unable to create order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500"
      >
        Create Order
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-10 backdrop-blur-sm dark:bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl dark:bg-card/90">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">New order</h2>
                <p className="text-sm text-muted-foreground">
                  {customerName} - SN {deviceId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="rounded-full border border-transparent px-3 py-1 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
              >
                Close
              </button>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-foreground">Order type</span>
                <select
                  value={orderType}
                  onChange={(event) =>
                    setOrderType(
                      event.target.value as (typeof ORDER_TYPES)[number]["value"]
                    )
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm dark:bg-background/80"
                >
                  {ORDER_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-foreground">Status</span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as (typeof ORDER_STATUSES)[number]["value"]
                    )
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm dark:bg-background/80"
                >
                  {ORDER_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              {success ? <p className="text-sm text-green-600">Order created</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? "Creating..." : "Save order"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
