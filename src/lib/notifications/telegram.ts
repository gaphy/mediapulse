import type { NotificationConfig, NotificationEvent } from "@/types/notification";

const TELEGRAM_API = "https://api.telegram.org";

function formatMessage(event: NotificationEvent): string {
  const emoji = event.currentHealth === "offline" ? "🔴" : "🟢";
  const status = event.currentHealth.toUpperCase();
  const time = new Date(event.timestamp).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  return `${emoji} *${event.appName}* is ${status}

URL: ${event.appUrl}
Previous: ${event.previousHealth}
Time: ${time} UTC`;
}

export async function sendTelegramNotification(
  config: NotificationConfig,
  event: NotificationEvent
): Promise<{ ok: boolean; error?: string }> {
  if (!config.botToken || !config.chatId) {
    return { ok: false, error: "Missing bot token or chat ID" };
  }

  const message = formatMessage(event);

  try {
    const response = await fetch(
      `${TELEGRAM_API}/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!response.ok) {
      const data = (await response.json()) as { description?: string };
      return {
        ok: false,
        error: data.description || `HTTP ${response.status}`,
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

export async function testTelegramNotification(
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

  return sendTelegramNotification(config, testEvent);
}
