import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPrivateSlackDM } from "@/lib/slack/sendPrivateSlackDM";
import { getCurrentYear, getYearStart, sumHours } from "@/lib/utils";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const year = getCurrentYear();
  const yearStart = getYearStart(year);

  const { data: employees } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "employee");

  if (!employees?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("user_id, duration_hours, session_date")
    .gte("session_date", yearStart);

  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const employee of employees) {
    const employeeSessions =
      sessions?.filter((s) => s.user_id === employee.id) ?? [];
    const yearlyHours = sumHours(employeeSessions, year);

    if (yearlyHours > 0) continue;

    const message = `Hi ${employee.full_name}, friendly reminder: you haven't logged any training hours yet. Please update your training log when you have a moment.`;

    try {
      await sendPrivateSlackDM(employee.email, message);
      results.push({ email: employee.email, success: true });
    } catch (err) {
      results.push({
        email: employee.email,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    sent: results.filter((r) => r.success).length,
    results,
  });
}
