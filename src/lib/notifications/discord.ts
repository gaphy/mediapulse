import type { NotificationConfig, NotificationEvent } from "@/types/notification";

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp: string;
}

function buildEmbed(event: NotificationEvent): DiscordEmbed {
  const isOffline = event.currentHealth === "offline";
  const color = isOffline ? 0xff0000 : 0x00ff00; // Red for offline, green for online
  const status = event.currentHealth.toUpperCase();

  return {
    title: `${event.appName} is ${status}`,
    color,
    fields: [
      { name: "URL", value: event.appUrl, inline: true },
      { name: "Previous", value: event.previousHealth, inline: true },
      { name: "Current", value: event.currentHealth, inline: true },
    ],
    timestamp: event.timestamp,
  };
}

export async function sendDiscordNotification(
  config: NotificationConfig,
  event: NotificationEvent
): Promise<{ ok: boolean; error?: string }> {
  if (!config.webhookUrl) {
    return { ok: false, error: "Missing webhook URL" };
  }

  const embed = buildEmbed(event);

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

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

export async function testDiscordNotification(
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

  return sendDiscordNotification(config, testEvent);
}
