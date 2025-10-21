import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export type OrderScope = "black" | "cyan" | "magenta" | "yellow" | "waste";

export type DeviceOrderPayload = Pick<
  Database["public"]["Tables"]["Gas_Gage"]["Row"],
  | "serial_number"
  | "device_id"
  | "customer"
  | "model"
  | "device_location"
  | "latest_receive_date"
  | "updated_at"
  | "created_at"
  | "black"
  | "cyan"
  | "magenta"
  | "yellow"
>;

type SuccessResult = { success: true; serialNumber: string };
type ErrorResult = { success: false; message: string };

export type SupplyOrderResult = SuccessResult | ErrorResult;

const scopeToOrderType = (scope: OrderScope): Database["public"]["Enums"]["order_type"] =>
  scope === "waste" ? "waste_toner" : "toner";

const scopeToTonerColor = (scope: OrderScope): string | null =>
  scope === "waste" ? null : scope;

export type CreateSupplyOrderOptions = {
  status?: Database["public"]["Enums"]["order_status"];
  orderedAt?: string | null;
  salesOrderNumber?: string | null;
};

export async function createSupplyOrder(
  supabase: SupabaseClient<Database>,
  scope: OrderScope,
  device: DeviceOrderPayload,
  options?: CreateSupplyOrderOptions
): Promise<SupplyOrderResult> {
  const serialNumber = device.serial_number?.trim();
  if (!serialNumber) {
    return { success: false, message: "Device serial number is required." };
  }

  const orderType = scopeToOrderType(scope);
  const tonerColor = scopeToTonerColor(scope);
  const lastUpdatedIso =
    device.latest_receive_date ??
    device.updated_at ??
    device.created_at ??
    new Date().toISOString();

  const devicesPayload: Database["public"]["Tables"]["devices"]["Insert"] = {
    serial_number: serialNumber,
    customer_name: device.customer ?? null,
    model: device.model ?? null,
    location: device.device_location ?? null,
    last_updated_at: lastUpdatedIso,
    toner_k_percent: device.black,
    toner_c_percent: device.cyan,
    toner_m_percent: device.magenta,
    toner_y_percent: device.yellow,
  };

  const upsertResult = await supabase
    .from("devices")
    .upsert(devicesPayload, { onConflict: "serial_number" });

  if (upsertResult.error) {
    return {
      success: false,
      message: `Failed to sync device ${serialNumber}: ${upsertResult.error.message}`,
    };
  }

  const orderInsert = await supabase.from("orders").insert({
    device_id: serialNumber,
    customer_name: device.customer ?? "Unknown customer",
    order_type: orderType,
    toner_color: tonerColor,
    status: options?.status ?? "open",
    ordered_at: options?.orderedAt ?? null,
    sales_order_number: options?.salesOrderNumber ?? null,
  });

  if (orderInsert.error) {
    return {
      success: false,
      message: `Failed to create order for ${serialNumber}: ${orderInsert.error.message}`,
    };
  }

  return { success: true, serialNumber };
}
