import { DevicesDashboard } from "@/components/devices/device-dashboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  DeviceAlertSettingsRow,
  DeviceWarningOverrideRow,
  GasGageRow,
} from "@/lib/database.types";

export const revalidate = 60;

export default async function DevicesPage() {
  const supabase = await getSupabaseServerClient();

  const [
    { data: gasGageDevices, error: gasGageError },
    { data: activeOrders, error: ordersError },
    { data: alertSettings, error: settingsError },
    { data: warningOverrides, error: overridesError },
  ] = await Promise.all([
    supabase.from("Gas_Gage").select("*").order("customer", { ascending: true }),
    supabase
      .from("orders")
      .select("device_id, status, toner_color, order_type, ordered_at")
      .eq("status", "open"),
    supabase.from("device_alert_settings").select("*"),
    supabase.from("device_warning_overrides").select("*"),
  ]);

  if (gasGageError) {
    console.error(
      "Failed to load Gas_Gage devices. Error details:",
      JSON.stringify(gasGageError, null, 2)
    );
    throw new Error(
      `Unable to load devices from Supabase. Gas_Gage table error: ${
        gasGageError.message || "Table may not exist"
      }. Please ensure you have run the SQL migration from supabase-migration.sql to create the Gas_Gage table.`
    );
  }

  const activeDeviceIds = Array.from(
    new Set((activeOrders ?? []).map((order) => order.device_id))
  );

  return (
    <DevicesDashboard
      devices={(gasGageDevices ?? []) as GasGageRow[]}
      alertSettings={(alertSettings ?? []) as DeviceAlertSettingsRow[]}
      activeOrderDeviceIds={activeDeviceIds}
      activeOrders={activeOrders ?? []}
      ordersError={ordersError?.message}
      settingsError={settingsError?.message}
      warningOverrides={(warningOverrides ?? []) as DeviceWarningOverrideRow[]}
      overridesError={overridesError?.message}
      renderedAt={Date.now()}
    />
  );
}
