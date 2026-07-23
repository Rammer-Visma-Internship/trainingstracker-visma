"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, Pencil, Plus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { FormatIcon } from "@/components/FormatIcon";
import { LogSessionModal } from "@/components/LogSessionModal";
import { ProgressBar } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  computeStatus,
  formatDate,
  getCurrentYear,
  sumHours,
  sumHoursForMonth,
} from "@/lib/utils";
import type { SystemConfig, TrainingSession } from "@/types";

export function EmployeeDashboard() {
  const { t, locale, formatLabel } = useLanguage();
  const supabase = createClient();
  const year = getCurrentYear();
  const currentMonthIndex = new Date().getMonth();

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [goal, setGoal] = useState(16);
  const [goalPeriod, setGoalPeriod] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<TrainingSession | null>(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [sessionsRes, configRes] = await Promise.all([
      supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false }),
      supabase.from("system_config").select("*").eq("id", 1).single(),
    ]);

    setSessions(sessionsRes.data ?? []);
    setGoal(Number(configRes.data?.yearly_goal_hours ?? 16));
    if (configRes.data?.goal_period) {
      setGoalPeriod(configRes.data.goal_period);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("system_config_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "system_config" },
        (payload) => {
          const next = payload.new as SystemConfig;
          setGoal(Number(next.yearly_goal_hours));
          if (next.goal_period) {
            setGoalPeriod(next.goal_period);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  const loggedHours =
    goalPeriod === "monthly"
      ? sumHoursForMonth(sessions, year, currentMonthIndex)
      : sumHours(sessions, year);

  const status = computeStatus(loggedHours, goal);
  const showZeroAlert = loggedHours === 0;

  function handleOpenCreate() {
    setSessionToEdit(null);
    setModalOpen(true);
  }

  function handleOpenEdit(session: TrainingSession) {
    setSessionToEdit(session);
    setModalOpen(true);
  }

  function handleScrollToHistory() {
    const el = document.getElementById("recent-sessions-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/50 to-slate-50">
      <AppHeader title={t.employee.title} variant="employee" />

      <main className="mx-auto max-w-lg space-y-5 px-4 py-6 sm:px-6">
        {showZeroAlert && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-warning-600/20 bg-warning-50 px-4 py-3 text-sm text-warning-700"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              {goalPeriod === "monthly"
                ? t.employee.zeroHoursAlertMonthly
                : t.employee.zeroHoursAlert}
            </p>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            {goalPeriod === "monthly"
              ? t.employee.hoursThisMonth
              : t.employee.hoursThisYear}
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight">
            {loggedHours} / {goal}{" "}
            <span className="text-lg font-medium text-slate-500">
              {t.common.hrs}{" "}
              {goalPeriod === "monthly"
                ? t.employee.monthlyGoal
                : t.employee.yearlyGoal}
            </span>
          </p>
          <div className="mt-4">
            <ProgressBar value={loggedHours} max={goal} status={status} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-100 px-4 py-3.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-500 hover:text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t.employee.logSession}
          </button>
          <button
            type="button"
            onClick={handleScrollToHistory}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            aria-label={t.employee.history}
          >
            <Clock className="h-4 w-4" aria-hidden />
            {t.employee.history}
          </button>
        </div>

        <section id="recent-sessions-section">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {t.employee.recentSessions}
          </h2>
          {sessions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              {t.employee.noSessions}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {sessions.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(session)}
                    className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <FormatIcon format={session.format} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 group-hover:text-brand-600">
                        {session.training_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatLabel(session.format)} •{" "}
                        {formatDate(session.session_date, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm font-semibold text-slate-700">
                        {Number(session.duration_hours).toFixed(1)} {t.common.hours}
                      </span>
                      <Pencil className="h-4 w-4 text-slate-400 opacity-0 transition group-hover:opacity-100" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <LogSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
        sessionToEdit={sessionToEdit}
        period={goalPeriod}
      />
    </div>
  );
}

