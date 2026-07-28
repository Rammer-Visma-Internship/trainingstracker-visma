import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Perform a simple read query on system_config to trigger database activity
    const { data, error } = await supabase
      .from("system_config")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Ping DB Error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Database pinged successfully to keep Supabase alive.",
      data,
    });
  } catch (err) {
    console.error("Ping Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
