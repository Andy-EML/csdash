import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateOrderButton } from "@/components/orders/create-order-button";
import TonerGaugeGroupClient from "@/components/devices/toner-gauge-group-client";
import { WasteTonerBar } from "@/components/ui/waste-toner-bar";
import { HighlightBadge } from "@/components/ui/highlight-badge";
import { QuickOrderButton } from "@/components/orders/quick-order-button";
import type { DeviceOrderPayload } from "@/lib/orders/create-supply-order";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";
import type {
  TonerKey,
  OrderRow,
  DeviceRow,
  GasGageRow,
  DeviceTonerSnapshotRow,
  DeviceMeterReadingRow,
  DeviceWarningEventRow,
} from "@/lib/database.types";

export const revalidate = 0;

type DeviceDetailPageProps = {
  params: Promise<{ serial: string }>;
};

type DeviceOrderSummary = Pick<
  OrderRow,
  | "order_id"
  | "order_type"
  | "status"
  | "created_at"
  | "ordered_at"
  | "sales_order_number"
  | "toner_color"
>;

type DeviceWarningSummary = {
  timestamp: string;
  message: string | null;
  recovered: boolean | null;
  warning_type: string | null;
  alert_code: string | null;
};

type WasteOrderVariant = {
  label: string;
  badgeClass: string;
};

