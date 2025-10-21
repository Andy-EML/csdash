import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type WarningAction = "none" | "mute" | "unmute";

type ThresholdPayload = Partial<Record<"black" | "cyan" | "magenta" | "yellow", number>>;

type BulkRequest = {
  deviceIds: string[];
  serialNumbers?: string[];
  thresholds?: ThresholdPayload;
  warningAction?: WarningAction;
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

    const supabase = await getSupabaseServerClient();
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
          serialToDeviceId.set(record.serial_number, record.device_id);
        }
      });
    }

    const resolvedRecords = deviceIds.map((rawId, index) => {
      const serial = serialNumbers[index] ?? "";
      const trimmedId = typeof rawId === "string" ? rawId.trim() : "";
      const lookupId = serial ? serialToDeviceId.get(serial) ?? "" : "";
      const resolvedId = lookupId || trimmedId;
      return {
        deviceId: resolvedId.length > 0 ? resolvedId : null,
        serialNumber: serial,
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

    if (body.thresholds && typeof body.thresholds === "object") {
      const raw = body.thresholds as ThresholdPayload;
      const thresholds = {
        black_threshold: sanitize(raw.black ?? 15),
        cyan_threshold: sanitize(raw.cyan ?? 15),
        magenta_threshold: sanitize(raw.magenta ?? 15),
        yellow_threshold: sanitize(raw.yellow ?? 15),
        special_color_threshold: sanitize(raw.black ?? 15),
        alerts_enabled: true,
        black_enabled: true,
        cyan_enabled: true,
        magenta_enabled: true,
        yellow_enabled: true,
      };

      if (thresholds.black_threshold === null) {
        thresholds.black_threshold = 15;
      }
      if (thresholds.cyan_threshold === null) {
        thresholds.cyan_threshold = 15;
      }
      if (thresholds.magenta_threshold === null) {
        thresholds.magenta_threshold = 15;
      }
      if (thresholds.yellow_threshold === null) {
        thresholds.yellow_threshold = 15;
      }
      if (thresholds.special_color_threshold === null) {
        thresholds.special_color_threshold = thresholds.black_threshold;
      }

      const upsertRows = validRecords.map((record) => ({
        device_id: record.deviceId as string,
        ...thresholds,
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

