import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getAllAppsWithSecrets } from "@/lib/db";

const exportSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const apps = getAllAppsWithSecrets();
    const exportData = apps.map((app) => ({
      name: app.name,
      appType: app.appType,
      url: app.url,
      ...(app.apiKey && { apiKey: app.apiKey }),
      ...(app.username && { username: app.username }),
      ...(app.password && { password: app.password }),
      enabled: app.enabled,
    }));

    const plaintext = JSON.stringify(exportData);
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(parsed.data.password, salt, 100000, 32, "sha256");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return NextResponse.json({
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      data: encrypted.toString("hex"),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export config" },
      { status: 500 }
    );
  }
}
