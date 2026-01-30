import { NextResponse } from "next/server";
import { getAllAppsWithSecrets } from "@/lib/db";

export async function GET() {
  try {
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

    return NextResponse.json(exportData);
  } catch {
    return NextResponse.json(
      { error: "Failed to export config" },
      { status: 500 }
    );
  }
}
