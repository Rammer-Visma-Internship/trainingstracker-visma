import { PlayCircle, ShieldCheck, Users, Video } from "lucide-react";
import type { TrainingFormat } from "@/types";

const iconMap = {
  online: Video,
  "in-person": Users,
  "self-paced": PlayCircle,
} as const;

export function FormatIcon({
  format,
  className = "h-5 w-5",
}: {
  format: TrainingFormat;
  className?: string;
}) {
  const Icon = iconMap[format] ?? ShieldCheck;
  return <Icon className={className} aria-hidden />;
}
