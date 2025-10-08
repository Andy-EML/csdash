import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      device_id,
      black_threshold,
      cyan_threshold,
      magenta_threshold,
      yellow_threshold,
      special_color_threshold,
    } = body;

    // Validate required fields
    if (!device_id) {
      return NextResponse.json(
        { error: "device_id is required" },
        { status: 400 }
      );
    }

    // Validate thresholds are numbers between 0 and 100
    const thresholds = {
      black_threshold,
      cyan_threshold,
      magenta_threshold,
      yellow_threshold,
    };

    for (const [key, value] of Object.entries(thresholds)) {
      if (typeof value !== "number" || value < 0 || value > 100) {
        return NextResponse.json(
          { error: `${key} must be a number between 0 and 100` },
          { status: 400 }
        );
      }
    }

    const supabase = await getSupabaseServerClient();

    // Upsert the settings (update if exists, insert if not)
    const { data, error } = await supabase
      .from("device_alert_settings")
      .upsert(
        {
          device_id,
          black_threshold,
          cyan_threshold,
          magenta_threshold,
          yellow_threshold,
          special_color_threshold: special_color_threshold ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "device_id",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving alert settings:", error);
      return NextResponse.json(
        { error: "Failed to save alert settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Alert settings API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("device_id");

    if (!deviceId) {
      return NextResponse.json(
        { error: "device_id parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("device_alert_settings")
      .select("*")
      .eq("device_id", deviceId)
      .single();

    if (error) {
      // If no settings found, return default values
      if (error.code === "PGRST116") {
        return NextResponse.json({
          device_id: deviceId,
          black_threshold: 15,
          cyan_threshold: 15,
          magenta_threshold: 15,
          yellow_threshold: 15,
          special_color_threshold: 15,
        });
      }

      console.error("Error fetching alert settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch alert settings" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Alert settings API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
