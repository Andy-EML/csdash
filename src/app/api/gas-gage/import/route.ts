import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DeviceImportRow,
  DeviceImportType,
  detectDeviceImportType,
  normalizeDeviceImportRows,
  validateHeadersForType,
} from "@/lib/csv/device-import";
import type { Database, Json } from "@/lib/database.types";
import {
  fetchCurrentTonerLevels,
  detectAndCompleteTonerReplacements,
} from "@/lib/order-auto-completion";

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;
type GasGageInsert = Database["public"]["Tables"]["Gas_Gage"]["Insert"];
type TonerSnapshotInsert =
  Database["public"]["Tables"]["device_toner_snapshots"]["Insert"];
type MeterInsert = Database["public"]["Tables"]["device_meter_readings"]["Insert"];
type WarningInsert = Database["public"]["Tables"]["device_warning_events"]["Insert"];
type ConsumableInsert =
  Database["public"]["Tables"]["device_consumable_events"]["Insert"];

const SUPPORTED_TYPES: DeviceImportType[] = [
  "gas_gage",
  "latest_total",
  "warning_history",
  "consumable_events",
];

const BATCH_SIZE = 100;
const MAX_ERROR_DETAILS = 25;

const isDeviceImportType = (value: unknown): value is DeviceImportType =>
  typeof value === "string" && SUPPORTED_TYPES.includes(value as DeviceImportType);

const cleanNumericString = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }
  return value.replace(/[%_,]/g, "").trim();
};

const parseNumeric = (value: string | null | undefined): number | null => {
  const cleaned = cleanNumericString(value || "");
  if (!cleaned) {
    return null;
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value: string | null | undefined): number | null => {
  const cleaned = cleanNumericString(value || "");
  if (!cleaned) {
    return null;
  }
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBooleanFlag = (value: string | null | undefined): boolean | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "1", "y"].includes(normalized)) {
    return true;
  }
  if (["no", "false", "0", "n"].includes(normalized)) {
    return false;
  }
  return null;
};

const padTimeComponent = (value: string | undefined): string =>
  value ? value.padStart(2, "0") : "00";

const normalizeTimestampString = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const isoLike = trimmed.match(
    /^(\d{4})[-.](\d{1,2})[-.](\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/
  );

  if (!isoLike) {
    return trimmed;
  }

  const [, year, month, day, hour, minute, second, fractional, timezone] = isoLike;
  const datePart = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const timePart = `${padTimeComponent(hour)}:${padTimeComponent(minute)}:${padTimeComponent(second)}`;
  const fractionalPart = fractional ? `.${fractional}` : "";

  let timezonePart = "Z";
  if (timezone && timezone !== "Z") {
    const normalizedOffset = timezone.includes(":")
      ? timezone
      : `${timezone.slice(0, 3)}:${timezone.slice(3)}`;
    timezonePart = normalizedOffset;
  } else if (timezone === "Z") {
    timezonePart = "Z";
  }

  return `${datePart}T${timePart}${fractionalPart}${timezonePart}`;
};

const parseTimestamp = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const normalized = normalizeTimestampString(value);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const nowIso = (): string => new Date().toISOString();

type ImportResult = {
  success: number;
  errors: number;
  errorDetails: string[];
};

const ensureJson = (row: DeviceImportRow): Json => row;

