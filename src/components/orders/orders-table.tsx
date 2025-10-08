"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OrderRow } from "@/lib/database.types";

const STATUS_LABELS: Record<OrderRow["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
};

const ORDER_TYPE_LABELS: Record<OrderRow["order_type"], string> = {
  toner: "Toner",
  waste_toner: "Waste Toner",
  service: "Service",
};

export type OrdersTableProps = {
  initialOrders: Array<
    OrderRow & {
      device?: {
        customer_name: string | null;
        model: string | null;
      } | null;
    }
  >;
};

export function OrdersTable({ initialOrders }: OrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<OrderRow["status"] | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  async function handleStatusChange(orderId: string, status: OrderRow["status"]) {
    setUpdatingId(orderId);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("order_id", orderId);

    if (error) {
      console.error(error);
      setUpdatingId(null);
      return;
    }

    setOrders((previous) =>
      previous.map((order) =>
        order.order_id === orderId
          ? {
              ...order,
              status,
            }
          : order
      )
    );
    setUpdatingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Orders</h1>
          <p className="text-sm text-neutral-500">
            Track toner, waste, and service orders across all managed devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-600" htmlFor="order-status-filter">
            Status
          </label>
          <select
            id="order-status-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">No orders found</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Adjust the filter or create a new order from a device detail page.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredOrders.map((order) => (
                <tr key={order.order_id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{order.order_id}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-900">{order.customer_name}</span>
                      <span className="text-xs text-neutral-500">SN {order.device_id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col text-xs text-neutral-500">
                      <span>{order.device?.model ?? "Unknown model"}</span>
                      <span>{order.device?.customer_name ?? ""}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-700">
                    {ORDER_TYPE_LABELS[order.order_type]}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(event) =>
                        handleStatusChange(order.order_id, event.target.value as OrderRow["status"])
                      }
                      disabled={updatingId === order.order_id}
                      className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold uppercase"
                    >
                      {Object.entries(STATUS_LABELS).map(([statusValue, label]) => (
                        <option key={statusValue} value={statusValue}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
