import type { HealthStatus } from "./app-status";

export type NotificationType = "telegram" | "discord" | "webhook";

export const NOTIFICATION_TYPES = ["telegram", "discord", "webhook"] as const;

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  telegram: "Telegram",
  discord: "Discord",
  webhook: "Webhook",
};

export interface NotificationConfig {
  id: string;
  type: NotificationType;
  name: string;
  enabled: boolean;
  // Telegram
  botToken?: string;
  chatId?: string;
  // Discord
  webhookUrl?: string;
  // Generic webhook
  url?: string;
  method?: "POST" | "GET";
  headers?: Record<string, string>;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface NotificationConfigPublic {
  id: string;
  type: NotificationType;
  name: string;
  enabled: boolean;
  // Masked/partial info for display
  hasBotToken?: boolean;
  hasChatId?: boolean;
  hasWebhookUrl?: boolean;
  hasUrl?: boolean;
  method?: "POST" | "GET";
}

export interface NotificationEvent {
  appName: string;
  appType: string;
  appUrl: string;
  previousHealth: HealthStatus;
  currentHealth: HealthStatus;
  timestamp: string;
}
