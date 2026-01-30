import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

// In-memory session store keyed by app config ID
const sessions = new Map<string, { cookie: string; expires: number }>();

export class QBittorrentService extends BaseAppService {
  private async authenticate(config: AppConfig): Promise<string> {
    const cached = sessions.get(config.id);
    if (cached && cached.expires > Date.now()) {
      return cached.cookie;
    }

    const response = await this.fetchWithTimeout(
      `${config.url}/api/v2/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: config.username || "",
          password: config.password || "",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Authentication failed: HTTP ${response.status}`);
    }

    const setCookie = response.headers.get("set-cookie");
    const sidMatch = setCookie?.match(/SID=([^;]+)/);
    if (!sidMatch) {
      throw new Error("No session cookie received");
    }

    const cookie = `SID=${sidMatch[1]}`;
    sessions.set(config.id, { cookie, expires: Date.now() + 30 * 60 * 1000 });
    return cookie;
  }

  private async authedFetch<T>(
    config: AppConfig,
    path: string,
    asText?: boolean
  ): Promise<T> {
    const cookie = await this.authenticate(config);
    const response = await this.fetchWithTimeout(
      `${config.url}${path}`,
      { headers: { Cookie: cookie } }
    );

    if (response.status === 403) {
      sessions.delete(config.id);
      const newCookie = await this.authenticate(config);
      const retry = await this.fetchWithTimeout(
        `${config.url}${path}`,
        { headers: { Cookie: newCookie } }
      );
      if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
      return (asText ? retry.text() : retry.json()) as Promise<T>;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (asText ? response.text() : response.json()) as Promise<T>;
  }

  async getStatus(config: AppConfig): Promise<AppStatus> {
    const start = Date.now();
    const errors: string[] = [];
    const metrics: Record<string, string | number> = {};
    let version: string | undefined;
    let health: AppStatus["health"] = "online";

    try {
      const [versionRes, transferRes, downloadingRes] = await Promise.allSettled([
        this.authedFetch<string>(config, "/api/v2/app/version", true),
        this.authedFetch<{
          dl_info_speed: number;
          up_info_speed: number;
          dl_info_data: number;
          up_info_data: number;
        }>(config, "/api/v2/transfer/info"),
        this.authedFetch<Array<{ name: string; progress: number }>>(
          config,
          "/api/v2/torrents/info?filter=downloading"
        ),
      ]);

      if (versionRes.status === "fulfilled") {
        version = String(versionRes.value);
      } else {
        health = "offline";
        errors.push("Failed to connect to qBittorrent");
      }

      if (transferRes.status === "fulfilled") {
        const t = transferRes.value;
        metrics.downloadSpeed = t.dl_info_speed;
        metrics.uploadSpeed = t.up_info_speed;
      }

      if (downloadingRes.status === "fulfilled") {
        metrics.activeDownloads = downloadingRes.value.length;
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "qbittorrent",
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
      await this.authenticate(config);
      const cookie = sessions.get(config.id)?.cookie || "";
      const { response, responseTimeMs } = await this.timedFetch(
        `${config.url}/api/v2/app/version`,
        { headers: { Cookie: cookie } }
      );
      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}`, responseTimeMs };
      }
      const v = await response.text();
      return { ok: true, message: "Connected", version: v, responseTimeMs: Date.now() - start };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }
}
