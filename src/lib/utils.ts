import type { EmployeeStatus } from "@/types";

export const DEFAULT_YEARLY_GOAL = 16;

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getYearStart(year: number): string {
  return `${year}-01-01`;
}

export function getYearEnd(year: number): string {
  return `${year}-12-31`;
}

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

export function sumHours(
  sessions: { duration_hours: number; session_date: string }[],
  year?: number
): number {
  const targetYear = year ?? getCurrentYear();
  return sessions
    .filter((s) => parseLocalDate(s.session_date).getFullYear() === targetYear)
    .reduce((acc, s) => acc + Number(s.duration_hours), 0);
}

export function sumHoursForMonth(
  sessions: { duration_hours: number; session_date: string }[],
  year: number,
  monthIndex: number
): number {
  return sessions
    .filter((s) => {
      const d = parseLocalDate(s.session_date);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    })
    .reduce((acc, s) => acc + Number(s.duration_hours), 0);
}

export function computeStatus(
  yearlyHours: number,
  goal: number
): EmployeeStatus {
  if (yearlyHours === 0) return "missing_data";
  if (yearlyHours >= goal) return "on_track";
  return "below_target";
}

export function getProgressPercent(hours: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((hours / goal) * 100));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(dateStr: string, locale: string): string {
  return parseLocalDate(dateStr).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function formatMonthLabel(monthIndex: number, locale: string): string {
  const date = new Date(getCurrentYear(), monthIndex, 1);
  return date.toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB", {
    month: "short",
  });
}

export function hoursByMonth(
  sessions: { duration_hours: number; session_date: string }[],
  year: number
): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  sessions.forEach((s) => {
    const d = parseLocalDate(s.session_date);
    if (d.getFullYear() === year) {
      months[d.getMonth()] += Number(s.duration_hours);
    }
  });
  return months;
}

export function monthlyAverage(yearlyHours: number, year: number): number {
  const now = new Date();
  const monthsElapsed =
    year < now.getFullYear()
      ? 12
      : year > now.getFullYear()
        ? 0
        : now.getMonth() + 1;
  if (monthsElapsed === 0) return 0;
  return Math.round((yearlyHours / monthsElapsed) * 10) / 10;
}

export function sessionsToCsv(
  rows: {
    full_name: string;
    email: string;
    department: string | null;
    training_name: string;
    session_date: string;
    duration_hours: number;
    format: string;
    notes: string | null;
  }[]
): string {
  const header = [
    "Employee Name",
    "Email",
    "Department",
    "Training Name",
    "Date",
    "Duration (hours)",
    "Format",
    "Notes",
  ];

  const escape = (value: string | null | undefined) => {
    const str = value ?? "";
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = rows.map((row) =>
    [
      escape(row.full_name),
      escape(row.email),
      escape(row.department),
      escape(row.training_name),
      escape(row.session_date),
      String(row.duration_hours),
      escape(row.format),
      escape(row.notes),
    ].join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyGoogleDocsReport(
  summaries: {
    full_name: string;
    email: string;
    department: string | null;
    yearly_hours: number;
    status: EmployeeStatus;
  }[],
  goal: number,
  period: "monthly" | "yearly"
): Promise<void> {
  const periodLabel = period === "monthly" ? "Monthly" : "Yearly";
  const html = `
    <h1 style="font-family: Arial, sans-serif; color: #0f172a;">Training Hours Report (${periodLabel} Goal: ${goal} hrs)</h1>
    <p style="font-family: Arial, sans-serif; color: #475569;">Generated on ${new Date().toLocaleDateString()}</p>
    <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; margin-top: 16px;">
      <thead>
        <tr style="background-color: #f1f5f9; text-align: left;">
          <th style="padding: 10px; border: 1px solid #cbd5e1;">Employee</th>
          <th style="padding: 10px; border: 1px solid #cbd5e1;">Email</th>
          <th style="padding: 10px; border: 1px solid #cbd5e1;">Department</th>
          <th style="padding: 10px; border: 1px solid #cbd5e1;">Logged Hours</th>
          <th style="padding: 10px; border: 1px solid #cbd5e1;">Target Goal</th>
          <th style="padding: 10px; border: 1px solid #cbd5e1;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${summaries
          .map(
            (s) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${s.full_name}</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.email}</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.department ?? "—"}</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.yearly_hours} h</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${goal} h</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">
              <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; ${
                s.status === "on_track"
                  ? "background-color: #dcfce7; color: #166534;"
                  : s.status === "below_target"
                  ? "background-color: #fef9c3; color: #854d0e;"
                  : "background-color: #fee2e2; color: #991b1b;"
              }">${s.status.replace("_", " ").toUpperCase()}</span>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  if (navigator.clipboard && window.ClipboardItem) {
    const textBlob = new Blob([summaries.map((s) => `${s.full_name}\t${s.email}\t${s.yearly_hours}h\t${s.status}`).join("\n")], { type: "text/plain" });
    const htmlBlob = new Blob([html], { type: "text/html" });
    await navigator.clipboard.write([
      new window.ClipboardItem({
        "text/plain": textBlob,
        "text/html": htmlBlob,
      }),
    ]);
  } else {
    await navigator.clipboard.writeText(html);
  }
}