const importGasGage = async (
  supabase: SupabaseClient,
  rows: DeviceImportRow[]
): Promise<ImportResult & { ordersCompleted?: number }> => {
  const transformed: GasGageInsert[] = [];
  const snapshots: TonerSnapshotInsert[] = [];
  const errors: string[] = [];
  let skipped = 0;

  // Fetch current toner levels before import for auto-completion detection
  const deviceIdsToCheck = rows
    .map((row) => (row["DeviceID"] || "").trim())
    .filter((id) => Boolean(id));
  
  const oldTonerLevels = await fetchCurrentTonerLevels(supabase, deviceIdsToCheck);

  rows.forEach((row, index) => {
    const deviceId = (row["DeviceID"] || "").trim();
    const serial = (row["Serial Number"] || deviceId).trim();

    if (!deviceId && !serial) {
      skipped += 1;
      errors.push(`Row ${index + 1}: missing DeviceID and Serial Number.`);
      return;
    }

    const latestReceiveDate = parseTimestamp(row["Latest Receive Date"]);

    transformed.push({
      center_id: row["CenterID"] || "",
      device_id: deviceId || serial,
      serial_number: serial || deviceId || "",
      model: row["Model"] || null,
      code_name: row["Code Name"] || null,
      erp_id: row["ERPID"] || null,
      protocol: row["Protocol"] || null,
      black: parseNumeric(row["Black"]),
      cyan: parseNumeric(row["Cyan"]),
      magenta: parseNumeric(row["Magenta"]),
      yellow: parseNumeric(row["Yellow"]),
      special_color: parseNumeric(row["Special Color"]),
      special_color_gage: row["Special Color Gage"] || null,
      customer: row["Customer"] || null,
      sales_office: row["Sales Office"] || null,
      service_office: row["Service Office"] || null,
      latest_receive_date: latestReceiveDate,
      device_host_name: row["Device Host Name"] || null,
      device_location: row["Device Location"] || null,
      toner_replacement_date_black: parseTimestamp(row["Toner Replacement Date (Black)"]),
      toner_replacement_date_cyan: parseTimestamp(row["Toner Replacement Date (Cyan)"]),
      toner_replacement_date_magenta: parseTimestamp(
        row["Toner Replacement Date (Magenta)"]
      ),
      toner_replacement_date_yellow: parseTimestamp(
        row["Toner Replacement Date (Yellow)"]
      ),
      toner_replacement_date_special_color: parseTimestamp(
        row["Toner Replacement Date (Special Color)"]
      ),
      updated_at: nowIso(),
    });

    if (deviceId || serial) {
      const capturedAt = latestReceiveDate ?? nowIso();
      snapshots.push({
        device_id: deviceId || null,
        serial_number: serial || null,
        snapshot_source: "gas_gage",
        captured_at: capturedAt,
        black: parseNumeric(row["Black"]),
        cyan: parseNumeric(row["Cyan"]),
        magenta: parseNumeric(row["Magenta"]),
        yellow: parseNumeric(row["Yellow"]),
        special_color: parseNumeric(row["Special Color"]),
        waste_toner: parseNumeric(row["Waste Toner"]),
        raw: ensureJson(row),
      });
    }
  });

  let successCount = 0;
  let errorCount = skipped;

  for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
    const batch = transformed.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("Gas_Gage")
      .upsert(batch, {
        onConflict: "device_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      errorCount += batch.length;
      errors.push(`Gas Gage batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    } else {
      successCount += batch.length;
    }
  }

  // Detect toner replacements and auto-complete orders
  const tonerChanges = transformed
    .map((device) => {
      const oldLevels = oldTonerLevels.get(device.device_id || "");
      if (!oldLevels) {
        return null;
      }

      return {
        deviceId: device.device_id || "",
        serialNumber: device.serial_number || "",
        oldLevels,
        newLevels: {
          black: device.black ?? null,
          cyan: device.cyan ?? null,
          magenta: device.magenta ?? null,
          yellow: device.yellow ?? null,
        },
      };
    })
    .filter((change): change is NonNullable<typeof change> => change !== null);

  let ordersCompleted = 0;
  if (tonerChanges.length > 0) {
    try {
      const completionResult = await detectAndCompleteTonerReplacements(
        supabase,
        tonerChanges
      );
      ordersCompleted = completionResult.ordersCompleted;

      if (ordersCompleted > 0) {
        errors.push(
          `✓ Auto-completed ${ordersCompleted} order${ordersCompleted > 1 ? "s" : ""} (toner replacement detected)`
        );
      }
    } catch (autoCompleteError) {
      errors.push(
        `Auto-completion check failed: ${autoCompleteError instanceof Error ? autoCompleteError.message : "Unknown error"}`
      );
    }
  }

  const uniqueSnapshots = Array.from(
    new Map(
      snapshots
        .filter((snapshot) => snapshot.captured_at)
        .map((snapshot) => [
          `${snapshot.device_id || ""}|${snapshot.serial_number || ""}|${snapshot.captured_at}`,
          snapshot,
        ])
    ).values()
  );

  if (uniqueSnapshots.length > 0) {
    const snapshotDeviceIds = Array.from(
      new Set(
        uniqueSnapshots
          .map((snapshot) => snapshot.device_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const validSnapshotDeviceIds = new Set<string>();

    if (snapshotDeviceIds.length > 0) {
      for (let i = 0; i < snapshotDeviceIds.length; i += 1000) {
        const chunk = snapshotDeviceIds.slice(i, i + 1000);
        const { data: gasRows, error: gasError } = await supabase
          .from("Gas_Gage")
          .select("device_id")
          .in("device_id", chunk);

        if (gasError) {
          errors.push(
            `Failed to confirm Gas_Gage rows for toner snapshots: ${gasError.message}`
          );
        } else {
          gasRows?.forEach(
            (row) => row.device_id && validSnapshotDeviceIds.add(row.device_id)
          );
        }
      }
    }

    const sanitizedSnapshots = uniqueSnapshots.map((snapshot) =>
      snapshot.device_id && !validSnapshotDeviceIds.has(snapshot.device_id)
        ? { ...snapshot, device_id: null }
        : snapshot
    );

    const skippedSnapshotDevices = snapshotDeviceIds.filter(
      (id) => !validSnapshotDeviceIds.has(id)
    );
    if (skippedSnapshotDevices.length > 0) {
      errors.push(
        `Toner snapshots missing registry rows for device_id(s): ${skippedSnapshotDevices
          .slice(0, 10)
          .join(", ")}${skippedSnapshotDevices.length > 10 ? "…" : ""}`
      );
    }

    if (sanitizedSnapshots.length > 0) {
      const { error } = await supabase
        .from("device_toner_snapshots")
        .upsert(sanitizedSnapshots, {
          onConflict: "device_id,snapshot_source,captured_at",
          ignoreDuplicates: false,
        });
      if (error) {
        errors.push(`Toner snapshot insert failed: ${error.message}`);
      }
    }
  }

  return {
    success: successCount,
    errors: errorCount,
    errorDetails: errors.slice(0, MAX_ERROR_DETAILS),
  };
};

const importLatestTotal = async (
  supabase: SupabaseClient,
  rows: DeviceImportRow[]
): Promise<ImportResult> => {
  const transformed: MeterInsert[] = [];
  const deviceSeeds = new Map<
    string,
    {
      device_id: string;
      serial_number: string | null;
      center_id: string | null;
      model: string | null;
      code_name: string | null;
      customer: string | null;
      sales_office: string | null;
      service_office: string | null;
      device_host_name: string | null;
      latest_receive_date: string | null;
    }
  >();
  const candidateDeviceIds = new Set<string>();
  const errors: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const deviceId = (row["DeviceID"] || "").trim();
    const capturedAt = parseTimestamp(row["Server received date"]);

    if (!deviceId || !capturedAt) {
      skipped += 1;
      errors.push(
        `Row ${index + 1}: missing ${!deviceId ? "DeviceID" : "Server received date"} for meter reading.`
      );
      return;
    }

    transformed.push({
      device_id: deviceId,
      serial_number: (row["Serial Number"] || row["DeviceID"] || "").trim() || null,
      captured_at: capturedAt,
      total: parseInteger(row["Total"]),
      printer_total: parseInteger(row["Printer:Total"]),
      copy_total: parseInteger(row["Copy:Total"]),
      scan_total: parseInteger(row["Scanner/FAX:Scan"] || row["Scanner/FAX:Print"]),
      duplex_total: parseInteger(row["Duplex:Total"]),
      black_total: parseInteger(row["Black:Total"]),
      color_total: parseInteger(row["Full Color:Total"]),
      meter_a: parseInteger(row["Meter A"]),
      meter_b: parseInteger(row["Meter B"]),
      meter_c: parseInteger(row["Meter C"]),
      raw: ensureJson(row),
    });

    if (deviceId) {
      candidateDeviceIds.add(deviceId);
      if (!deviceSeeds.has(deviceId)) {
        deviceSeeds.set(deviceId, {
          device_id: deviceId,
          serial_number: (row["Serial Number"] || row["DeviceID"] || "").trim() || null,
          center_id: row["CenterID"]?.trim() || null,
          model: row["Model"]?.trim() || null,
          code_name: row["Code Name"]?.trim() || null,
          customer: row["Customer"]?.trim() || row["Customer Name"]?.trim() || null,
          sales_office: row["Sales Office"]?.trim() || null,
          service_office: row["Service Office"]?.trim() || null,
          device_host_name: row["Device Host Name"]?.trim() || null,
          latest_receive_date: parseTimestamp(row["Server received date"]),
        });
      }
    }
  });

  let validDeviceIds = new Set<string>();
  const deviceIdList = Array.from(candidateDeviceIds);

  if (deviceIdList.length > 0) {
    const lookupChunks: string[][] = [];
    for (let i = 0; i < deviceIdList.length; i += 1000) {
      lookupChunks.push(deviceIdList.slice(i, i + 1000));
    }

    const foundIds = new Set<string>();

    for (const chunk of lookupChunks) {
      const { data: gasData, error: gasError } = await supabase
        .from("Gas_Gage")
        .select("device_id")
        .in("device_id", chunk);

      if (gasError) {
        errors.push(`Device lookup failed (Gas_Gage): ${gasError.message}`);
      } else {
        gasData?.forEach((item) => item.device_id && foundIds.add(item.device_id));
      }
    }

    validDeviceIds = foundIds;

    const missingIds = deviceIdList.filter((id) => !validDeviceIds.has(id));

    if (missingIds.length > 0) {
      const seeds = missingIds
        .map((id) => deviceSeeds.get(id))
        .filter((seed): seed is NonNullable<typeof seed> => Boolean(seed))
        .map((seed) => ({
          center_id: seed.center_id ?? "",
          device_id: seed.device_id,
          serial_number: seed.serial_number ?? seed.device_id,
          model: seed.model,
          code_name: seed.code_name,
          customer: seed.customer,
          sales_office: seed.sales_office,
          service_office: seed.service_office,
          device_host_name: seed.device_host_name,
          latest_receive_date: seed.latest_receive_date,
          updated_at: nowIso(),
        }));

      if (seeds.length > 0) {
        const { error: gasSeedError } = await supabase
          .from("Gas_Gage")
          .upsert(seeds, { onConflict: "device_id", ignoreDuplicates: false })
          .select();

        if (gasSeedError) {
          const deviceSeedRows = seeds.map((seed) => ({
            device_id: seed.device_id,
            serial_number: seed.serial_number ?? seed.device_id,
            center_id: seed.center_id,
            model: seed.model,
            code_name: seed.code_name,
            customer_name: seed.customer,
            service_office: seed.service_office,
            device_host_name: seed.device_host_name,
            updated_at: seed.updated_at,
          }));

          const { error: deviceSeedError } = await supabase
            .from("devices")
            .upsert(deviceSeedRows, { onConflict: "device_id", ignoreDuplicates: false })
            .select();

          if (deviceSeedError) {
            errors.push(
              `Failed to seed devices for meter readings: Gas_Gage -> ${gasSeedError.message}; devices -> ${deviceSeedError.message}`
            );
          } else {
            deviceSeedRows.forEach((row) => validDeviceIds.add(row.device_id));
          }
        }
      }

      const recheckIds = missingIds.filter((id) => !validDeviceIds.has(id));
      if (recheckIds.length > 0) {
        const { data: recheckData, error: recheckError } = await supabase
          .from("Gas_Gage")
          .select("device_id")
          .in("device_id", recheckIds);

        if (recheckError) {
          errors.push(`Failed to verify Gas_Gage seeds: ${recheckError.message}`);
        } else {
          recheckData?.forEach(
            (row) => row.device_id && validDeviceIds.add(row.device_id)
          );
        }

        const unresolved = recheckIds.filter((id) => !validDeviceIds.has(id));
        if (unresolved.length > 0) {
          errors.push(
            `Skipped device_id linkage for meter readings because Gas_Gage row missing: ${unresolved
              .slice(0, 10)
              .join(", ")}${unresolved.length > 10 ? "…" : ""}`
          );
        }
      }
    }
  }

  const sanitized = transformed.map((reading) => ({
    ...reading,
    device_id:
      reading.device_id && validDeviceIds.has(reading.device_id)
        ? reading.device_id
        : null,
    serial_number: reading.serial_number || reading.device_id || null,
  }));

  let successCount = 0;
  let errorCount = skipped;

  for (let i = 0; i < sanitized.length; i += BATCH_SIZE) {
    const batch = sanitized.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("device_meter_readings")
      .upsert(batch, {
        onConflict: "device_id,captured_at",
        ignoreDuplicates: false,
      });

    if (error) {
      errorCount += batch.length;
      errors.push(`Meter readings batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    } else {
      successCount += batch.length;
    }
  }

  return {
    success: successCount,
    errors: errorCount,
    errorDetails: errors.slice(0, MAX_ERROR_DETAILS),
  };
};

const importWarningHistory = async (
  supabase: SupabaseClient,
  rows: DeviceImportRow[]
): Promise<ImportResult> => {
  const transformed: WarningInsert[] = [];
  const errors: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const deviceId = (row["DeviceID"] || "").trim();
    const serial = (row["Serial Number"] || "").trim();
    const receivedAt =
      parseTimestamp(row["Server received date"]) ??
      parseTimestamp(row["Alert Registration Date"]) ??
      parseTimestamp(row["Occurred device Date"]);

    if (!deviceId && !serial) {
      skipped += 1;
      errors.push(
        `Row ${index + 1}: missing DeviceID and Serial Number for warning record.`
      );
      return;
    }

    if (!receivedAt) {
      skipped += 1;
      errors.push(`Row ${index + 1}: missing Server received date for warning record.`);
      return;
    }

    transformed.push({
      device_id: deviceId || null,
      serial_number: serial || deviceId || null,
      alert_code: row["Code"] || null,
      message: row["Warning Contents"] || null,
      warning_type: row["Code Name"] || null,
      received_at_server: receivedAt,
      occurred_at_device: parseTimestamp(row["Occurred device Date"]),
      recovered_at_server: parseTimestamp(row["Recovered server Date"]),
      recovered_at_device: parseTimestamp(row["Recovered device Date"]),
      recovered: parseBooleanFlag(row["Recovered"]),
      raw: ensureJson(row),
    });
  });

  const uniqueEntries = Array.from(
    new Map(
      transformed.map((row) => [
        `${row.device_id || ""}|${row.serial_number || ""}|${row.alert_code || ""}|${row.received_at_server || ""}`,
        row,
      ])
    ).values()
  );

  const warningDeviceIds = Array.from(
    new Set(
      uniqueEntries.map((row) => row.device_id).filter((id): id is string => Boolean(id))
    )
  );

  if (warningDeviceIds.length > 0) {
    const validWarningIds = new Set<string>();
    for (let i = 0; i < warningDeviceIds.length; i += 1000) {
      const chunk = warningDeviceIds.slice(i, i + 1000);
      const { data: gasRows, error: gasError } = await supabase
        .from("Gas_Gage")
        .select("device_id")
        .in("device_id", chunk);

      if (gasError) {
        errors.push(
          `Failed to confirm Gas_Gage rows for warning history: ${gasError.message}`
        );
      } else {
        gasRows?.forEach((row) => row.device_id && validWarningIds.add(row.device_id));
      }
    }

    const unresolved = warningDeviceIds.filter((id) => !validWarningIds.has(id));
    if (unresolved.length > 0) {
      errors.push(
        `Warning history missing registry rows for device_id(s): ${unresolved
          .slice(0, 10)
          .join(", ")}${unresolved.length > 10 ? "…" : ""}`
      );
    }

    uniqueEntries.forEach((entry) => {
      if (entry.device_id && !validWarningIds.has(entry.device_id)) {
        entry.device_id = null;
      }
    });
  }

  let successCount = 0;
  let errorCount = skipped;

  if (uniqueEntries.length > 0) {
    const { error } = await supabase.from("device_warning_events").insert(uniqueEntries);
    if (error) {
      errorCount += uniqueEntries.length;
      errors.push(`Warning history insert failed: ${error.message}`);
    } else {
      successCount += uniqueEntries.length;
    }
  }

  return {
    success: successCount,
    errors: errorCount,
    errorDetails: errors.slice(0, MAX_ERROR_DETAILS),
  };
};

