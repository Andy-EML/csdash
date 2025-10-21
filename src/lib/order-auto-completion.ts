import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type TonerColor = "black" | "cyan" | "magenta" | "yellow";

type TonerLevels = {
  black: number | null;
  cyan: number | null;
  magenta: number | null;
  yellow: number | null;
};

type DeviceTonerChange = {
  deviceId: string;
  serialNumber: string;
  oldLevels: TonerLevels;
  newLevels: TonerLevels;
};

type AutoCompletionResult = {
  ordersCompleted: number;
  completionDetails: Array<{
    orderId: string;
    deviceId: string;
    tonerColor: TonerColor;
    levelBefore: number;
    levelAfter: number;
  }>;
};

const TONER_COLOR_MAP: Record<string, TonerColor> = {
  black: "black",
  cyan: "cyan",
  magenta: "magenta",
  yellow: "yellow",
};

/**
 * Detects toner replacements and auto-completes orders
 */
export async function detectAndCompleteTonerReplacements(
  supabase: SupabaseClient<Database>,
  changes: DeviceTonerChange[]
): Promise<AutoCompletionResult> {
  const result: AutoCompletionResult = {
    ordersCompleted: 0,
    completionDetails: [],
  };

  if (changes.length === 0) {
    return result;
  }

  // Get device IDs and serial numbers
  const deviceIds = changes
    .map((c) => c.deviceId?.trim())
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const serialNumbers = changes
    .map((c) => c.serialNumber?.trim())
    .filter((sn): sn is string => typeof sn === "string" && sn.length > 0);

  const orderDeviceIds = Array.from(new Set([...serialNumbers, ...deviceIds]));

  if (orderDeviceIds.length === 0) {
    return result;
  }

  // Fetch open orders for these devices
  const { data: openOrders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "open")
    .in("device_id", orderDeviceIds);

  if (ordersError || !openOrders || openOrders.length === 0) {
    return result;
  }

  // Get alert settings to determine replacement thresholds
  let alertSettings: Array<{
    device_id: string;
    replacement_detection_threshold: number;
  }> | null = null;

  if (deviceIds.length > 0) {
    const { data } = await supabase
      .from("device_alert_settings")
      .select("device_id, replacement_detection_threshold")
      .in("device_id", Array.from(new Set(deviceIds)));

    alertSettings = data ?? null;
  }

  const thresholdMap = new Map<string, number>();
  alertSettings?.forEach((setting) => {
    thresholdMap.set(setting.device_id, setting.replacement_detection_threshold);
  });

  const DEFAULT_THRESHOLD = 70;

  // Process each device change
  for (const change of changes) {
    const threshold = thresholdMap.get(change.deviceId) ?? DEFAULT_THRESHOLD;

    // Find orders for this device
    const deviceOrders = openOrders.filter(
      (order) =>
        order.device_id === change.serialNumber || order.device_id === change.deviceId
    );

    // Check each toner color
    const colors: Array<keyof TonerLevels> = ["black", "cyan", "magenta", "yellow"];

    for (const color of colors) {
      const oldLevel = change.oldLevels[color];
      const newLevel = change.newLevels[color];

      // Skip if either level is null
      if (oldLevel === null || newLevel === null) {
        continue;
      }

      // Calculate increase
      const increase = newLevel - oldLevel;

      // Check if increase meets threshold
      if (increase >= threshold) {
        // Find matching order for this color
        const matchingOrder = deviceOrders.find(
          (order) => order.toner_color === TONER_COLOR_MAP[color]
        );

        if (matchingOrder) {
          // Auto-complete the order
          const now = new Date().toISOString();

          const { error: updateError } = await supabase
            .from("orders")
            .update({
              status: "completed",
            })
            .eq("order_id", matchingOrder.order_id);

          if (!updateError) {
            // Log lifecycle event
            await supabase.from("order_lifecycle_events").insert({
              order_id: matchingOrder.order_id,
              event_type: "auto_completed",
              toner_color: TONER_COLOR_MAP[color],
              toner_level_before: oldLevel,
              toner_level_after: newLevel,
              auto_completed: true,
              notes: `Auto-completed due to ${increase}% increase (threshold: ${threshold}%)`,
              detected_at: now,
            });

            // Update toner replacement date in Gas_Gage
            const replacementDateField =
              `toner_replacement_date_${color}` as keyof Database["public"]["Tables"]["Gas_Gage"]["Update"];

            const updatePayload = {
              [replacementDateField]: now,
            } as unknown as Database["public"]["Tables"]["Gas_Gage"]["Update"];

            await supabase.from("Gas_Gage").update(updatePayload).eq("device_id", change.deviceId);

            result.ordersCompleted++;
            result.completionDetails.push({
              orderId: matchingOrder.order_id,
              deviceId: change.deviceId,
              tonerColor: TONER_COLOR_MAP[color],
              levelBefore: oldLevel,
              levelAfter: newLevel,
            });
          }
        }
      }
    }
  }

  return result;
}

/**
 * Fetches current toner levels for devices before import
 */
export async function fetchCurrentTonerLevels(
  supabase: SupabaseClient<Database>,
  deviceIds: string[]
): Promise<Map<string, TonerLevels>> {
  const levels = new Map<string, TonerLevels>();

  if (deviceIds.length === 0) {
    return levels;
  }

  const { data: devices } = await supabase
    .from("Gas_Gage")
    .select("device_id, serial_number, black, cyan, magenta, yellow")
    .in("device_id", deviceIds);

  devices?.forEach((device) => {
    if (device.device_id) {
      levels.set(device.device_id, {
        black: device.black,
        cyan: device.cyan,
        magenta: device.magenta,
        yellow: device.yellow,
      });
    }
  });

  return levels;
}
