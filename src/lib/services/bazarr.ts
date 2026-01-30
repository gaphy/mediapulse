import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

export class BazarrService extends BaseAppService {
  private apiUrl(config: AppConfig, path: string): string {
    return `${config.url}/api${path}?apikey=${encodeURIComponent(config.apiKey || "")}`;
  }

  async getStatus(config: AppConfig): Promise<AppStatus> {
    const start = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const metrics: Record<string, string | number> = {};
    let version: string | undefined;
    let health: AppStatus["health"] = "online";

    try {
      const [statusRes, healthRes, badgesRes] = await Promise.allSettled([
        this.fetchJson<{ data: { bazarr_version: string } }>(this.apiUrl(config, "/system/status")),
        this.fetchJson<{ data: Array<{ issue: string }> }>(this.apiUrl(config, "/system/health")),
        this.fetchJson<{ episodes: number; movies: number; providers: number }>(this.apiUrl(config, "/badges")),
      ]);

      if (statusRes.status === "fulfilled") {
        version = statusRes.value?.data?.bazarr_version;
      } else {
        health = "offline";
        errors.push("Failed to reach system status");
      }

      if (healthRes.status === "fulfilled") {
        const issues = healthRes.value?.data;
        if (Array.isArray(issues) && issues.length > 0) {
          health = health === "online" ? "degraded" : health;
          metrics.healthWarnings = issues.length;
          issues.forEach((i) => warnings.push(i.issue));
        }
      }

      if (badgesRes.status === "fulfilled") {
        const badges = badgesRes.value;
        metrics.missingSeriesSubs = badges.episodes ?? 0;
        metrics.missingMovieSubs = badges.movies ?? 0;
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "bazarr",
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
        this.apiUrl(config, "/system/status")
      );
      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}`, responseTimeMs };
      }
      const data = (await response.json()) as { data: { bazarr_version: string } };
      return {
        ok: true,
        message: "Connected",
        version: data?.data?.bazarr_version,
        responseTimeMs,
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }
}