const importConsumableEvents = async (
  supabase: SupabaseClient,
  rows: DeviceImportRow[]
): Promise<ImportResult> => {
  const baseTimestamp = Date.UTC(2000, 0, 1);
  const transformed: ConsumableInsert[] = [];
  const errors: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const deviceId = (row["DeviceID"] || "").trim();
    const serial = (row["Serial Number"] || "").trim();

    if (!deviceId && !serial) {
      skipped += 1;
      errors.push(
        `Row ${index + 1}: missing DeviceID and Serial Number for consumable event.`
      );
      return;
    }

    const tcValue = parseInteger(row["TC"]);
    const capturedAt =
      parseTimestamp(row["Captured At"]) ??
      parseTimestamp(row["Server received date"]) ??
      parseTimestamp(row["Latest Receive Date"]) ??
      (tcValue !== null
        ? new Date(baseTimestamp + tcValue * 1000).toISOString()
        : nowIso());

    transformed.push({
      device_id: deviceId || null,
      serial_number: serial || deviceId || null,
      event_type: row["Type"] || null,
      warning_code: row["Warning Code"] || null,
      description: row["Description"] || null,
      status: row["Status"] || null,
      tc: tcValue,
      captured_at: capturedAt,
      raw: ensureJson(row),
    });
  });

  const uniqueEntries = Array.from(
    new Map(
      transformed.map((row) => [
        `${row.device_id || ""}|${row.serial_number || ""}|${row.event_type || ""}|${row.warning_code || ""}|${
          row.tc ?? ""
        }|${row.status || ""}`,
        row,
      ])
    ).values()
  );

  let successCount = 0;
  let errorCount = skipped;

  if (uniqueEntries.length > 0) {
    const { error } = await supabase
      .from("device_consumable_events")
      .insert(uniqueEntries);
    if (error) {
      errorCount += uniqueEntries.length;
      errors.push(`Consumable events insert failed: ${error.message}`);
    } else {
      successCount += uniqueEntries.length;
    }
  }

  return {
    success: successCount,
    errors: errorCount,
    errorDetails: errors.slice(0, MAX_ERROR_DETAILS),
  };
};

