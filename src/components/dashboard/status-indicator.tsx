import type { HealthStatus } from "@/types/app-status";
import { cn } from "@/lib/utils";

const statusColors: Record<HealthStatus, string> = {
  online: "bg-emerald-500",
  degraded: "bg-amber-500",
  offline: "bg-red-500",
  unknown: "bg-gray-400",
};

const statusLabels: Record<HealthStatus, string> = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
  unknown: "Unknown",
};

export function StatusIndicator({ status }: { status: HealthStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex h-2.5 w-2.5">
        {status === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", statusColors[status])}
        />
      </div>
      <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
    </div>
  );
}
