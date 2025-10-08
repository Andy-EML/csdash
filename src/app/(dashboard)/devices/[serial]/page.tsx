import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateOrderButton } from "@/components/orders/create-order-button";
import TonerGaugeGroupClient from "@/components/devices/toner-gauge-group-client";
import { WasteTonerBar } from "@/components/ui/waste-toner-bar";
import { HighlightBadge } from "@/components/ui/highlight-badge";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";
import type { TonerKey, OrderRow, DeviceRow } from "@/lib/database.types";

export const revalidate = 0;

type DeviceDetailPageProps = {
  params: Promise<{ serial: string }>;
};

type DeviceOrderSummary = Pick<OrderRow, "order_id" | "order_type" | "status" | "created_at">;
type DeviceLogSummary = {
  snapshot_at: string;
  warning_message: string | null;
};

type WasteOrderVariant = {
  label: string;
  badgeClass: string;
};

const WASTE_ORDER_STATUS_MAP: Record<OrderRow["status"], WasteOrderVariant> = {
  open: { label: "Waste toner order open", badgeClass: "bg-red-100 text-red-700" },
  in_progress: { label: "Waste toner in progress", badgeClass: "bg-orange-100 text-orange-700" },
  completed: { label: "Waste toner completed", badgeClass: "bg-emerald-100 text-emerald-700" },
};

export default async function DeviceDetailPage({ params }: DeviceDetailPageProps) {
  const { serial } = await params;
  const supabase = await getSupabaseServerClient();

  const deviceResponse = await supabase
    .from("devices")
    .select("*")
    .eq("serial_number", serial)
    .maybeSingle<DeviceRow>();

  if (deviceResponse.error) {
    console.error("Failed to load device", deviceResponse.error);
    throw new Error("Unable to load device details");
  }

  const deviceRecord = deviceResponse.data ?? notFound();

  const logsResponse = await supabase
    .from("device_logs")
    .select("snapshot_at, warning_message")
    .eq("device_id", serial)
    .order("snapshot_at", { ascending: false })
    .limit(20);

  if (logsResponse.error) {
    console.error("Failed to load device logs", logsResponse.error);
  }

  const ordersResponse = await supabase
    .from("orders")
    .select("order_id, order_type, status, created_at")
    .eq("device_id", serial)
    .order("created_at", { ascending: false })
    .limit(10);

  if (ordersResponse.error) {
    console.error("Failed to load device orders", ordersResponse.error);
  }

  const logs = (logsResponse.data ?? []) as DeviceLogSummary[];
  const orders = (ordersResponse.data ?? []) as DeviceOrderSummary[];

  const tonerValues: Record<TonerKey, number | null | undefined> = {
    c: deviceRecord.toner_c_percent,
    m: deviceRecord.toner_m_percent,
    y: deviceRecord.toner_y_percent,
    k: deviceRecord.toner_k_percent,
  };

  const customerLabel = deviceRecord.customer_name ?? "Unassigned";

  const activeWasteOrder = orders.find(
    (order) => order.order_type === "waste_toner" && order.status !== "completed"
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <Link href="/devices" className="hover:text-neutral-900">
          Devices
        </Link>
        <span>/</span>
        <span className="text-neutral-900">{deviceRecord.serial_number}</span>
      </div>

      <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-neutral-500">
            {deviceRecord.model ?? "Unknown model"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-neutral-900">{customerLabel}</h1>
          <p className="text-sm text-neutral-500" suppressHydrationWarning>
            Last updated {formatRelativeTime(deviceRecord.last_updated_at ?? deviceRecord.updated_at)}
          </p>
        </div>
        <CreateOrderButton deviceId={deviceRecord.serial_number} customerName={customerLabel} />
      </header>

      <section className="grid gap-6 rounded-3xl bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
  <TonerGaugeGroupClient values={tonerValues} />
        <div className="flex flex-col gap-4">
          <WasteTonerBar
            value={deviceRecord.waste_toner_percent}
            highlight={Boolean(activeWasteOrder)}
            highlightLabel={activeWasteOrder ? WASTE_ORDER_STATUS_MAP[activeWasteOrder.status].label : undefined}
          />
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <span className="font-semibold text-neutral-700">Current warning</span>
            <p className="mt-1 text-neutral-600">
              {deviceRecord.warning_message ?? "No active warnings"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Counters</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <CounterCard label="Total prints" value={deviceRecord.counter_total} />
            <CounterCard label="Colour" value={deviceRecord.counter_color} />
            <CounterCard label="Mono" value={deviceRecord.counter_mono} />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Recent orders</h2>
          {orders.length > 0 ? (
            <ul className="mt-4 space-y-3 text-sm">
              {orders.map((order) => {
                const isWaste = order.order_type === "waste_toner";
                const wasteVariant = isWaste ? WASTE_ORDER_STATUS_MAP[order.status] : null;

                return (
                  <li
                    key={order.order_id}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium capitalize text-neutral-800">
                        {order.order_type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold uppercase text-neutral-600">
                        {order.status.replace("_", " ")}
                      </span>
                      {wasteVariant ? (
                        <HighlightBadge icon="waste" className={wasteVariant.badgeClass}>
                          {wasteVariant.label}
                        </HighlightBadge>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">No orders yet for this device.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Warning history</h2>
        {logs.length > 0 ? (
          <ul className="mt-4 space-y-3 text-sm">
            {logs.map((log) => (
              <li key={log.snapshot_at} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-neutral-700">{log.warning_message ?? "No warning"}</p>
                </div>
                <span className="text-xs text-neutral-500">
                  {new Date(log.snapshot_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">No warning history recorded.</p>
        )}
      </section>
    </div>
  );
}

type CounterCardProps = {
  label: string;
  value: number | null;
};

function CounterCard({ label, value }: CounterCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
      <span className="font-medium text-neutral-600">{label}</span>
      <span className="mt-2 block text-2xl font-semibold text-neutral-900">
        {typeof value === "number" ? value.toLocaleString() : "--"}
      </span>
    </div>
  );
}
