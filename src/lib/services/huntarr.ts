import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

const sessions = new Map<string, { cookie: string; expires: number }>();

export class HuntarrService extends BaseAppService {
  private async authenticate(config: AppConfig): Promise<string> {
    const cached = sessions.get(config.id);
    if (cached && cached.expires > Date.now()) {
      return cached.cookie;
    }

    const response = await this.fetchWithTimeout(
      `${config.url}/api/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: config.username || "",
          password: config.password || "",
        }),
        redirect: "manual",
      }
    );

    const setCookie = response.headers.get("set-cookie");
    const match = setCookie?.match(/huntarr_session=([^;]+)/);
    if (!match) {
      throw new Error("Authentication failed");
    }

    const cookie = `huntarr_session=${match[1]}`;
    sessions.set(config.id, { cookie, expires: Date.now() + 30 * 60 * 1000 });
    return cookie;
  }

  async getStatus(config: AppConfig): Promise<AppStatus> {
    const start = Date.now();
    const errors: string[] = [];
    const metrics: Record<string, string | number> = {};
    let version: string | undefined;
    let health: AppStatus["health"] = "online";

    try {
      const versionRes = await this.fetchJson<{ version: string }>(
        `${config.url}/api/version`
      );
      version = versionRes.version;
      metrics.responseTimeMs = Date.now() - start;
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "huntarr",
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
      const start = Date.now();

      // Verify credentials if provided
      if (config.username && config.password) {
        await this.authenticate(config);
      }

      const { response, responseTimeMs } = await this.timedFetch(
        `${config.url}/api/version`
      );
      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}`, responseTimeMs };
      }
      const data = (await response.json()) as { version: string };
      return {
        ok: true,
        message: "Connected",
        version: data.version,
        responseTimeMs: Date.now() - start,
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }
}
