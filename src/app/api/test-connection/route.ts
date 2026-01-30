import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_TYPES } from "@/types/app-config";
import type { AppConfig } from "@/types/app-config";
import { getService } from "@/lib/services";

const testSchema = z.object({
  appType: z.enum(APP_TYPES),
  url: z.string().url(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = testSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const { appType, url, apiKey, username, password } = parsed.data;

    const fakeConfig: AppConfig = {
      id: "__test__",
      name: "Test",
      appType,
      url,
      apiKey,
      username,
      password,
      sortOrder: 0,
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const service = getService(appType);
    const result = await service.testConnection(fakeConfig);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Test failed" },
      { status: 500 }
    );
  }
}
