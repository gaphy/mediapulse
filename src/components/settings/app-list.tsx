"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Settings } from "lucide-react";
import { AppForm } from "./app-form";
import { TestConnectionButton } from "./test-connection-button";
import { ConfigTransfer } from "./config-transfer";
import { APP_LABELS, type AppType, type AppConfigPublic } from "@/types/app-config";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AppList() {
  const { data: apps, error, isLoading, mutate } = useSWR<AppConfigPublic[]>(
    "/api/apps",
    fetcher
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppConfigPublic | null>(null);

  const handleAdd = async (data: {
    name: string;
    appType: AppType;
    url: string;
    apiKey?: string;
    username?: string;
    password?: string;
  }) => {
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to add app");
        return;
      }
      toast.success("App added");
      mutate();
    } catch {
      toast.error("Failed to add app");
    }
  };

  const handleEdit = async (data: {
    name: string;
    appType: AppType;
    url: string;
    apiKey?: string;
    username?: string;
    password?: string;
  }) => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/apps/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update app");
        return;
      }
      toast.success("App updated");
      setEditing(null);
      mutate();
    } catch {
      toast.error("Failed to update app");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this app?")) return;
    try {
      const res = await fetch(`/api/apps/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete app");
        return;
      }
      toast.success("App removed");
      mutate();
    } catch {
      toast.error("Failed to delete app");
    }
  };

  const handleToggle = async (app: AppConfigPublic) => {
    try {
      await fetch(`/api/apps/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !app.enabled }),
      });
      mutate();
    } catch {
      toast.error("Failed to toggle app");
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
          Failed to load apps.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Configured Apps</h2>
        <div className="flex items-center gap-2">
          <ConfigTransfer onImport={() => mutate()} />
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add App
          </Button>
        </div>
      </div>

      {(!apps || apps.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No apps configured yet. Click &quot;Add App&quot; to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {apps.map((app, index) => (
              <div key={app.id}>
                {index > 0 && <Separator />}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Switch
                      checked={app.enabled}
                      onCheckedChange={() => handleToggle(app)}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {app.name}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {APP_LABELS[app.appType]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {app.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TestConnectionButton appId={app.id} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(app);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(app.id)}
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

      <AppForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleAdd}
      />

      {editing && (
        <AppForm
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
