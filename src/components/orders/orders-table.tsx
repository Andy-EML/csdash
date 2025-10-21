"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { OrderRow } from "@/lib/database.types";

const STATUS_LABELS: Record<OrderRow["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Record<string, true>>({});
  const [bulkStatus, setBulkStatus] = useState<OrderRow["status"]>("completed");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const filteredOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  const selectedOrderIds = useMemo(
    () => Object.keys(selectedOrders),
    [selectedOrders]
  );
  const hasSelection = selectedOrderIds.length > 0;
  const filteredOrderIds = useMemo(
    () => filteredOrders.map((order) => order.order_id),
    [filteredOrders]
  );
  const allFilteredSelected =
    filteredOrderIds.length > 0 &&
    filteredOrderIds.every((id) => Boolean(selectedOrders[id]));

  const toggleSelectionMode = () => {
    setSelectionMode((previous) => {
      if (previous) {
        setSelectedOrders({});
      }
      return !previous;
    });
  };

  const handleToggleOrderSelection = (orderId: string, nextSelected: boolean) => {
    setSelectedOrders((previous) => {
      const next = { ...previous };
      if (nextSelected) {
        next[orderId] = true;
      } else {
        delete next[orderId];
      }
      return next;
    });
  };

  const handleToggleAllFiltered = () => {
    setSelectedOrders((previous) => {
      if (allFilteredSelected) {
        const next = { ...previous };
        for (const id of filteredOrderIds) {
          delete next[id];
        }
        return next;
      }

      const next = { ...previous };
      for (const id of filteredOrderIds) {
        next[id] = true;
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedOrders({});
  };

  async function handleBulkStatusApply() {
    if (!hasSelection) {
      return;
    }
    const orderIdsToUpdate = selectedOrderIds;
    setBulkUpdating(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("orders")
      .update({ status: bulkStatus })
      .in("order_id", orderIdsToUpdate);

    if (error) {
      console.error(error);
      setBulkUpdating(false);
      return;
    }

    setOrders((previous) =>
      previous.map((order) =>
        orderIdsToUpdate.includes(order.order_id)
          ? {
              ...order,
              status: bulkStatus,
            }
          : order
      )
    );
    setSelectedOrders({});
    setBulkUpdating(false);
  }

  async function handleStatusChange(orderId: string, status: OrderRow["status"]) {
    if (selectionMode) {
      return;
    }
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
          <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track toner, waste, and service orders across all managed devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={selectionMode ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
            disabled={bulkUpdating}
            className="rounded-full px-4"
          >
            {selectionMode ? "Close bulk edit" : "Bulk edit"}
          </Button>
          <label
            className="text-sm font-medium text-muted-foreground"
            htmlFor="order-status-filter"
          >
            Status
          </label>
          <select
            id="order-status-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm dark:bg-card/80"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {selectionMode ? (
        <div className="border-border/60 bg-muted/40 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm text-foreground">
          <span className="font-medium">
            {hasSelection
              ? `${selectedOrderIds.length} order${selectedOrderIds.length === 1 ? "" : "s"} selected`
              : "Select orders to update their status"}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value as OrderRow["status"])}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold uppercase text-foreground shadow-sm dark:bg-card/80"
              aria-label="Bulk status"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              onClick={handleBulkStatusApply}
              disabled={!hasSelection || bulkUpdating}
              className="rounded-full px-4"
            >
              {bulkUpdating ? "Updating..." : "Apply status"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              disabled={!hasSelection || bulkUpdating}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleToggleAllFiltered}
              disabled={filteredOrderIds.length === 0}
            >
              {allFilteredSelected ? "Deselect visible" : "Select visible"}
            </Button>
          </div>
        </div>
      ) : null}

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card p-12 text-center shadow-sm dark:bg-card/70">
          <h2 className="text-lg font-semibold text-foreground">No orders found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Adjust the filter or create a new order from a device detail page.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:bg-card/80">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase dark:bg-muted/20">
              <tr>
                <th className="w-12 px-4 py-3">
                  {selectionMode ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={allFilteredSelected && filteredOrderIds.length > 0}
                      onChange={handleToggleAllFiltered}
                      aria-label="Toggle select visible orders"
                    />
                  ) : (
                    <span className="sr-only">Select</span>
                  )}
                </th>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.map((order) => {
                const isSelected = Boolean(selectedOrders[order.order_id]);
                return (
                  <tr
                    key={order.order_id}
                    className={`hover:bg-muted/40 dark:hover:bg-muted/20${
                      isSelected ? " bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {selectionMode ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          checked={isSelected}
                          onChange={(event) =>
                            handleToggleOrderSelection(order.order_id, event.target.checked)
                          }
                          aria-label={`Select order ${order.order_id}`}
                        />
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {order.order_id}
                    </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {order.customer_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        SN {order.device_id}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span>{order.device?.model ?? "Unknown model"}</span>
                      <span>{order.device?.customer_name ?? ""}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {ORDER_TYPE_LABELS[order.order_type]}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(event) =>
                        handleStatusChange(
                          order.order_id,
                          event.target.value as OrderRow["status"]
                        )
                      }
                      disabled={selectionMode || updatingId === order.order_id}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase text-foreground shadow-sm dark:bg-card/80"
                    >
                      {Object.entries(STATUS_LABELS).map(([statusValue, label]) => (
                        <option key={statusValue} value={statusValue}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
