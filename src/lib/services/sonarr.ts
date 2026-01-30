import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

export class SonarrService extends BaseAppService {
  private headers(config: AppConfig): HeadersInit {
    return { "X-Api-Key": config.apiKey || "" };
  }

  async getStatus(config: AppConfig): Promise<AppStatus> {
    const base = config.url;
    const h = this.headers(config);
    const start = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const metrics: Record<string, string | number> = {};
    let version: string | undefined;
    let health: AppStatus["health"] = "online";

    try {
      const [statusRes, healthRes, queueRes, missingRes, seriesRes] =
        await Promise.allSettled([
          this.fetchJson<{ version: string }>(`${base}/api/v3/system/status`, { headers: h }),
          this.fetchJson<Array<{ message: string }>>(`${base}/api/v3/health`, { headers: h }),
          this.fetchJson<{ totalRecords: number }>(`${base}/api/v3/queue`, { headers: h }),
          this.fetchJson<{ totalRecords: number }>(`${base}/api/v3/wanted/missing?pageSize=1`, { headers: h }),
          this.fetchJson<Array<{ statistics?: { sizeOnDisk?: number } }>>(`${base}/api/v3/series`, { headers: h }),
        ]);

      if (statusRes.status === "fulfilled") {
        version = statusRes.value.version;
      } else {
        health = "offline";
        errors.push("Failed to reach system status");
      }

      if (healthRes.status === "fulfilled" && healthRes.value.length > 0) {
        health = health === "online" ? "degraded" : health;
        metrics.healthWarnings = healthRes.value.length;
        healthRes.value.forEach((h) => warnings.push(h.message));
      }

      if (queueRes.status === "fulfilled") {
        metrics.queueSize = queueRes.value.totalRecords;
      }
      if (missingRes.status === "fulfilled") {
        metrics.missingEpisodes = missingRes.value.totalRecords;
      }
      if (seriesRes.status === "fulfilled") {
        metrics.seriesCount = seriesRes.value.length;
        const totalSize = seriesRes.value.reduce((sum, s) => sum + (s.statistics?.sizeOnDisk || 0), 0);
        metrics.sizeOnDisk = totalSize;
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "sonarr",
      name: config.name,
      url: config.url,
      health,
      version,
      lastChecked: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      metrics,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async testConnection(config: AppConfig): Promise<TestConnectionResult> {
    try {
      const { response, responseTimeMs } = await this.timedFetch(
        `${config.url}/api/v3/system/status`,
        { headers: this.headers(config) }
      );
      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}`, responseTimeMs };
      }
      const data = (await response.json()) as { version: string };
      return { ok: true, message: "Connected", version: data.version, responseTimeMs };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }
}
