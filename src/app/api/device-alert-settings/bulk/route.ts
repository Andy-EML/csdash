import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type WarningAction = "none" | "mute" | "unmute";

type ThresholdPayload = Partial<Record<"black" | "cyan" | "magenta" | "yellow", number>>;

type BulkRequest = {
  deviceIds: string[];
  serialNumbers?: string[];
  thresholds?: ThresholdPayload;
  warningAction?: WarningAction;
  automationAction?: "leave" | "enable" | "disable";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BulkRequest;
    const deviceIds = Array.isArray(body.deviceIds)
      ? body.deviceIds.filter((value): value is string => typeof value === "string" && value.trim() !== "")
      : [];

    if (deviceIds.length === 0) {
      return NextResponse.json(
        { error: "deviceIds is required and must be a non-empty array." },
        { status: 400 }
      );
    }

    const serialNumbers =
      Array.isArray(body.serialNumbers) && body.serialNumbers.length === deviceIds.length
        ? body.serialNumbers
        : deviceIds;

    const supabase = getSupabaseServiceClient();
    const now = new Date().toISOString();

    const trimmedSerials = serialNumbers
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value): value is string => value.length > 0);

    const serialToDeviceId = new Map<string, string>();
    if (trimmedSerials.length > 0) {
      const { data: gasDevices } = await supabase
        .from("Gas_Gage")
        .select("serial_number, device_id")
        .in("serial_number", trimmedSerials);

      gasDevices?.forEach((record) => {
        if (record.serial_number && record.device_id) {
          serialToDeviceId.set(record.serial_number.trim(), record.device_id);
        }
      });
    }

    const resolvedRecords = deviceIds.map((rawId, index) => {
      const rawSerial = serialNumbers[index] ?? "";
      const trimmedSerial = typeof rawSerial === "string" ? rawSerial.trim() : "";
      const trimmedId = typeof rawId === "string" ? rawId.trim() : "";
      const lookupId = trimmedSerial ? serialToDeviceId.get(trimmedSerial) ?? "" : "";
      const resolvedId = lookupId || trimmedId;
      return {
        deviceId: resolvedId.length > 0 ? resolvedId : null,
        serialNumber: trimmedSerial,
      };
    });

    const validRecords = resolvedRecords.filter((record) => record.deviceId);
    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: "None of the selected devices have a valid device_id in Supabase." },
        { status: 400 }
      );
    }

    const skippedCount = resolvedRecords.length - validRecords.length;

    const sanitize = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value)
        ? Math.min(Math.max(Math.round(value), 0), 100)
        : 15;

    const automationAction =
      body.automationAction === "enable" || body.automationAction === "disable"
        ? body.automationAction
        : "leave";

    let thresholdsProvided = false;
    let thresholdTemplate: Record<string, number> | null = null;

    if (body.thresholds && typeof body.thresholds === "object") {
      thresholdsProvided = true;
      const raw = body.thresholds as ThresholdPayload;
      thresholdTemplate = {
        black_threshold: sanitize(raw.black ?? 15),
        cyan_threshold: sanitize(raw.cyan ?? 15),
        magenta_threshold: sanitize(raw.magenta ?? 15),
        yellow_threshold: sanitize(raw.yellow ?? 15),
        special_color_threshold: sanitize(raw.black ?? 15),
      };
    }

    if (thresholdsProvided || automationAction !== "leave") {
      const automationFields =
        automationAction === "enable"
          ? {
              alerts_enabled: true,
              black_enabled: true,
              cyan_enabled: true,
              magenta_enabled: true,
              yellow_enabled: true,
            }
          : automationAction === "disable"
            ? {
                alerts_enabled: false,
                black_enabled: false,
                cyan_enabled: false,
                magenta_enabled: false,
                yellow_enabled: false,
              }
            : {};

      const upsertRows = validRecords.map((record) => ({
        device_id: record.deviceId as string,
        ...(thresholdTemplate ?? {}),
        ...automationFields,
        updated_at: now,
      }));

      const { error: upsertError } = await supabase
        .from("device_alert_settings")
        .upsert(upsertRows, { onConflict: "device_id" });

      if (upsertError) {
        throw upsertError;
      }
    }

    if (body.warningAction && body.warningAction !== "none") {
      const scopedRecords = validRecords.map((record) => ({
        deviceId: record.deviceId as string,
        serialNumber: record.serialNumber,
      }));

      const warningRecords = scopedRecords.filter(
        (record) => record.serialNumber && record.serialNumber.trim() !== ""
      );

      if (warningRecords.length > 0) {
        const serialList = warningRecords.map((record) => record.serialNumber);

        const { error: deleteError } = await supabase
          .from("device_warning_overrides")
          .delete()
          .eq("scope", "all")
          .in("serial_number", serialList);

        if (deleteError) {
          throw deleteError;
        }

        if (body.warningAction === "mute") {
          const insertRows = warningRecords.map((record) => ({
            device_id: record.deviceId,
            serial_number: record.serialNumber,
            scope: "all" as const,
            dismissed_at: now,
            updated_at: now,
          }));

          const { error: insertError } = await supabase
            .from("device_warning_overrides")
            .insert(insertRows);

          if (insertError) {
            throw insertError;
          }
        }
      }
    }

    const serialsToRevalidate = new Set<string>();
    for (const record of validRecords) {
      if (record.serialNumber) {
        serialsToRevalidate.add(record.serialNumber);
      }
    }

    revalidatePath("/devices");
    for (const serial of serialsToRevalidate) {
      const trimmed = serial.trim();
      if (!trimmed) continue;
      const encodedSerial = encodeURIComponent(trimmed);
      revalidatePath(`/devices/${encodedSerial}`);
      revalidatePath(`/devices/${encodedSerial}/settings`);
    }

    return NextResponse.json({ success: true, skipped: skippedCount > 0 ? skippedCount : undefined });
  } catch (error) {
    console.error("Bulk alert settings error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update alert settings for selected devices.",
      },
      { status: 500 }
    );
  }
}



