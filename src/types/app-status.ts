import type { AppType } from "./app-config";

export type HealthStatus = "online" | "degraded" | "offline" | "unknown";

export interface AppStatus {
  appId: string;
  appType: AppType;
  name: string;
  url: string;
  health: HealthStatus;
  version?: string;
  lastChecked: string;
  responseTimeMs?: number;
  metrics: Record<string, string | number>;
  warnings?: string[];
  errors?: string[];
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
  version?: string;
  responseTimeMs?: number;
}
