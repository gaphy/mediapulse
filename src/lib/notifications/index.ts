import type { AppStatus, HealthStatus } from "@/types/app-status";
import type { NotificationConfig, NotificationEvent } from "@/types/notification";
import { getEnabledNotificationConfigs } from "@/lib/db";
import {
  sendTelegramNotification,
  testTelegramNotification,
} from "./telegram";
import { sendDiscordNotification, testDiscordNotification } from "./discord";
import { sendWebhookNotification, testWebhookNotification } from "./webhook";

// In-memory cache of last known health states
const lastKnownStates = new Map<string, HealthStatus>();

// Minimum health states that trigger notifications
const NOTIFY_ON_TRANSITIONS: Array<{
  from: HealthStatus[];
  to: HealthStatus;
}> = [
  // Notify when going offline from any other state
  { from: ["online", "degraded", "unknown"], to: "offline" },
  // Notify when coming back online from offline
  { from: ["offline"], to: "online" },
];

function shouldNotify(
  previousHealth: HealthStatus | undefined,
  currentHealth: HealthStatus
): boolean {
  // First check - if no previous state, only notify if currently offline
  if (!previousHealth) {
    return currentHealth === "offline";
  }

  // Check transition rules
  for (const rule of NOTIFY_ON_TRANSITIONS) {
    if (rule.from.includes(previousHealth) && rule.to === currentHealth) {
      return true;
    }
  }

  return false;
}

async function sendNotification(
  config: NotificationConfig,
  event: NotificationEvent
): Promise<{ ok: boolean; error?: string }> {
  switch (config.type) {
    case "telegram":
      return sendTelegramNotification(config, event);
    case "discord":
      return sendDiscordNotification(config, event);
    case "webhook":
      return sendWebhookNotification(config, event);
    default:
      return { ok: false, error: `Unknown notification type: ${config.type}` };
  }
}

export async function testNotification(
  config: NotificationConfig
): Promise<{ ok: boolean; error?: string }> {
  switch (config.type) {
    case "telegram":
      return testTelegramNotification(config);
    case "discord":
      return testDiscordNotification(config);
    case "webhook":
      return testWebhookNotification(config);
    default:
      return { ok: false, error: `Unknown notification type: ${config.type}` };
  }
}

export async function checkAndNotify(
  currentStatuses: AppStatus[]
): Promise<void> {
  const configs = getEnabledNotificationConfigs();
  if (configs.length === 0) {
    // No notification configs, just update cache
    for (const status of currentStatuses) {
      lastKnownStates.set(status.appId, status.health);
    }
    return;
  }

  const events: NotificationEvent[] = [];

  for (const status of currentStatuses) {
    const previousHealth = lastKnownStates.get(status.appId);

    if (shouldNotify(previousHealth, status.health)) {
      events.push({
        appName: status.name,
        appType: status.appType,
        appUrl: status.url,
        previousHealth: previousHealth || "unknown",
        currentHealth: status.health,
        timestamp: new Date().toISOString(),
      });
    }

    // Update cache
    lastKnownStates.set(status.appId, status.health);
  }

  // Send notifications for all events
  if (events.length > 0) {
    const promises: Promise<void>[] = [];

    for (const event of events) {
      for (const config of configs) {
        promises.push(
          sendNotification(config, event).then((result) => {
            if (!result.ok) {
              console.error(
                `Failed to send ${config.type} notification for ${event.appName}:`,
                result.error
              );
            }
          })
        );
      }
    }

    await Promise.allSettled(promises);
  }
}

// Export for testing/debugging
export function getLastKnownState(appId: string): HealthStatus | undefined {
  return lastKnownStates.get(appId);
}

export function clearLastKnownStates(): void {
  lastKnownStates.clear();
}
