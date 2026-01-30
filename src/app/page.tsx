"use client";

import { AppGrid } from "@/components/dashboard/app-grid";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor the status of your media server apps.
        </p>
      </div>
      <AppGrid />
    </div>
  );
}
