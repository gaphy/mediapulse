"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusIndicator } from "./status-indicator";
import { MetricRow } from "./metric-row";
import { formatBytes, formatSpeed, formatRelativeTime } from "@/lib/format";
import { APP_LABELS } from "@/types/app-config";
import type { AppType } from "@/types/app-config";
import type { AppStatus } from "@/types/app-status";
import {
  Tv,
  Film,
  Search,
  Subtitles,
  MonitorPlay,
  Image,
  Bell,
  Youtube,
  Download,
  Server,
  ExternalLink,
  AlertTriangle,
  CircleAlert,
} from "lucide-react";

const appIcons: Record<AppType, React.ComponentType<{ className?: string }>> = {
  sonarr: Tv,
  radarr: Film,
  prowlarr: Search,
  bazarr: Subtitles,
  plex: MonitorPlay,
  jellyfin: Server,
  immich: Image,
  overseerr: Bell,
  pinchflat: Youtube,
  qbittorrent: Download,
};

interface MetricDef {
  key: string;
  label: string;
  format?: "bytes" | "speed" | "number" | "ms";
}

const metricDefs: Record<AppType, MetricDef[]> = {
  sonarr: [
    { key: "seriesCount", label: "Shows" },
    { key: "queueSize", label: "Queue" },
    { key: "missingEpisodes", label: "Missing Episodes" },
    { key: "sizeOnDisk", label: "Size on Disk", format: "bytes" },
  ],
  radarr: [
    { key: "movieCount", label: "Movies" },
    { key: "queueSize", label: "Queue" },
    { key: "missingMovies", label: "Missing Movies" },
    { key: "sizeOnDisk", label: "Size on Disk", format: "bytes" },
  ],
  prowlarr: [
    { key: "indexerCount", label: "Indexers" },
    { key: "failedIndexers", label: "Failed" },
  ],
  bazarr: [
    { key: "missingSeriesSubs", label: "Missing (TV)" },
    { key: "missingMovieSubs", label: "Missing (Movies)" },
  ],
  plex: [
    { key: "libraryCount", label: "Libraries" },
    { key: "activeStreams", label: "Streams" },
  ],
  jellyfin: [
    { key: "libraryCount", label: "Libraries" },
    { key: "activeSessions", label: "Active Sessions" },
    { key: "updateAvailable", label: "Update Available" },
  ],
  immich: [
    { key: "photoCount", label: "Photos" },
    { key: "videoCount", label: "Videos" },
    { key: "storageUsed", label: "Used", format: "bytes" },
  ],
  overseerr: [
    { key: "pendingRequests", label: "Pending Requests" },
    { key: "requestedMedia", label: "Requested" },
    { key: "availableMedia", label: "Available" },
    { key: "partialMedia", label: "Partially Available" },
  ],
  pinchflat: [
    { key: "responseTimeMs", label: "Response", format: "ms" },
  ],
  qbittorrent: [
    { key: "downloadSpeed", label: "Down", format: "speed" },
    { key: "uploadSpeed", label: "Up", format: "speed" },
    { key: "activeDownloads", label: "Active" },
  ],
};

function formatMetricValue(
  value: string | number,
  format?: MetricDef["format"]
): string {
  if (typeof value === "string") return value;
  switch (format) {
    case "bytes":
      return formatBytes(value);
    case "speed":
      return formatSpeed(value);
    case "ms":
      return `${value}ms`;
    default:
      return value.toLocaleString();
  }
}

export function AppCard({ status }: { status: AppStatus }) {
  const Icon = appIcons[status.appType];
  const defs = metricDefs[status.appType];
  const hasWarnings = status.warnings && status.warnings.length > 0;
  const hasErrors = status.errors && status.errors.length > 0;
  const hasMessages = hasWarnings || hasErrors;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <a
          href={status.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 group min-w-0"
        >
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <CardTitle className="text-sm font-medium truncate group-hover:underline">
            {status.name}
          </CardTitle>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </a>
        <StatusIndicator status={status.health} />
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">
            {APP_LABELS[status.appType]}
          </Badge>
          {status.version && (
            <Badge variant="outline" className="text-xs">
              v{status.version}
            </Badge>
          )}
        </div>
        <div className="space-y-0.5">
          {defs.map((def) => {
            const value = status.metrics[def.key];
            if (value === undefined) return null;
            return (
              <MetricRow
                key={def.key}
                label={def.label}
                value={formatMetricValue(value, def.format)}
              />
            );
          })}
          {hasMessages && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="mt-2 flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity">
                  {hasErrors ? (
                    <>
                      <CircleAlert className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-destructive">
                        {status.errors!.length} {status.errors!.length === 1 ? "error" : "errors"}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400">
                        {status.warnings!.length} {status.warnings!.length === 1 ? "warning" : "warnings"}
                      </span>
                    </>
                  )}
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {status.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {hasErrors && (
                    <div>
                      <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-1.5">
                        <CircleAlert className="h-4 w-4" />
                        Errors
                      </h4>
                      <ul className="space-y-1.5">
                        {status.errors!.map((error, i) => (
                          <li
                            key={i}
                            className="text-sm text-destructive/90 rounded-md bg-destructive/10 px-3 py-2"
                          >
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {hasWarnings && (
                    <div>
                      <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        Warnings
                      </h4>
                      <ul className="space-y-1.5">
                        {status.warnings!.map((warning, i) => (
                          <li
                            key={i}
                            className="text-sm text-amber-600 dark:text-amber-400 rounded-md bg-amber-500/10 px-3 py-2"
                          >
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(status.lastChecked)}
          </span>
          {status.responseTimeMs !== undefined && (
            <span className="text-xs text-muted-foreground">
              {status.responseTimeMs}ms
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
