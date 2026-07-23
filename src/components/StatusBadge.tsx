import type { EmployeeStatus } from "@/types";

const styles: Record<
  EmployeeStatus,
  { badge: string; bar: string; labelKey: "onTrack" | "belowTargetStatus" | "missingDataStatus" }
> = {
  on_track: {
    badge: "bg-success-50 text-success-700",
    bar: "bg-success-600",
    labelKey: "onTrack",
  },
  below_target: {
    badge: "bg-warning-50 text-warning-700",
    bar: "bg-warning-600",
    labelKey: "belowTargetStatus",
  },
  missing_data: {
    badge: "bg-danger-50 text-danger-700",
    bar: "bg-slate-300",
    labelKey: "missingDataStatus",
  },
};

interface StatusBadgeProps {
  status: EmployeeStatus;
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status].badge}`}
    >
      {label}
    </span>
  );
}

export function getStatusStyles(status: EmployeeStatus) {
  return styles[status];
}

export function ProgressBar({
  value,
  max,
  status,
}: {
  value: number;
  max: number;
  status: EmployeeStatus;
}) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-all ${styles[status].bar}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
