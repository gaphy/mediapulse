import { NextResponse } from "next/server";
import { getEnabledApps } from "@/lib/db";
import { getService } from "@/lib/services";
import { checkAndNotify } from "@/lib/notifications";
import type { AppStatus } from "@/types/app-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const apps = getEnabledApps();

  const results = await Promise.allSettled(
    apps.map((app) => {
      const service = getService(app.appType);
      return service.getStatus(app);
    })
  );

  const statuses: AppStatus[] = results.map((result, index) => {
    const url = apps[index].url;
    if (result.status === "fulfilled") {
      return { ...result.value, url };
    }
    return {
      appId: apps[index].id,
      appType: apps[index].appType,
      name: apps[index].name,
      url,
      health: "offline" as const,
      lastChecked: new Date().toISOString(),
      metrics: {},
      errors: [
        result.reason instanceof Error
          ? result.reason.message
          : "Unknown error",
      ],
    };
  });

  // Check for status transitions and send notifications (fire and forget)
  checkAndNotify(statuses).catch((err) => {
    console.error("Failed to check/send notifications:", err);
  });

  return NextResponse.json(statuses);
}