const recordImportJob = async (
  supabase: SupabaseClient,
  params: {
    type: DeviceImportType;
    fileName?: string;
    totalRows: number;
    success: number;
    errors: number;
    details: string[];
  }
) => {
  try {
    const { error } = await supabase.from("import_jobs").insert({
      source_file: params.fileName ?? null,
      source_type: params.type,
      row_count: params.totalRows,
      status: params.errors > 0 ? "partial" : "succeeded",
      details:
        params.details.length > 0
          ? { errors: params.details.slice(0, MAX_ERROR_DETAILS) }
          : null,
    });

    if (error) {
      console.warn("Failed to record import job:", error.message);
    }
  } catch (error) {
    console.warn("Unexpected error recording import job:", error);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, type, headers, fileName } = body ?? {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid data format. Expected an array of CSV rows." },
        { status: 400 }
      );
    }

    const headerList: string[] = Array.isArray(headers)
      ? headers
      : Object.keys((rows[0] as Record<string, unknown>) ?? {});

    let resolvedType: DeviceImportType | null = null;

    if (isDeviceImportType(type)) {
      resolvedType = type;
      if (!validateHeadersForType(type, headerList)) {
        const detected = detectDeviceImportType(headerList);
        if (detected && detected !== type) {
          resolvedType = detected;
        } else if (!detected) {
          return NextResponse.json(
            { error: `CSV headers do not satisfy the ${type} format.` },
            { status: 400 }
          );
        }
      }
    } else {
      resolvedType = detectDeviceImportType(headerList);
      if (!resolvedType) {
        return NextResponse.json(
          {
            error:
              "CSV header does not match any supported format (Gas Gage, LatestTotal, WarningHistory, Yields/Consumables).",
          },
          { status: 400 }
        );
      }
    }

    const normalizedRows = normalizeDeviceImportRows(
      resolvedType,
      rows.map((row) =>
        row && typeof row === "object" ? (row as Record<string, unknown>) : {}
      )
    );

    if (normalizedRows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in uploaded data." },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    let result: ImportResult;
    switch (resolvedType) {
      case "gas_gage":
        result = await importGasGage(supabase, normalizedRows);
        break;
      case "latest_total":
        result = await importLatestTotal(supabase, normalizedRows);
        break;
      case "warning_history":
        result = await importWarningHistory(supabase, normalizedRows);
        break;
      case "consumable_events":
        result = await importConsumableEvents(supabase, normalizedRows);
        break;
      default:
        return NextResponse.json({ error: "Unsupported import type." }, { status: 400 });
    }

    await recordImportJob(supabase, {
      type: resolvedType,
      fileName,
      totalRows: normalizedRows.length,
      success: result.success,
      errors: result.errors,
      details: result.errorDetails,
    });

    return NextResponse.json({
      success: result.success,
      errors: result.errors,
      errorDetails: result.errorDetails.length > 0 ? result.errorDetails : undefined,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import data" },
      { status: 500 }
    );
  }
}
