import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getNotificationConfig,
  updateNotificationConfig,
  deleteNotificationConfig,
} from "@/lib/db";

const updateNotificationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  // Telegram
  botToken: z.string().nullable().optional(),
  chatId: z.string().nullable().optional(),
  // Discord
  webhookUrl: z.string().url().nullable().optional(),
  // Generic webhook
  url: z.string().url().nullable().optional(),
  method: z.enum(["POST", "GET"]).nullable().optional(),
  headers: z.record(z.string(), z.string()).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const config = getNotificationConfig(id);
  if (!config) {
    return NextResponse.json(
      { error: "Notification config not found" },
      { status: 404 }
    );
  }
  // Return public version (mask secrets)
  return NextResponse.json({
    id: config.id,
    type: config.type,
    name: config.name,
    enabled: config.enabled,
    hasBotToken: !!config.botToken,
    hasChatId: !!config.chatId,
    hasWebhookUrl: !!config.webhookUrl,
    hasUrl: !!config.url,
    method: config.method,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const config = updateNotificationConfig(id, parsed.data);
    if (!config) {
      return NextResponse.json(
        { error: "Notification config not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(config);
  } catch {
    return NextResponse.json(
      { error: "Failed to update notification config" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteNotificationConfig(id);
  if (!deleted) {
    return NextResponse.json(
      { error: "Notification config not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
