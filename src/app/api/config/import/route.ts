import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
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

const importSchema = z.object({
  password: z.string().min(1),
  encrypted: z.object({
    salt: z.string(),
    iv: z.string(),
    authTag: z.string(),
    data: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = importSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid import payload" },
        { status: 400 }
      );
    }

    const { password, encrypted } = parsed.data;

    let decrypted: string;
    try {
      const salt = Buffer.from(encrypted.salt, "hex");
      const iv = Buffer.from(encrypted.iv, "hex");
      const authTag = Buffer.from(encrypted.authTag, "hex");
      const data = Buffer.from(encrypted.data, "hex");
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);
      decrypted = decipher.update(data) + decipher.final("utf8");
    } catch {
      return NextResponse.json(
        { error: "Wrong password or corrupted file" },
        { status: 400 }
      );
    }

    const apps = z.array(appSchema).safeParse(JSON.parse(decrypted));
    if (!apps.success) {
      return NextResponse.json(
        { error: "Invalid config data inside file" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const app of apps.data) {
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
