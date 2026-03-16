"use client";

import { AppList } from "@/components/settings/app-list";
import { NotificationList } from "@/components/settings/notification-list";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your app instances and their connections.
        </p>
      </div>
      <AppList />
      <Separator />
      <NotificationList />
    </div>
  );
}
