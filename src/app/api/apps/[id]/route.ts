import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppPublic, updateApp, deleteApp } from "@/lib/db";

const updateAppSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  apiKey: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const app = getAppPublic(id);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json(app);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAppSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const app = updateApp(id, parsed.data);
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    return NextResponse.json(app);
  } catch {
    return NextResponse.json(
      { error: "Failed to update app" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteApp(id);
  if (!deleted) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
