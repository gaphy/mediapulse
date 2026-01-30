import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

export class OverseerrService extends BaseAppService {
  private headers(config: AppConfig): HeadersInit {
    return { "X-Api-Key": config.apiKey || "" };
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
      type PageResult = { pageInfo: { results: number } };

      const [statusRes, availableRes, partialRes, processingRes, pendingReqRes] =
        await Promise.allSettled([
          this.fetchJson<{ version: string }>(`${base}/api/v1/status`, { headers: h }),
          this.fetchJson<PageResult>(`${base}/api/v1/media?take=1&filter=available`, { headers: h }),
          this.fetchJson<PageResult>(`${base}/api/v1/media?take=1&filter=partial`, { headers: h }),
          this.fetchJson<PageResult>(`${base}/api/v1/media?take=1&filter=processing`, { headers: h }),
          this.fetchJson<PageResult>(
            `${base}/api/v1/request?take=1&skip=0&filter=pending`,
            { headers: h }
          ),
        ]);

      if (statusRes.status === "fulfilled") {
        version = statusRes.value.version;
      } else {
        health = "offline";
        errors.push("Failed to reach Overseerr");
      }

      if (availableRes.status === "fulfilled") {
        metrics.availableMedia = availableRes.value?.pageInfo?.results ?? 0;
      }
      if (partialRes.status === "fulfilled") {
        metrics.partialMedia = partialRes.value?.pageInfo?.results ?? 0;
      }
      if (processingRes.status === "fulfilled") {
        metrics.requestedMedia = processingRes.value?.pageInfo?.results ?? 0;
      }
      if (pendingReqRes.status === "fulfilled") {
        metrics.pendingRequests = pendingReqRes.value?.pageInfo?.results ?? 0;
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "overseerr",
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
        `${config.url}/api/v1/status`,
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
