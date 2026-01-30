import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

export class PinchflatService extends BaseAppService {
  async getStatus(config: AppConfig): Promise<AppStatus> {
    const start = Date.now();
    const errors: string[] = [];
    const metrics: Record<string, string | number> = {};
    let health: AppStatus["health"] = "online";

    try {
      const response = await this.fetchWithTimeout(config.url, {}, 10000);
      const responseTimeMs = Date.now() - start;
      metrics.responseTimeMs = responseTimeMs;

      if (!response.ok) {
        health = "offline";
        errors.push(`HTTP ${response.status}`);
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "pinchflat",
      name: config.name,
      url: config.url,
      health,
      lastChecked: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      metrics,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async testConnection(config: AppConfig): Promise<TestConnectionResult> {
    try {
      const { response, responseTimeMs } = await this.timedFetch(config.url);
      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}`, responseTimeMs };
      }
      return { ok: true, message: "Connected", responseTimeMs };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }
}
