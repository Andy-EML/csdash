import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { Bell, ExternalLink, Package } from "lucide-react";

type ActiveOrder = {
  order_id: string;
  device_id: string;
  customer_name: string;
  order_type: string;
  toner_color: string | null;
  ordered_at: string | null;
  sales_order_number: string | null;
  device_serial: string | null;
  current_level: number | null;
};

const TONER_COLOR_LABELS: Record<string, string> = {
  black: "Black",
  cyan: "Cyan",
  magenta: "Magenta",
  yellow: "Yellow",
};

const TONER_COLOR_CLASSES: Record<string, string> = {
  black:
    "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-500/20 dark:text-slate-100 dark:border-slate-500/60",
  cyan:
    "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-100 dark:border-cyan-500/60",
  magenta:
    "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-500/20 dark:text-fuchsia-100 dark:border-fuchsia-500/60",
  yellow:
    "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-500/60",
};

type TonerLevelKey = "black" | "cyan" | "magenta" | "yellow";

const isTonerLevelKey = (value: string | null | undefined): value is TonerLevelKey =>
  value === "black" || value === "cyan" || value === "magenta" || value === "yellow";

export default async function ActiveOrdersPage() {
  const supabase = await getSupabaseServerClient();
  const now = Date.now();

  // Fetch open orders with device information
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `
      order_id,
      device_id,
      customer_name,
      order_type,
      toner_color,
      ordered_at,
      sales_order_number
    `
    )
    .eq("status", "open")
    .order("ordered_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch active orders:", error);
  }

  // Enrich orders with current toner levels
  const enrichedOrders: ActiveOrder[] = [];

  if (orders && orders.length > 0) {
    const deviceIds = Array.from(
      new Set(
        orders
          .map((order) => order.device_id)
          .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      )
    );

    type DeviceTonerSnapshot = {
      device_id: string | null;
      serial_number: string | null;
      black: number | null;
      cyan: number | null;
      magenta: number | null;
      yellow: number | null;
    };

    const deviceMap = new Map<string, DeviceTonerSnapshot>();

    if (deviceIds.length > 0) {
      const { data: devices } = await supabase
        .from("Gas_Gage")
        .select("device_id, serial_number, black, cyan, magenta, yellow")
        .in("serial_number", deviceIds);

      devices?.forEach((device) => {
        if (device.serial_number) {
          deviceMap.set(device.serial_number, device);
        }
        if (device.device_id) {
          deviceMap.set(device.device_id, device);
        }
      });
    }

    for (const order of orders) {
      const device = deviceMap.get(order.device_id);
      let currentLevel: number | null = null;
      if (device && isTonerLevelKey(order.toner_color)) {
        currentLevel = device[order.toner_color];
      }

      enrichedOrders.push({
        ...order,
        device_serial: device?.serial_number || null,
        current_level: currentLevel,
      });
    }
  }

  // Categorize orders by urgency
  const criticalOrders = enrichedOrders.filter(
    (o) => o.current_level !== null && o.current_level <= 5
  );
  const urgentOrders = enrichedOrders.filter(
    (o) => o.current_level !== null && o.current_level > 5 && o.current_level <= 10
  );
  const normalOrders = enrichedOrders.filter(
    (o) => o.current_level === null || o.current_level > 10
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Orders</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Monitor and manage currently open toner orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="rounded-full px-4 py-1.5">
            {enrichedOrders.length} active{" "}
            {enrichedOrders.length === 1 ? "order" : "orders"}
          </Badge>
          <Button asChild variant="outline">
            <Link href="/orders">View all orders</Link>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 text-destructive flex h-12 w-12 items-center justify-center rounded-xl">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Critical
              </p>
              <p className="text-2xl font-bold">{criticalOrders.length}</p>
            </div>
          </div>
        </Card>
        <Card className="border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/10 flex h-12 w-12 items-center justify-center rounded-xl text-orange-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Urgent
              </p>
              <p className="text-2xl font-bold">{urgentOrders.length}</p>
            </div>
          </div>
        </Card>
        <Card className="border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Normal
              </p>
              <p className="text-2xl font-bold">{normalOrders.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {enrichedOrders.length === 0 ? (
        <Card className="border-border/60 bg-card/70 p-16 text-center backdrop-blur">
          <Package className="text-muted-foreground mx-auto h-16 w-16 opacity-20" />
          <h3 className="mt-4 text-lg font-semibold">No active orders</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            All orders have been completed or there are no pending orders.
          </p>
          <Button asChild className="mt-6">
            <Link href="/devices">Browse devices</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Critical Orders */}
          {criticalOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Bell className="text-destructive h-5 w-5" />
                Critical ({criticalOrders.length})
              </h2>
              <div className="space-y-3">
                {criticalOrders.map((order) => (
                  <OrderCard key={order.order_id} order={order} now={now} urgency="critical" />
                ))}
              </div>
            </div>
          )}

          {/* Urgent Orders */}
          {urgentOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Package className="h-5 w-5 text-orange-600" />
                Urgent ({urgentOrders.length})
              </h2>
              <div className="space-y-3">
                {urgentOrders.map((order) => (
                  <OrderCard key={order.order_id} order={order} now={now} urgency="urgent" />
                ))}
              </div>
            </div>
          )}

          {/* Normal Orders */}
          {normalOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Package className="text-primary h-5 w-5" />
                Normal ({normalOrders.length})
              </h2>
              <div className="space-y-3">
                {normalOrders.map((order) => (
                  <OrderCard key={order.order_id} order={order} now={now} urgency="normal" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type OrderCardProps = {
  order: ActiveOrder;
  now: number;
  urgency: "critical" | "urgent" | "normal";
};

function OrderCard({ order, now, urgency }: OrderCardProps) {
  const deviceLink = `/devices/${encodeURIComponent(order.device_serial || order.device_id)}`;
  const orderedAt = order.ordered_at ? new Date(order.ordered_at).getTime() : now;
  const timeAgo = formatRelativeTime(new Date(orderedAt).toISOString(), now);

  const tonerLabel = order.toner_color
    ? TONER_COLOR_LABELS[order.toner_color] || order.toner_color
    : "Unknown";
  const tonerColorClass = order.toner_color
    ? TONER_COLOR_CLASSES[order.toner_color] ||
      "bg-gray-100 text-gray-900 dark:bg-gray-600/30 dark:text-gray-100 dark:border-gray-500/60"
    : "bg-gray-100 text-gray-900 dark:bg-gray-600/30 dark:text-gray-100 dark:border-gray-500/60";

  const borderClass =
    urgency === "critical"
      ? "border-red-300 bg-red-50/60 dark:border-red-500/60 dark:bg-red-500/10"
      : urgency === "urgent"
        ? "border-orange-300 bg-orange-50/60 dark:border-orange-500/60 dark:bg-orange-500/10"
        : "border-border/60 bg-card/70 dark:border-border/70 dark:bg-card/60";

  return (
    <Card className={`${borderClass} p-6 backdrop-blur transition-all hover:shadow-md`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">{order.customer_name}</h3>
            {urgency === "critical" && (
              <Badge variant="destructive" className="rounded-full">
                CRITICAL
              </Badge>
            )}
            {urgency === "urgent" && (
              <Badge className="rounded-full border-orange-400 bg-orange-100 text-orange-700 dark:border-orange-500/70 dark:bg-orange-500/15 dark:text-orange-200">
                URGENT
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono text-xs">
                {order.device_serial || order.device_id}
              </span>
            </span>

            <Badge className={`rounded-full border ${tonerColorClass}`}>
              {tonerLabel} Toner
            </Badge>

            {order.current_level !== null && (
              <span
                className={`font-medium ${
                  order.current_level <= 5
                    ? "text-red-600"
                    : order.current_level <= 10
                      ? "text-orange-600"
                      : "text-muted-foreground"
                }`}
              >
                {order.current_level}% remaining
              </span>
            )}

            <span className="text-muted-foreground text-xs">
              Ordered {timeAgo}
            </span>

            {order.sales_order_number && (
              <span className="text-muted-foreground text-xs">
                SO# {order.sales_order_number}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={deviceLink} className="gap-2">
              View Device
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
