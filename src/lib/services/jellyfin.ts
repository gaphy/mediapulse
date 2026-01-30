import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

export class JellyfinService extends BaseAppService {
  private headers(config: AppConfig): HeadersInit {
    return {
      Authorization: `MediaBrowser Token="${config.apiKey || ""}"`,
    };
  }

  async getStatus(config: AppConfig): Promise<AppStatus> {
    const base = config.url;
    const h = this.headers(config);
    const start = Date.now();
    const errors: string[] = [];
    const metrics: Record<string, string | number> = {};
    let version: string | undefined;
    let health: AppStatus["health"] = "online";

    try {
      const [infoRes, sessionsRes, libraryRes] = await Promise.allSettled([
        this.fetchJson<{
          Version: string;
          ServerName: string;
          HasPendingRestart: boolean;
          HasUpdateAvailable: boolean;
        }>(`${base}/System/Info`, { headers: h }),
        this.fetchJson<Array<{ NowPlayingItem?: unknown }>>(`${base}/Sessions`, { headers: h }),
        this.fetchJson<unknown[]>(`${base}/Library/VirtualFolders`, { headers: h }),
      ]);

      if (infoRes.status === "fulfilled") {
        version = infoRes.value.Version;
        if (infoRes.value.HasPendingRestart) {
          health = "degraded";
          metrics.pendingRestart = 1;
        }
        if (infoRes.value.HasUpdateAvailable) {
          metrics.updateAvailable = 1;
        }
      } else {
        health = "offline";
        errors.push("Failed to reach Jellyfin server");
      }

      if (sessionsRes.status === "fulfilled") {
        const activeSessions = sessionsRes.value.filter((s) => s.NowPlayingItem);
        metrics.activeSessions = activeSessions.length;
        metrics.totalSessions = sessionsRes.value.length;
      }

      if (libraryRes.status === "fulfilled") {
        metrics.libraryCount = libraryRes.value.length;
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "jellyfin",
      name: config.name,
      url: config.url,
      health,
      version,
      lastChecked: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      metrics,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async testConnection(config: AppConfig): Promise<TestConnectionResult> {
    try {
      const { response, responseTimeMs } = await this.timedFetch(
        `${config.url}/System/Info`,
        { headers: this.headers(config) }
      );
      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}`, responseTimeMs };
      }
      const data = (await response.json()) as { Version: string };
      return { ok: true, message: "Connected", version: data.Version, responseTimeMs };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }
}