const WASTE_ORDER_STATUS_MAP: Record<OrderRow["status"], WasteOrderVariant> = {
  open: {
    label: "Waste toner order open",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200",
  },
  in_progress: {
    label: "Waste toner in progress",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200",
  },
  completed: {
    label: "Waste toner completed",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  archived: {
    label: "Waste toner archived",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200",
  },
};

const TONER_COLOR_TO_KEY: Record<string, TonerKey> = {
  cyan: "c",
  magenta: "m",
  yellow: "y",
  black: "k",
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

  let deviceRecord = deviceResponse.data ?? null;

  const needsHydration =
    !deviceRecord ||
    deviceRecord.toner_c_percent === null ||
    deviceRecord.toner_m_percent === null ||
    deviceRecord.toner_y_percent === null ||
    deviceRecord.toner_k_percent === null;

  if (needsHydration) {
    const gasResponse = await supabase
      .from("Gas_Gage")
      .select("*")
      .eq("serial_number", serial)
      .maybeSingle<GasGageRow>();

    if (gasResponse.error) {
      console.error("Failed to load Gas_Gage device", gasResponse.error);
      throw new Error("Unable to load device details");
    }

    const gasDevice = gasResponse.data;

    if (!gasDevice && !deviceRecord) {
      notFound();
    }

    if (gasDevice) {
      deviceRecord = {
        device_id:
          deviceRecord?.device_id ?? gasDevice.device_id ?? gasDevice.serial_number,
        serial_number: gasDevice.serial_number,
        customer_name: gasDevice.customer ?? deviceRecord?.customer_name ?? null,
        model: gasDevice.model ?? deviceRecord?.model ?? null,
        location: gasDevice.device_location ?? deviceRecord?.location ?? null,
        last_updated_at:
          gasDevice.latest_receive_date ??
          gasDevice.updated_at ??
          gasDevice.created_at ??
          deviceRecord?.last_updated_at ??
          null,
        last_meter_received_at: deviceRecord?.last_meter_received_at ?? null,
        center_id: deviceRecord?.center_id ?? gasDevice.center_id ?? null,
        code_name: deviceRecord?.code_name ?? gasDevice.code_name ?? null,
        service_office: deviceRecord?.service_office ?? gasDevice.service_office ?? null,
        department: deviceRecord?.department ?? null,
        device_host_name:
          deviceRecord?.device_host_name ?? gasDevice.device_host_name ?? null,
        offline_threshold_minutes: deviceRecord?.offline_threshold_minutes ?? null,
        toner_k_percent: gasDevice.black ?? deviceRecord?.toner_k_percent ?? null,
        toner_c_percent: gasDevice.cyan ?? deviceRecord?.toner_c_percent ?? null,
        toner_m_percent: gasDevice.magenta ?? deviceRecord?.toner_m_percent ?? null,
        toner_y_percent: gasDevice.yellow ?? deviceRecord?.toner_y_percent ?? null,
        waste_toner_percent: deviceRecord?.waste_toner_percent ?? null,
        warning_message: deviceRecord?.warning_message ?? null,
        counter_total: deviceRecord?.counter_total ?? null,
        counter_color: deviceRecord?.counter_color ?? null,
        counter_mono: deviceRecord?.counter_mono ?? null,
        created_at: deviceRecord?.created_at ?? gasDevice.created_at ?? null,
        updated_at: deviceRecord?.updated_at ?? gasDevice.updated_at ?? null,
        last_seen_at: deviceRecord?.last_seen_at ?? null,
      } as DeviceRow;
    }
  }

  if (!deviceRecord) {
    notFound();
  }

  const deviceIdentifier = deviceRecord.device_id ?? deviceRecord.serial_number;

  const [snapshotResponse, meterResponse, warningEventsResponse, ordersResponse] =
    await Promise.all([
      supabase
        .from("device_toner_snapshots")
        .select("captured_at, black, cyan, magenta, yellow, waste_toner")
        .eq("serial_number", serial)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle<DeviceTonerSnapshotRow>(),
      supabase
        .from("device_meter_readings")
        .select(
          "captured_at, total, color_total, black_total, printer_total, copy_total, meter_a, meter_b, meter_c"
        )
        .eq("serial_number", serial)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle<DeviceMeterReadingRow>(),
      supabase
        .from("device_warning_events")
        .select(
          "alert_code, message, warning_type, received_at_server, occurred_at_device, recovered, recovered_at_server"
        )
        .eq("serial_number", serial)
        .order("received_at_server", { ascending: false, nullsFirst: false })
        .order("occurred_at_device", { ascending: false, nullsFirst: false })
        .limit(40),
      supabase
        .from("orders")
        .select(
          "order_id, order_type, status, created_at, ordered_at, sales_order_number, toner_color"
        )
        .eq("device_id", deviceIdentifier ?? serial)
        .order("ordered_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (snapshotResponse.error) {
    console.error("Failed to load latest toner snapshot", snapshotResponse.error);
  }
  if (meterResponse.error) {
    console.error("Failed to load latest meter reading", meterResponse.error);
  }
  if (warningEventsResponse.error) {
    console.error("Failed to load warning events", warningEventsResponse.error);
  }
  if (ordersResponse.error) {
    console.error("Failed to load device orders", ordersResponse.error);
  }

  const latestSnapshot = snapshotResponse.data ?? null;
  const latestMeter = meterResponse.data ?? null;
  const warningEvents = (warningEventsResponse.data ?? []) as DeviceWarningEventRow[];
  const orders = (ordersResponse.data ?? []) as DeviceOrderSummary[];

  if (latestSnapshot) {
    deviceRecord = {
      ...deviceRecord,
      toner_k_percent: latestSnapshot.black ?? deviceRecord.toner_k_percent,
      toner_c_percent: latestSnapshot.cyan ?? deviceRecord.toner_c_percent,
      toner_m_percent: latestSnapshot.magenta ?? deviceRecord.toner_m_percent,
      toner_y_percent: latestSnapshot.yellow ?? deviceRecord.toner_y_percent,
      waste_toner_percent:
        latestSnapshot.waste_toner ?? deviceRecord.waste_toner_percent ?? null,
      last_updated_at: latestSnapshot.captured_at ?? deviceRecord.last_updated_at,
    };
  }

  if (latestMeter) {
    deviceRecord = {
      ...deviceRecord,
      counter_total:
        latestMeter.total ??
        latestMeter.printer_total ??
        latestMeter.copy_total ??
        deviceRecord.counter_total,
      counter_color: latestMeter.color_total ?? deviceRecord.counter_color,
      counter_mono: latestMeter.black_total ?? deviceRecord.counter_mono,
      last_meter_received_at:
        latestMeter.captured_at ?? deviceRecord.last_meter_received_at,
    };
  }

  const warningHistory: DeviceWarningSummary[] = warningEvents
    .filter((event) => {
      const text = (
        event.message ??
        event.warning_type ??
        event.alert_code ??
        ""
      ).toLowerCase();
      return text.includes("toner");
    })
    .map((event) => ({
      timestamp:
        event.received_at_server ??
        event.occurred_at_device ??
        event.recovered_at_server ??
        event.created_at ??
        "",
      message: event.message ?? event.warning_type ?? event.alert_code ?? null,
      recovered: event.recovered ?? null,
      warning_type: event.warning_type ?? null,
      alert_code: event.alert_code ?? null,
    }))
    .filter((entry) => entry.timestamp);

  const tonerValues: Record<TonerKey, number | null | undefined> = {
    c: deviceRecord.toner_c_percent,
    m: deviceRecord.toner_m_percent,
    y: deviceRecord.toner_y_percent,
    k: deviceRecord.toner_k_percent,
  };

  const orderDevicePayload: DeviceOrderPayload = {
    serial_number: deviceRecord.serial_number,
    device_id: deviceRecord.device_id ?? deviceRecord.serial_number ?? serial,
    customer: deviceRecord.customer_name ?? null,
    model: deviceRecord.model ?? null,
    device_location: deviceRecord.location ?? null,
    latest_receive_date:
      deviceRecord.last_updated_at ?? deviceRecord.updated_at ?? deviceRecord.created_at ?? null,
    updated_at: deviceRecord.updated_at ?? deviceRecord.last_updated_at ?? null,
    created_at: deviceRecord.created_at ?? null,
    black: deviceRecord.toner_k_percent,
    cyan: deviceRecord.toner_c_percent,
    magenta: deviceRecord.toner_m_percent,
    yellow: deviceRecord.toner_y_percent,
  };

  const customerLabel = deviceRecord.customer_name ?? "Unassigned";
  const activeWasteOrder = orders.find(
    (order) => order.order_type === "waste_toner" && order.status !== "completed"
  );
  const activeTonerOrderKeys = Array.from(
    new Set(
      orders
        .filter(
          (order) =>
            order.order_type === "toner" &&
            order.status !== "completed" &&
            typeof order.toner_color === "string"
        )
        .map((order) => TONER_COLOR_TO_KEY[order.toner_color as string])
        .filter((value): value is TonerKey => Boolean(value))
    )
  );
  const activeWarning = warningHistory.find((entry) => entry.recovered !== true);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Link href="/devices" className="hover:text-foreground">
          Devices
        </Link>
        <span>/</span>
        <span className="text-foreground">{deviceRecord.serial_number}</span>
      </div>

      <header className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between dark:bg-card/80">
        <div>
          <p className="text-sm tracking-wide text-muted-foreground uppercase">
            {deviceRecord.model ?? "Unknown model"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">
            {customerLabel}
          </h1>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            Last updated{" "}
            {formatRelativeTime(deviceRecord.last_updated_at ?? deviceRecord.updated_at)}
          </p>
        </div>
        <CreateOrderButton
          deviceId={deviceRecord.serial_number}
          customerName={customerLabel}
        />
      </header>

      <section className="grid gap-6 rounded-3xl border border-border/60 bg-card p-6 shadow-sm lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] dark:bg-card/80">
        <TonerGaugeGroupClient
          values={tonerValues}
          orderConfig={{
            customerName: customerLabel,
            device: orderDevicePayload,
          }}
          activeOrderKeys={activeTonerOrderKeys}
        />
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <WasteTonerBar
              value={deviceRecord.waste_toner_percent}
              highlight={Boolean(activeWasteOrder)}
              highlightLabel={
                activeWasteOrder
                  ? WASTE_ORDER_STATUS_MAP[activeWasteOrder.status].label
                  : undefined
              }
            />
            <QuickOrderButton
              device={orderDevicePayload}
              customerName={customerLabel}
              scope="waste"
              className="text-primary text-xs font-medium hover:underline"
            />
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm dark:bg-muted/20">
            <span className="font-semibold text-foreground">Current warning</span>
            <p className="mt-1 text-muted-foreground">
              {activeWarning?.message ??
                deviceRecord.warning_message ??
                "No active warnings"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm dark:bg-card/80">
          <h2 className="text-lg font-semibold text-foreground">Counters</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <CounterCard label="Total prints" value={deviceRecord.counter_total} />
            <CounterCard label="Colour" value={deviceRecord.counter_color} />
            <CounterCard label="Mono" value={deviceRecord.counter_mono} />
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm dark:bg-card/80">
          <h2 className="text-lg font-semibold text-foreground">Recent orders</h2>
          {orders.length > 0 ? (
            <ul className="mt-4 space-y-3 text-sm">
              {orders.map((order) => {
                const isWaste = order.order_type === "waste_toner";
                const wasteVariant = isWaste
                  ? WASTE_ORDER_STATUS_MAP[order.status]
                  : null;
                const orderedAt = order.ordered_at ?? order.created_at;
                const colorLabel =
                  order.order_type === "toner" && order.toner_color
                    ? `${order.toner_color.charAt(0).toUpperCase()}${order.toner_color.slice(1)}`
                    : null;

                return (
                  <li
                    key={order.order_id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-4 py-3 dark:bg-muted/15"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground capitalize">
                        {order.order_type.replace("_", " ")}
                        {colorLabel ? ` - ${colorLabel}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(orderedAt).toLocaleString()}
                      </span>
                      {order.sales_order_number ? (
                        <span className="text-xs text-muted-foreground">
                          SO#: {order.sales_order_number}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
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
            <p className="mt-4 text-sm text-muted-foreground">
              No orders yet for this device.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm dark:bg-card/80">
        <h2 className="text-lg font-semibold text-foreground">Warning history</h2>
        {warningHistory.length > 0 ? (
          <ul className="mt-4 space-y-3 text-sm">
            {warningHistory.slice(0, 20).map((entry, index) => (
              <li
                key={`${entry.timestamp ?? "unknown"}-${index}`}
                className="flex items-start justify-between gap-4"
              >
                <div>
                  <p className="text-foreground">
                    {entry.message ?? "No warning"}
                    {entry.recovered ? " (Recovered)" : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No warning history recorded.</p>
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
    <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm dark:bg-muted/20">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="mt-2 block text-2xl font-semibold text-foreground">
        {typeof value === "number" ? value.toLocaleString() : "--"}
      </span>
    </div>
  );
}






