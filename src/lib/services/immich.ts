import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

export class ImmichService extends BaseAppService {
  private headers(config: AppConfig): HeadersInit {
    return { "x-api-key": config.apiKey || "" };
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
      // Try new API paths first, fall back to old paths
      let aboutData: { version: string } | null = null;
      try {
        aboutData = await this.fetchJson<{ version: string }>(`${base}/api/server/about`, { headers: h });
      } catch {
        try {
          aboutData = await this.fetchJson<{ version: string }>(`${base}/api/server-info`, { headers: h });
        } catch {
          health = "offline";
          errors.push("Failed to reach Immich server");
        }
      }

      if (aboutData) {
        version = aboutData.version;
      }

      const [statsRes, storageRes] = await Promise.allSettled([
        this.fetchJson<{ photos: number; videos: number; usage: number }>(
          `${base}/api/server/statistics`,
          { headers: h }
        ).catch(() =>
          this.fetchJson<{ photos: number; videos: number; usage: number }>(
            `${base}/api/server-info/statistics`,
            { headers: h }
          )
        ),
        this.fetchJson<{ diskUsageRaw: number; diskSizeRaw: number; diskAvailableRaw: number }>(
          `${base}/api/server/storage`,
          { headers: h }
        ).catch(() =>
          this.fetchJson<{ diskUsageRaw: number; diskSizeRaw: number; diskAvailableRaw: number }>(
            `${base}/api/server-info/storage`,
            { headers: h }
          )
        ),
      ]);

      if (statsRes.status === "fulfilled") {
        const stats = statsRes.value;
        metrics.photoCount = stats.photos ?? 0;
        metrics.videoCount = stats.videos ?? 0;
        if (stats.usage) metrics.storageUsed = stats.usage;
      }

      if (storageRes.status === "fulfilled") {
        const storage = storageRes.value;
        if (storage.diskUsageRaw && !metrics.storageUsed) metrics.storageUsed = storage.diskUsageRaw;
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "immich",
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
      let url = `${config.url}/api/server/about`;
      let result = await this.timedFetch(url, { headers: this.headers(config) });
      if (!result.response.ok) {
        url = `${config.url}/api/server-info`;
        result = await this.timedFetch(url, { headers: this.headers(config) });
      }
      if (!result.response.ok) {
        return { ok: false, message: `HTTP ${result.response.status}`, responseTimeMs: result.responseTimeMs };
      }
      const data = (await result.response.json()) as { version: string };
      return { ok: true, message: "Connected", version: data.version, responseTimeMs: result.responseTimeMs };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }
}
