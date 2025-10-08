import Link from "next/link";
import { IconArrowLeft } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { AlertSettingsForm } from "@/components/devices/alert-settings-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ serial: string }>;
};

export default async function DeviceSettingsPage({ params }: PageProps) {
  const { serial } = await params;
  const supabase = await getSupabaseServerClient();

  // Fetch device info from Gas_Gage table
  const { data: device, error: deviceError } = await supabase
    .from("Gas_Gage")
    .select("*")
    .eq("serial_number", serial)
    .single();

  if (deviceError || !device) {
    notFound();
  }

  // Fetch existing alert settings
  const { data: settings } = await supabase
    .from("device_alert_settings")
    .select("*")
    .eq("device_id", device.device_id)
    .single();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/devices/${encodeURIComponent(serial)}`}>
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back to Device
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{device.customer || "Device Settings"}</h1>
        <p className="text-sm text-muted-foreground">
          {device.model} • Serial: {device.serial_number}
        </p>
      </div>

      <div className="max-w-4xl">
        <AlertSettingsForm
          deviceId={device.device_id}
          deviceName={device.customer || undefined}
          initialSettings={settings}
        />
      </div>

      <div className="max-w-4xl">
        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="font-semibold mb-2">About Alert Thresholds</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Alert thresholds determine when warnings appear on the dashboard for low toner levels.
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Set custom thresholds for each toner color independently</li>
            <li>Default threshold is 15% for all colors</li>
            <li>Alerts appear when toner levels fall below the configured threshold</li>
            <li>Settings are specific to this device and do not affect other devices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
