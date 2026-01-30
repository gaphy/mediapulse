import { NextResponse } from "next/server";
import { z } from "zod";
import { getAllApps, createApp } from "@/lib/db";
import { APP_TYPES } from "@/types/app-config";

const createAppSchema = z.object({
  name: z.string().min(1).max(100),
  appType: z.enum(APP_TYPES),
  url: z.string().url(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export async function GET() {
  const apps = getAllApps();
  return NextResponse.json(apps);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createAppSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const app = createApp(parsed.data);
    return NextResponse.json(app, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create app" },
      { status: 500 }
    );
  }
}
