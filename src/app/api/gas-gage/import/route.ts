import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type CSVRow = {
  CenterID: string;
  DeviceID: string;
  Model: string;
  "Code Name": string;
  "Serial Number": string;
  ERPID: string;
  Protocol: string;
  Black: string;
  Cyan: string;
  Magenta: string;
  Yellow: string;
  "Special Color": string;
  "Special Color Gage": string;
  Customer: string;
  "Sales Office": string;
  "Service Office": string;
  "Latest Receive Date": string;
  "Device Host Name": string;
  "Device Location": string;
  "Toner Replacement Date (Black)": string;
  "Toner Replacement Date (Cyan)": string;
  "Toner Replacement Date (Magenta)": string;
  "Toner Replacement Date (Yellow)": string;
  "Toner Replacement Date (Special Color)": string;
};

type GasGageInsert = Database["public"]["Tables"]["Gas_Gage"]["Insert"];

function parseNumber(value: string | null | undefined): number | null {
  if (!value || value.trim() === "") {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function parseDate(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") {
    return null;
  }
  
  // Try to parse the date and convert to ISO format
  try {
    // Handle format like "2025.07.04 6:19:08"
    const dateStr = value.replace(/\./g, "-");
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // If parsing fails, return null
  }
  
  return null;
}

function transformCSVRowToGasGage(row: CSVRow): GasGageInsert {
  return {
    center_id: row.CenterID || "",
    device_id: row.DeviceID || "",
    serial_number: row["Serial Number"] || row.DeviceID || "",
    model: row.Model || null,
    code_name: row["Code Name"] || null,
    erp_id: row.ERPID || null,
    protocol: row.Protocol || null,
    black: parseNumber(row.Black),
    cyan: parseNumber(row.Cyan),
    magenta: parseNumber(row.Magenta),
    yellow: parseNumber(row.Yellow),
    special_color: parseNumber(row["Special Color"]),
    special_color_gage: row["Special Color Gage"] || null,
    customer: row.Customer || null,
    sales_office: row["Sales Office"] || null,
    service_office: row["Service Office"] || null,
    latest_receive_date: parseDate(row["Latest Receive Date"]),
    device_host_name: row["Device Host Name"] || null,
    device_location: row["Device Location"] || null,
    toner_replacement_date_black: parseDate(row["Toner Replacement Date (Black)"]),
    toner_replacement_date_cyan: parseDate(row["Toner Replacement Date (Cyan)"]),
    toner_replacement_date_magenta: parseDate(row["Toner Replacement Date (Magenta)"]),
    toner_replacement_date_yellow: parseDate(row["Toner Replacement Date (Yellow)"]),
    toner_replacement_date_special_color: parseDate(row["Toner Replacement Date (Special Color)"]),
    updated_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Invalid data format. Expected an array of CSV rows." },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();
    
    // Transform CSV data to database format
    const transformedData = data.map(transformCSVRowToGasGage);

    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      
      // Upsert the batch (update if exists, insert if not)
      const { error } = await supabase
        .from("Gas_Gage")
        .upsert(batch, {
          onConflict: "device_id",
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error("Batch upsert error:", error);
        errorCount += batch.length;
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        successCount += batch.length;
      }
    }

    return NextResponse.json({
      success: successCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import data" },
      { status: 500 }
    );
  }
}
