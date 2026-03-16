"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Bell, Send, Loader2 } from "lucide-react";
import { NotificationForm } from "./notification-form";
import {
  NOTIFICATION_LABELS,
  type NotificationType,
  type NotificationConfigPublic,
} from "@/types/notification";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function NotificationList() {
  const {
    data: configs,
    error,
    isLoading,
    mutate,
  } = useSWR<NotificationConfigPublic[]>("/api/notifications", fetcher);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationConfigPublic | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleAdd = async (data: {
    name: string;
    type: NotificationType;
    botToken?: string;
    chatId?: string;
    webhookUrl?: string;
    url?: string;
    method?: "POST" | "GET";
  }) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to add notification");
        return;
      }
      toast.success("Notification added");
      mutate();
    } catch {
      toast.error("Failed to add notification");
    }
  };

  const handleEdit = async (data: {
    name: string;
    type: NotificationType;
    botToken?: string;
    chatId?: string;
    webhookUrl?: string;
    url?: string;
    method?: "POST" | "GET";
  }) => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/notifications/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update notification");
        return;
      }
      toast.success("Notification updated");
      setEditing(null);
      mutate();
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this notification?")) return;
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete notification");
        return;
      }
      toast.success("Notification removed");
      mutate();
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleToggle = async (config: NotificationConfigPublic) => {
    try {
      await fetch(`/api/notifications/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !config.enabled }),
      });
      mutate();
    } catch {
      toast.error("Failed to toggle notification");
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Test notification sent!");
      } else {
        toast.error(data.error || "Failed to send test notification");
      }
    } catch {
      toast.error("Failed to send test notification");
    } finally {
      setTestingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Failed to load notifications.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Notification
        </Button>
      </div>

      {!configs || configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No notifications configured. Add one to get alerts when services
              go offline.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {configs.map((config, index) => (
              <div key={config.id}>
                {index > 0 && <Separator />}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={() => handleToggle(config)}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {config.name}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {NOTIFICATION_LABELS[config.type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {config.type === "telegram" && "Telegram Bot"}
                        {config.type === "discord" && "Discord Webhook"}
                        {config.type === "webhook" &&
                          `${config.method || "POST"} webhook`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTest(config.id)}
                      disabled={testingId === config.id}
                    >
                      {testingId === config.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(config)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <NotificationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleAdd}
      />

      {editing && (
        <NotificationForm
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSubmit={handleEdit}
          editing={editing}
        />
      )}
    </>
  );
}
