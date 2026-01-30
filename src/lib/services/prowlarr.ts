import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

export class ProwlarrService extends BaseAppService {
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
      const [statusRes, healthRes, indexerRes, indexerStatusRes] =
        await Promise.allSettled([
          this.fetchJson<{ version: string }>(`${base}/api/v1/system/status`, { headers: h }),
          this.fetchJson<Array<{ message: string }>>(`${base}/api/v1/health`, { headers: h }),
          this.fetchJson<unknown[]>(`${base}/api/v1/indexer`, { headers: h }),
          this.fetchJson<unknown[]>(`${base}/api/v1/indexerstatus`, { headers: h }),
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

      if (indexerRes.status === "fulfilled") {
        metrics.indexerCount = indexerRes.value.length;
      }
      if (indexerStatusRes.status === "fulfilled") {
        metrics.failedIndexers = indexerStatusRes.value.length;
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "prowlarr",
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
        `${config.url}/api/v1/system/status`,
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
