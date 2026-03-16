import { NextResponse } from "next/server";
import { getNotificationConfig } from "@/lib/db";
import { testNotification } from "@/lib/notifications";

export async function POST(
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

  const result = await testNotification(config);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, message: "Test notification sent" });
}
