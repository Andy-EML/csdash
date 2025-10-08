import Link from "next/link";
import { IconUpload } from "@/components/ui/icons";
import { DevicesDashboard } from "@/components/devices/device-dashboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import type { OrderRow, DeviceRow, GasGageRow } from "@/lib/database.types";

export const revalidate = 60; // Cache for 60 seconds

// Transform Gas_Gage data to DeviceRow format for compatibility with existing dashboard
function transformGasGageToDevice(gasGage: GasGageRow): DeviceRow {
  return {
    serial_number: gasGage.serial_number,
    customer_name: gasGage.customer || null,
    model: gasGage.model || null,
    location: gasGage.device_location || null,
    last_updated_at: gasGage.latest_receive_date || null,
    toner_c_percent: gasGage.cyan || null,
    toner_m_percent: gasGage.magenta || null,
    toner_y_percent: gasGage.yellow || null,
    toner_k_percent: gasGage.black || null,
    waste_toner_percent: null, // Gas_Gage doesn't have waste toner data
    warning_message: null, // Will be generated based on toner levels
    counter_total: null, // Gas_Gage doesn't have counter data
    counter_color: null,
    counter_mono: null,
    created_at: gasGage.created_at || null,
    updated_at: gasGage.updated_at || null,
  };
}

export default async function DevicesPage() {
  const supabase = await getSupabaseServerClient();

  const [
    { data: gasGageDevices, error: gasGageError },
    { data: activeOrders, error: ordersError },
    { data: alertSettings, error: settingsError }
  ] = await Promise.all([
    supabase.from("Gas_Gage").select("*").order("customer", { ascending: true }),
    supabase
      .from("orders")
      .select("device_id, status")
      .in("status", ["open", "in_progress"] as OrderRow["status"][]),
    supabase.from("device_alert_settings").select("*")
  ]);

  if (gasGageError) {
    console.error("Failed to load Gas_Gage devices. Error details:", JSON.stringify(gasGageError, null, 2));
    throw new Error(
      `Unable to load devices from Supabase. Gas_Gage table error: ${gasGageError.message || 'Table may not exist'}. ` +
      `Please ensure you have run the SQL migration from supabase-migration.sql to create the Gas_Gage table.`
    );
  }

  if (ordersError) {
    console.error("Failed to load orders for dashboard", ordersError);
  }

  if (settingsError) {
    console.error("Failed to load alert settings", settingsError);
  }

  const activeDeviceIds = Array.from(
    new Set((activeOrders ?? []).map((order) => order.device_id))
  );

  // Create a map of device_id to alert settings for quick lookup
  const settingsMap = new Map(
    (alertSettings ?? []).map((setting) => [setting.device_id, setting])
  );

  // Transform Gas_Gage data to DeviceRow format and attach alert settings
  const devices = (gasGageDevices ?? []).map((gasGage) => {
    const device = transformGasGageToDevice(gasGage);
    const settings = settingsMap.get(gasGage.device_id);
    
    // Generate warning message based on custom thresholds
    if (settings) {
      const warnings: string[] = [];
      
      if (gasGage.black !== null && gasGage.black < settings.black_threshold) {
        warnings.push(`Low toner (K)`);
      }
      if (gasGage.cyan !== null && gasGage.cyan < settings.cyan_threshold) {
        warnings.push(`Low toner (C)`);
      }
      if (gasGage.magenta !== null && gasGage.magenta < settings.magenta_threshold) {
        warnings.push(`Low toner (M)`);
      }
      if (gasGage.yellow !== null && gasGage.yellow < settings.yellow_threshold) {
        warnings.push(`Low toner (Y)`);
      }
      
      if (warnings.length > 0) {
        device.warning_message = warnings.join(" • ");
      }
    }
    
    return device;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Device Management</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage your printer fleet</p>
        </div>
        <Button asChild>
          <Link href="/devices/import">
            <IconUpload className="h-4 w-4 mr-2" />
            Import CSV
          </Link>
        </Button>
      </div>
      
      <DevicesDashboard
        initialDevices={devices}
        activeOrderDeviceIds={activeDeviceIds}
      />
    </div>
  );
}
