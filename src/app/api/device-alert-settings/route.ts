import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ThresholdPayload = {
  device_id?: string | null;
  black_threshold?: number | null;
  cyan_threshold?: number | null;
  magenta_threshold?: number | null;
  yellow_threshold?: number | null;
  alerts_enabled?: boolean | null;
};

function sanitizeThreshold(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ThresholdPayload;
    const deviceId = payload.device_id?.trim();

    if (!deviceId) {
      return NextResponse.json(
        { error: "device_id is required." },
        { status: 400 }
      );
    }

    const DEFAULT_THRESHOLD = 15;

    const black = sanitizeThreshold(payload.black_threshold, DEFAULT_THRESHOLD);
    const cyan = sanitizeThreshold(payload.cyan_threshold, DEFAULT_THRESHOLD);
    const magenta = sanitizeThreshold(payload.magenta_threshold, DEFAULT_THRESHOLD);
    const yellow = sanitizeThreshold(payload.yellow_threshold, DEFAULT_THRESHOLD);
    const alertsEnabled = payload.alerts_enabled ?? true;

    const supabase = getSupabaseServiceClient();

    const { error } = await supabase.from("device_alert_settings").upsert(
      {
        device_id: deviceId,
        black_threshold: black,
        cyan_threshold: cyan,
        magenta_threshold: magenta,
        yellow_threshold: yellow,
        special_color_threshold: null,
        alerts_enabled: alertsEnabled,
        black_enabled: alertsEnabled,
        cyan_enabled: alertsEnabled,
        magenta_enabled: alertsEnabled,
        yellow_enabled: alertsEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id" }
    );

    if (error) {
      throw error;
    }

    const { data: device } = await supabase
      .from("Gas_Gage")
      .select("serial_number")
      .eq("device_id", deviceId)
      .maybeSingle();

    revalidatePath("/devices");

    if (device?.serial_number) {
      const encodedSerial = encodeURIComponent(device.serial_number.trim());
      revalidatePath(`/devices/${encodedSerial}`);
      revalidatePath(`/devices/${encodedSerial}/settings`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Device alert settings error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update alert settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
