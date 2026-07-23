"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Download,
  FileText,
  Save,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ProgressBar, StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  computeStatus,
  copyGoogleDocsReport,
  downloadCsv,
  getCurrentYear,
  getInitials,
  sessionsToCsv,
  sumHours,
  sumHoursForMonth,
} from "@/lib/utils";
import type { EmployeeSummary, Profile, TrainingSession } from "@/types";

export function AdminDashboard() {
  const { t } = useLanguage();
  const supabase = createClient();
  const year = getCurrentYear();
  const currentMonthIndex = new Date().getMonth();

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [goal, setGoal] = useState(16);
  const [goalInput, setGoalInput] = useState("16");
  const [goalPeriod, setGoalPeriod] = useState<"monthly" | "yearly">("yearly");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [goalMessage, setGoalMessage] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [docsMessage, setDocsMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [profilesRes, sessionsRes, configRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "employee").order("full_name"),
      supabase.from("training_sessions").select("*"),
      supabase.from("system_config").select("*").eq("id", 1).single(),
    ]);

    setEmployees(profilesRes.data ?? []);
    setSessions(sessionsRes.data ?? []);
    const currentGoal = Number(configRes.data?.yearly_goal_hours ?? 16);
    setGoal(currentGoal);
    setGoalInput(String(currentGoal));
    if (configRes.data?.goal_period) {
      setGoalPeriod(configRes.data.goal_period);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const departments = useMemo(() => {
    const set = new Set(
      employees.map((e) => e.department).filter(Boolean) as string[]
    );
    return Array.from(set).sort();
  }, [employees]);

  const summaries: EmployeeSummary[] = useMemo(() => {
    return employees
      .filter(
        (e) =>
          departmentFilter === "all" || e.department === departmentFilter
      )
      .map((employee) => {
        const userSessions = sessions.filter((s) => s.user_id === employee.id);
        const loggedHours =
          goalPeriod === "monthly"
            ? sumHoursForMonth(userSessions, year, currentMonthIndex)
            : sumHours(userSessions, year);
        return {
          id: employee.id,
          full_name: employee.full_name,
          email: employee.email,
          department: employee.department,
          manager_name: employee.manager_name,
          yearly_hours: loggedHours,
          status: computeStatus(loggedHours, goal),
        };
      });
  }, [employees, sessions, departmentFilter, goal, goalPeriod, year, currentMonthIndex]);

  const stats = useMemo(() => {
    const totalHours = summaries.reduce((acc, s) => acc + s.yearly_hours, 0);
    const avg =
      summaries.length > 0
        ? Math.round((totalHours / summaries.length) * 10) / 10
        : 0;
    const belowTarget = summaries.filter((s) => s.status === "below_target").length;
    const missingData = summaries.filter((s) => s.status === "missing_data").length;
    return { totalHours, avg, belowTarget, missingData };
  }, [summaries]);

  async function handleSaveGoal() {
    const parsed = parseFloat(goalInput);
    if (!parsed || parsed <= 0) return;

    setSavingGoal(true);
    setGoalMessage(null);

    const { error } = await supabase
      .from("system_config")
      .update({
        yearly_goal_hours: parsed,
        goal_period: goalPeriod,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    setSavingGoal(false);

    if (error) {
      setGoalMessage(t.common.error);
      return;
    }

    setGoal(parsed);
    setGoalMessage(t.admin.goalUpdated);
  }

  function handleExportCsv() {
    const rows = sessions
      .map((session) => {
        const employee = employees.find((e) => e.id === session.user_id);
        if (!employee) return null;
        if (
          departmentFilter !== "all" &&
          employee.department !== departmentFilter
        ) {
          return null;
        }
        return {
          full_name: employee.full_name,
          email: employee.email,
          department: employee.department,
          training_name: session.training_name,
          session_date: session.session_date,
          duration_hours: Number(session.duration_hours),
          format: session.format,
          notes: session.notes,
        };
      })
      .filter(Boolean) as Parameters<typeof sessionsToCsv>[0];

    const csv = sessionsToCsv(rows);
    downloadCsv(csv, `training-hours-${year}.csv`);
  }

  async function handleExportGoogleDocs() {
    try {
      await copyGoogleDocsReport(summaries, goal, goalPeriod);
      setDocsMessage(t.admin.googleDocsCopied);
      setTimeout(() => setDocsMessage(null), 5000);
    } catch {
      setDocsMessage(t.common.error);
    }
  }

  async function handleSendReminders() {
    setSendingReminders(true);
    setReminderMessage(null);
    try {
      const res = await fetch("/api/reminders", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setReminderMessage(`${t.admin.remindersSent} (${data.sent} sent)`);
      } else {
        setReminderMessage(data.error || t.common.error);
      }
    } catch {
      setReminderMessage(t.common.error);
    } finally {
      setSendingReminders(false);
      setTimeout(() => setReminderMessage(null), 5000);
    }
  }

  function statusLabel(status: EmployeeSummary["status"]) {
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

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title={t.admin.title} variant="admin" />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="goal-period" className="mb-1.5 block text-sm font-medium">
                {t.admin.goalPeriod}
              </label>
              <select
                id="goal-period"
                value={goalPeriod}
                onChange={(e) => setGoalPeriod(e.target.value as "monthly" | "yearly")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="yearly">{t.admin.thisYear}</option>
                <option value="monthly">{t.admin.thisMonth}</option>
              </select>
            </div>

            <div>
              <label htmlFor="goal" className="mb-1.5 block text-sm font-medium">
                {goalPeriod === "monthly" ? t.admin.monthlyGoalConfig : t.admin.yearlyGoalConfig}
              </label>
              <div className="flex gap-2">
                <input
                  id="goal"
                  type="number"
                  min="1"
                  step="0.5"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  disabled={savingGoal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden />
                  {savingGoal ? t.admin.savingGoal : t.admin.saveGoal}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              aria-label={t.admin.department}
            >
              <option value="all">{t.admin.allDepartments}</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSendReminders}
              disabled={sendingReminders}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-60"
            >
              <Bell className="h-4 w-4" aria-hidden />
              {sendingReminders ? t.admin.sendingReminders : t.admin.sendReminders}
            </button>
          </div>
        </section>

        {(goalMessage || reminderMessage || docsMessage) && (
          <div className="space-y-2">
            {goalMessage && (
              <p className="rounded-xl bg-success-50 px-4 py-2.5 text-sm text-success-700">
                {goalMessage}
              </p>
            )}
            {reminderMessage && (
              <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
                {reminderMessage}
              </p>
            )}
            {docsMessage && (
              <p className="rounded-xl bg-success-50 px-4 py-2.5 text-sm text-success-700">
                {docsMessage}
              </p>
            )}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t.admin.totalHours, value: `${stats.totalHours} h`, tone: "bg-white" },
            { label: t.admin.avgPerEmployee, value: `${stats.avg} h`, tone: "bg-white" },
            {
              label: t.admin.belowTarget,
              value: `${stats.belowTarget}`,
              tone: "bg-warning-50",
            },
            {
              label: t.admin.missingData,
              value: `${stats.missingData}`,
              tone: "bg-danger-50",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${card.tone}`}
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold">{t.admin.employeeList}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportGoogleDocs}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4 text-brand-600" aria-hidden />
                {t.admin.exportGoogleDocs}
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300"
              >
                <Download className="h-4 w-4" aria-hidden />
                {t.admin.exportCsv}
              </button>
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {summaries.map((employee) => {
              return (
                <li key={employee.id}>
                  <Link
                    href={`/admin/employee/${employee.id}`}
                    className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                        {getInitials(employee.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {employee.full_name}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {employee.department ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5 sm:max-w-xs">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>
                          {employee.yearly_hours} / {goal} h
                        </span>
                      </div>
                      <ProgressBar
                        value={employee.yearly_hours}
                        max={goal}
                        status={employee.status}
                      />
                    </div>

                    <div className="flex items-center gap-2 sm:justify-end">
                      <StatusBadge
                        status={employee.status}
                        label={statusLabel(employee.status)}
                      />
                      <ChevronRight className="hidden h-4 w-4 text-slate-400 sm:block" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}

