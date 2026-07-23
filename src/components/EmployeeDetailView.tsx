"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { FormatIcon } from "@/components/FormatIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  computeStatus,
  formatDate,
  formatMonthLabel,
  getCurrentYear,
  getInitials,
  hoursByMonth,
  monthlyAverage,
  sumHours,
  sumHoursForMonth,
} from "@/lib/utils";
import type { Profile, TrainingSession } from "@/types";

export function EmployeeDetailView() {
  const params = useParams<{ id: string }>();
  const { t, locale, formatLabel } = useLanguage();
  const supabase = createClient();
  const year = getCurrentYear();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [goal, setGoal] = useState(16);
  const [goalPeriod, setGoalPeriod] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [profileRes, sessionsRes, configRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", params.id).single(),
      supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", params.id)
        .order("session_date", { ascending: false }),
      supabase.from("system_config").select("*").eq("id", 1).single(),
    ]);

    setProfile(profileRes.data);
    setSessions(sessionsRes.data ?? []);
    setGoal(Number(configRes.data?.yearly_goal_hours ?? 16));
    if (configRes.data?.goal_period) {
      setGoalPeriod(configRes.data.goal_period);
    }
    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentMonthIndex = new Date().getMonth();
  const yearlyHours = sumHours(sessions, year);
  const loggedHours =
    goalPeriod === "monthly"
      ? sumHoursForMonth(sessions, year, currentMonthIndex)
      : yearlyHours;
  const status = computeStatus(loggedHours, goal);
  const monthlyData = useMemo(() => hoursByMonth(sessions, year), [sessions, year]);
  const maxMonthHours = Math.max(...monthlyData, 1);
  const currentMonth = currentMonthIndex;

  function statusLabel() {
    switch (status) {
      case "on_track":
        return t.admin.onTrack;
      case "below_target":
        return t.admin.belowTargetStatus;
      case "missing_data":
        return t.admin.missingDataStatus;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        {t.common.loading}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        {t.common.error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.admin.backToDashboard}
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600">
              {getInitials(profile.full_name)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile.full_name}</h1>
              <p className="text-sm text-slate-500">
                {profile.department ?? "—"}
                {profile.manager_name &&
                  ` · ${t.admin.manager}: ${profile.manager_name}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">
              {goalPeriod === "monthly" ? t.admin.thisMonth : t.admin.thisYear}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {loggedHours} / {goal} h
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{t.admin.yearToDate}</p>
            <p className="mt-1 text-2xl font-bold">{yearlyHours} h</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{t.admin.monthlyAverage}</p>
            <p className="mt-1 text-2xl font-bold">
              {monthlyAverage(yearlyHours, year)} h
            </p>
          </div>
          <div className="rounded-2xl border border-success-50 bg-success-50 p-4 shadow-sm">
            <p className="text-sm text-success-700">{t.admin.status}</p>
            <div className="mt-2">
              <StatusBadge status={status} label={statusLabel()} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">{t.admin.hoursPerMonth}</h2>
          <div className="flex h-40 items-end gap-2">
            {monthlyData.slice(0, currentMonth + 1).map((hours, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    index === currentMonth ? "bg-brand-500" : "bg-slate-200"
                  }`}
                  style={{ height: `${(hours / maxMonthHours) * 100}%`, minHeight: hours > 0 ? "8px" : "4px" }}
                  title={`${hours} h`}
                />
                <span className="text-xs text-slate-500">
                  {formatMonthLabel(index, locale)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">
            {t.admin.trainingsCompleted}
          </h2>
          <ul className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm"
              >
                <FormatIcon format={session.format} className="h-5 w-5 text-slate-500" />
                <span className="font-medium">{session.training_name}</span>
                <span className="text-slate-500">
                  {formatDate(session.session_date, locale)}
                </span>
                <span className="font-semibold">
                  {Number(session.duration_hours).toFixed(1)} h
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
