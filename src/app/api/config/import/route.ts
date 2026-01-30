import { NextResponse } from "next/server";
import { z } from "zod";
import { createApp, getAppByTypeAndUrl } from "@/lib/db";
import { APP_TYPES } from "@/types/app-config";

const appSchema = z.object({
  name: z.string().min(1).max(100),
  appType: z.enum(APP_TYPES),
  url: z.string().url(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  enabled: z.boolean().optional(),
});

const importSchema = z.array(appSchema);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = importSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid config format", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const app of parsed.data) {
      try {
        const existing = getAppByTypeAndUrl(app.appType, app.url);
        if (existing) {
          skipped++;
          continue;
        }
        createApp({
          name: app.name,
          appType: app.appType,
          url: app.url,
          apiKey: app.apiKey,
          username: app.username,
          password: app.password,
        });
        imported++;
      } catch {
        errors.push(`Failed to import ${app.name} (${app.appType})`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json(
      { error: "Failed to import config" },
      { status: 500 }
    );
  }
}
