import { BaseAppService } from "./base-service";
import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

const PLEX_CLIENT_HEADERS = {
  "X-Plex-Client-Identifier": "mediapulse-dashboard",
  "X-Plex-Product": "MediaPulse",
  "X-Plex-Version": "1.0.0",
};

export class PlexService extends BaseAppService {
  private headers(config: AppConfig): HeadersInit {
    return {
      "X-Plex-Token": config.apiKey || "",
      Accept: "application/json",
      ...PLEX_CLIENT_HEADERS,
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
      const [identityRes, libraryRes, sessionsRes] = await Promise.allSettled([
        this.fetchJson<{ MediaContainer: { version: string } }>(
          `${base}/identity`,
          { headers: h }
        ),
        this.fetchJson<{ MediaContainer: { Directory: Array<{ title: string; type: string }> } }>(
          `${base}/library/sections`,
          { headers: h }
        ),
        this.fetchJson<{ MediaContainer: { size: number; Metadata?: unknown[] } }>(
          `${base}/status/sessions`,
          { headers: h }
        ),
      ]);

      if (identityRes.status === "fulfilled") {
        version = identityRes.value?.MediaContainer?.version;
      } else {
        health = "offline";
        errors.push("Failed to reach Plex server");
      }

      if (libraryRes.status === "fulfilled") {
        const dirs = libraryRes.value?.MediaContainer?.Directory;
        if (Array.isArray(dirs)) {
          metrics.libraryCount = dirs.length;
        }
      }

      if (sessionsRes.status === "fulfilled") {
        const sessions = sessionsRes.value?.MediaContainer;
        metrics.activeStreams = sessions?.size ?? 0;
      }
    } catch {
      health = "offline";
      errors.push("Connection failed");
    }

    return {
      appId: config.id,
      appType: "plex",
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
        `${config.url}/identity`,
        { headers: this.headers(config) }
      );
      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}`, responseTimeMs };
      }
      const data = (await response.json()) as { MediaContainer: { version: string } };
      return {
        ok: true,
        message: "Connected",
        version: data?.MediaContainer?.version,
        responseTimeMs,
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }
}
