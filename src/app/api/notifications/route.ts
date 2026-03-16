import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAllNotificationConfigs,
  createNotificationConfig,
} from "@/lib/db";
import { NOTIFICATION_TYPES } from "@/types/notification";

const createNotificationSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  name: z.string().min(1).max(100),
  // Telegram
  botToken: z.string().optional(),
  chatId: z.string().optional(),
  // Discord
  webhookUrl: z.string().url().optional(),
  // Generic webhook
  url: z.string().url().optional(),
  method: z.enum(["POST", "GET"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const configs = getAllNotificationConfigs();
  return NextResponse.json(configs);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Validate required fields based on type
    const { type } = parsed.data;
    if (type === "telegram" && (!parsed.data.botToken || !parsed.data.chatId)) {
      return NextResponse.json(
        { error: "Telegram requires botToken and chatId" },
        { status: 400 }
      );
    }
    if (type === "discord" && !parsed.data.webhookUrl) {
      return NextResponse.json(
        { error: "Discord requires webhookUrl" },
        { status: 400 }
      );
    }
    if (type === "webhook" && !parsed.data.url) {
      return NextResponse.json(
        { error: "Webhook requires url" },
        { status: 400 }
      );
    }

    const config = createNotificationConfig(parsed.data);
    return NextResponse.json(config, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create notification config" },
      { status: 500 }
    );
  }
}
