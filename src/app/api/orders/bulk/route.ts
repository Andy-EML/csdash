import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  createSupplyOrder,
  type DeviceOrderPayload,
  type OrderScope,
} from "@/lib/orders/create-supply-order";

type BulkOrderRequest = {
  scope: OrderScope;
  devices: DeviceOrderPayload[];
  skipExisting?: boolean;
};

const scopeKey = (scope: OrderScope) => (scope === "waste" ? "waste" : scope);

const isOrderScope = (value: unknown): value is OrderScope =>
  value === "black" ||
  value === "cyan" ||
  value === "magenta" ||
  value === "yellow" ||
  value === "waste";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BulkOrderRequest;
    const { scope, devices, skipExisting = false } = body ?? {};

    if (!isOrderScope(scope)) {
      return NextResponse.json(
        { error: "Invalid scope. Must be one of black, cyan, magenta, yellow, or waste." },
        { status: 400 }
      );
    }

    if (!Array.isArray(devices) || devices.length === 0) {
      return NextResponse.json(
        { error: "devices must be a non-empty array." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const normalizedSerials = Array.from(
      new Set(
        devices
          .map((device) => device.serial_number?.trim())
          .filter((serial): serial is string => typeof serial === "string" && serial.length > 0)
      )
    );

    const existingOrders = new Map<string, Set<string>>();

    if (skipExisting && normalizedSerials.length > 0) {
      const existing = await supabase
        .from("orders")
        .select("device_id, toner_color, order_type")
        .eq("status", "open")
        .in("device_id", normalizedSerials);

      if (existing.error) {
        return NextResponse.json(
          { error: `Unable to fetch existing orders: ${existing.error.message}` },
          { status: 500 }
        );
      }

      for (const order of existing.data ?? []) {
        const key = order.device_id?.trim();
        if (!key) continue;
        const colors = existingOrders.get(key) ?? new Set<string>();
        if (order.toner_color) {
          colors.add(order.toner_color);
        } else if (order.order_type === "waste_toner") {
          colors.add("waste");
        } else {
          colors.add("waste");
        }
        existingOrders.set(key, colors);
      }
    }

    const seenSerials = new Set<string>();
    const created: string[] = [];
    const skippedExisting: string[] = [];
    const skippedInvalid: string[] = [];
    const skippedDuplicates: string[] = [];
    const errors: string[] = [];

    const targetScopeKey = scopeKey(scope);

    for (const device of devices) {
      const serial = device.serial_number?.trim();

      if (!serial) {
        skippedInvalid.push("missing-serial");
        continue;
      }

      if (seenSerials.has(serial)) {
        skippedDuplicates.push(serial);
        continue;
      }
      seenSerials.add(serial);

      if (skipExisting) {
        const existingScopes = existingOrders.get(serial);
        if (existingScopes?.has(targetScopeKey)) {
          skippedExisting.push(serial);
          continue;
        }
      }

      const result = await createSupplyOrder(supabase, scope, device);
      if (result.success) {
        created.push(serial);
        if (skipExisting) {
          const scopes = existingOrders.get(serial) ?? new Set<string>();
          scopes.add(targetScopeKey);
          existingOrders.set(serial, scopes);
        }
      } else {
        errors.push(`${serial}: ${result.message}`);
      }
    }

    const responsePayload = {
      created: created.length,
      skipped: skippedExisting.length + skippedInvalid.length + skippedDuplicates.length,
      skippedDueToExisting: skippedExisting.length,
      skippedDueToMissingSerial: skippedInvalid.length,
      skippedDueToDuplicates: skippedDuplicates.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    const status =
      created.length === 0 && errors.length > 0
        ? 422
        : errors.length > 0
          ? 207
          : 200;

    if (errors.length > 0) {
      console.warn("Bulk order creation encountered issues:", errors);
    }

    return NextResponse.json(responsePayload, { status });
  } catch (error) {
    console.error("Bulk order creation failed:", error);
    const message = error instanceof Error ? error.message : "Failed to create bulk orders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
