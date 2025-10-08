import { OrdersTable } from "@/components/orders/orders-table";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function OrdersPage() {
  const supabase = await getSupabaseServerClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `order_id, device_id, customer_name, order_type, status, created_at,
       device:devices!orders_device_id_fkey(customer_name, model)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load orders", error);
    throw new Error("Unable to load orders from Supabase");
  }

  return <OrdersTable initialOrders={orders ?? []} />;
}
