"use client";

import { AlertCircle, CheckCircle2, Loader2, Plus, Trash, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getCurrentYear } from "@/lib/utils";
import type { TrainingFormat, TrainingSession } from "@/types";

interface LogSessionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionToEdit?: TrainingSession | null;
  period?: "monthly" | "yearly";
}

const FORMATS: TrainingFormat[] = ["online", "in-person", "self-paced"];

export function LogSessionModal({
  open,
  onClose,
  onSuccess,
  sessionToEdit,
  period = "yearly",
}: LogSessionModalProps) {
  const { t, format, formatLabel, locale } = useLanguage();
  const supabase = createClient();
  const year = getCurrentYear();
  const currentMonthName = new Date().toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB", { month: "long" });

  const [trainingName, setTrainingName] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [duration, setDuration] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<TrainingFormat | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (sessionToEdit) {
        setTrainingName(sessionToEdit.training_name);
        setSessionDate(sessionToEdit.session_date);
        setDuration(String(sessionToEdit.duration_hours));
        setSelectedFormat(sessionToEdit.format);
        setNotes(sessionToEdit.notes ?? "");
      } else {
        setTrainingName("");
        setSessionDate(new Date().toISOString().split("T")[0]);
        setDuration("");
        setSelectedFormat("");
        setNotes("");
      }
      setError(null);
    }
  }, [open, sessionToEdit]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!trainingName.trim()) {
      setError(t.employee.logForm.trainingRequired);
      return;
    }
    if (!selectedFormat) {
      setError(t.employee.logForm.formatRequired);
      return;
    }
    const hours = parseFloat(duration);
    if (!hours || hours <= 0) {
      setError(t.employee.logForm.durationRequired);
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(t.common.error);
      setLoading(false);
      return;
    }

    try {
      if (sessionToEdit) {
        const { error: updateError } = await supabase
          .from("training_sessions")
          .update({
            training_name: trainingName.trim(),
            session_date: sessionDate,
            duration_hours: hours,
            format: selectedFormat,
            notes: notes.trim() || null,
          })
          .eq("id", sessionToEdit.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("training_sessions").insert({
          user_id: user.id,
          training_name: trainingName.trim(),
          session_date: sessionDate,
          duration_hours: hours,
          format: selectedFormat,
          notes: notes.trim() || null,
        });

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch {
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!sessionToEdit) return;
    if (!confirm(t.employee.logForm.confirmDelete)) return;

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", sessionToEdit.id);

      if (deleteError) throw deleteError;

      onSuccess();
      onClose();
    } catch {
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-session-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            aria-label={t.common.close}
          >
            <X className="h-5 w-5" />
          </button>
          <h2 id="log-session-title" className="text-base font-semibold">
            {sessionToEdit ? t.employee.logForm.editTitle : t.employee.logForm.title}
          </h2>
          <div className="w-7" aria-hidden />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label htmlFor="training" className="mb-1.5 block text-sm font-medium">
              {t.employee.logForm.training}
            </label>
            <input
              id="training"
              type="text"
              value={trainingName}
              onChange={(e) => setTrainingName(e.target.value)}
              placeholder={t.employee.logForm.trainingPlaceholder}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="date" className="mb-1.5 block text-sm font-medium">
                {t.employee.logForm.date}
              </label>
              <input
                id="date"
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label htmlFor="duration" className="mb-1.5 block text-sm font-medium">
                {t.employee.logForm.duration}
              </label>
              <input
                id="duration"
                type="number"
                min="0.25"
                step="0.25"
                required
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="1.5"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t.employee.logForm.format}</legend>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormat(fmt)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition sm:text-sm ${
                    selectedFormat === fmt
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  aria-pressed={selectedFormat === fmt}
                >
                  {formatLabel(fmt)}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
              {t.employee.logForm.notes}
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.employee.logForm.notesPlaceholder}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {!sessionToEdit && (
            <div className="flex items-start gap-2 rounded-xl bg-success-50 px-3 py-2.5 text-sm text-success-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                {period === "monthly"
                  ? format(t.employee.logForm.successBannerMonthly, { month: currentMonthName })
                  : format(t.employee.logForm.successBanner, { year })}
              </span>
            </div>
          )}

          {error && (
            <p className="flex items-center gap-2 text-sm text-danger-700" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : !sessionToEdit ? (
                <Plus className="h-4 w-4" aria-hidden />
              ) : null}
              {loading
                ? t.employee.logForm.saving
                : sessionToEdit
                ? t.employee.logForm.saveChanges
                : t.employee.logForm.submit}
            </button>

            {sessionToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger-200 bg-white py-3 text-sm font-semibold text-danger-700 transition hover:bg-danger-50 disabled:opacity-60"
              >
                <Trash className="h-4 w-4" aria-hidden />
                {t.employee.logForm.delete}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
