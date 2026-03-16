"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_LABELS,
  type NotificationType,
  type NotificationConfigPublic,
} from "@/types/notification";

interface NotificationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    type: NotificationType;
    botToken?: string;
    chatId?: string;
    webhookUrl?: string;
    url?: string;
    method?: "POST" | "GET";
  }) => void;
  editing?: NotificationConfigPublic | null;
}

export function NotificationForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
}: NotificationFormProps) {
  const [name, setName] = useState(editing?.name || "");
  const [type, setType] = useState<NotificationType>(
    editing?.type || "telegram"
  );
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"POST" | "GET">(
    editing?.method || "POST"
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: Parameters<typeof onSubmit>[0] = {
        name,
        type,
      };

      if (type === "telegram") {
        if (botToken) data.botToken = botToken;
        if (chatId) data.chatId = chatId;
      } else if (type === "discord") {
        if (webhookUrl) data.webhookUrl = webhookUrl;
      } else if (type === "webhook") {
        if (url) data.url = url;
        data.method = method;
      }

      onSubmit(data);
      onOpenChange(false);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!editing) {
      setName("");
      setType("telegram");
      setBotToken("");
      setChatId("");
      setWebhookUrl("");
      setUrl("");
      setMethod("POST");
    }
  };

  const canSubmit = () => {
    if (!name) return false;
    if (type === "telegram") {
      if (editing) {
        return editing.hasBotToken || botToken;
      }
      return botToken && chatId;
    }
    if (type === "discord") {
      if (editing) {
        return editing.hasWebhookUrl || webhookUrl;
      }
      return webhookUrl;
    }
    if (type === "webhook") {
      if (editing) {
        return editing.hasUrl || url;
      }
      return url;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Notification" : "Add Notification"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., My Telegram"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as NotificationType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {NOTIFICATION_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "telegram" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="botToken">Bot Token</Label>
                <Input
                  id="botToken"
                  type="password"
                  placeholder={
                    editing?.hasBotToken
                      ? "Leave empty to keep current"
                      : "123456:ABC-DEF..."
                  }
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  required={!editing?.hasBotToken}
                />
                <p className="text-xs text-muted-foreground">
                  Get this from{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    @BotFather
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chatId">Chat ID</Label>
                <Input
                  id="chatId"
                  placeholder={
                    editing?.hasChatId
                      ? "Leave empty to keep current"
                      : "-1001234567890"
                  }
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  required={!editing?.hasChatId}
                />
                <p className="text-xs text-muted-foreground">
                  Your user ID or group/channel ID
                </p>
              </div>
            </>
          )}

          {type === "discord" && (
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                type="password"
                placeholder={
                  editing?.hasWebhookUrl
                    ? "Leave empty to keep current"
                    : "https://discord.com/api/webhooks/..."
                }
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                required={!editing?.hasWebhookUrl}
              />
              <p className="text-xs text-muted-foreground">
                Create in Server Settings → Integrations → Webhooks
              </p>
            </div>
          )}

          {type === "webhook" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="url">Webhook URL</Label>
                <Input
                  id="url"
                  placeholder={
                    editing?.hasUrl
                      ? "Leave empty to keep current"
                      : "https://example.com/webhook"
                  }
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required={!editing?.hasUrl}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <Select
                  value={method}
                  onValueChange={(v) => setMethod(v as "POST" | "GET")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !canSubmit()}>
              {loading ? "Saving..." : editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
