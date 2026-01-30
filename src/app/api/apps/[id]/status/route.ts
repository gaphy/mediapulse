import { NextResponse } from "next/server";
import { getApp } from "@/lib/db";
import { getService } from "@/lib/services";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const app = getApp(id);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const service = getService(app.appType);
  const status = await service.getStatus(app);
  return NextResponse.json({ ...status, url: app.url });
}
