import type { AppConfig } from "@/types/app-config";
import type { AppStatus, TestConnectionResult } from "@/types/app-status";

export abstract class BaseAppService {
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 10000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  protected async timedFetch(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 10000
  ): Promise<{ response: Response; responseTimeMs: number }> {
    const start = Date.now();
    const response = await this.fetchWithTimeout(url, options, timeoutMs);
    const responseTimeMs = Date.now() - start;
    return { response, responseTimeMs };
  }

  protected async fetchJson<T = unknown>(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 10000
  ): Promise<T> {
    const response = await this.fetchWithTimeout(url, options, timeoutMs);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  abstract getStatus(config: AppConfig): Promise<AppStatus>;
  abstract testConnection(
    config: AppConfig
  ): Promise<TestConnectionResult>;
}
