import type { NotificationConfig, NotificationEvent } from "@/types/notification";

interface WebhookPayload {
  event: "status_change";
  app: {
    name: string;
    type: string;
    url: string;
  };
  previous: string;
  current: string;
  timestamp: string;
}

function buildPayload(event: NotificationEvent): WebhookPayload {
  return {
    event: "status_change",
    app: {
      name: event.appName,
      type: event.appType,
      url: event.appUrl,
    },
    previous: event.previousHealth,
    current: event.currentHealth,
    timestamp: event.timestamp,
  };
}

export async function sendWebhookNotification(
  config: NotificationConfig,
  event: NotificationEvent
): Promise<{ ok: boolean; error?: string }> {
  if (!config.url) {
    return { ok: false, error: "Missing webhook URL" };
  }

  const payload = buildPayload(event);
  const method = config.method || "POST";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.headers,
  };

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (method === "POST") {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(config.url, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        error: text || `HTTP ${response.status}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function testWebhookNotification(
  config: NotificationConfig
): Promise<{ ok: boolean; error?: string }> {
  const testEvent: NotificationEvent = {
    appName: "Test App",
    appType: "test",
    appUrl: "http://localhost:8080",
    previousHealth: "online",
    currentHealth: "offline",
    timestamp: new Date().toISOString(),
  };

  return sendWebhookNotification(config, testEvent);
}
