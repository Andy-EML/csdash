import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  createSupplyOrder,
  type DeviceOrderPayload,
  type OrderScope,
  type CreateSupplyOrderOptions,
} from "@/lib/orders/create-supply-order";

type RequestBody = {
  scope: OrderScope;
  device: DeviceOrderPayload;
  orderedAt?: string | null;
  salesOrderNumber?: string | null;
  status?: CreateSupplyOrderOptions["status"];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { scope, device } = body ?? {};

    if (!scope || !device?.serial_number) {
      return NextResponse.json(
        { error: "Invalid payload. Scope and device serial number are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const result = await createSupplyOrder(supabase, scope, device, {
      orderedAt: body.orderedAt ?? null,
      salesOrderNumber: body.salesOrderNumber ?? null,
      status: body.status,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 422 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to create supply order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
