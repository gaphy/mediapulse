"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  APP_TYPES,
  APP_LABELS,
  APP_AUTH_TYPE,
  type AppType,
  type AppConfigPublic,
} from "@/types/app-config";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import type { TestConnectionResult } from "@/types/app-status";

interface AppFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    appType: AppType;
    url: string;
    apiKey?: string;
    username?: string;
    password?: string;
  }) => void;
  editing?: AppConfigPublic | null;
}

export function AppForm({ open, onOpenChange, onSubmit, editing }: AppFormProps) {
  const [name, setName] = useState(editing?.name || APP_LABELS["sonarr"]);
  const [appType, setAppType] = useState<AppType>(editing?.appType || "sonarr");
  const [nameManuallySet, setNameManuallySet] = useState(!!editing);
  const [url, setUrl] = useState(editing?.url || "");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Plex OAuth state
  const [plexToken, setPlexToken] = useState("");
  const [plexAuthStatus, setPlexAuthStatus] = useState<
    "idle" | "waiting" | "success" | "error"
  >("idle");
  const [plexAuthError, setPlexAuthError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Test connection state
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);

  const authType = APP_AUTH_TYPE[appType];

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Clean up polling on unmount or dialog close
  useEffect(() => {
    if (!open) {
      stopPolling();
      setPlexAuthStatus("idle");
      setPlexAuthError("");
      setPlexToken("");
    }
    return () => stopPolling();
  }, [open, stopPolling]);

  const startPlexAuth = async () => {
    setPlexAuthStatus("waiting");
    setPlexAuthError("");
    setPlexToken("");

    try {
      const res = await fetch("/api/plex-auth", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start Plex auth");
      }

      const { pinId, authUrl } = (await res.json()) as {
        pinId: number;
        authUrl: string;
      };

      window.open(authUrl, "_blank", "noopener");

      // Poll every 2 seconds for token
      pollRef.current = setInterval(async () => {
        try {
          const checkRes = await fetch(`/api/plex-auth?pinId=${pinId}`);
          const checkData = await checkRes.json();

          if (checkData.token) {
            stopPolling();
            setPlexToken(checkData.token);
            setPlexAuthStatus("success");
          } else if (checkData.error) {
            stopPolling();
            setPlexAuthStatus("error");
            setPlexAuthError(checkData.error);
          }
        } catch {
          stopPolling();
          setPlexAuthStatus("error");
          setPlexAuthError("Failed to check authorization status");
        }
      }, 2000);
    } catch (err) {
      setPlexAuthStatus("error");
      setPlexAuthError(
        err instanceof Error ? err.message : "Failed to start Plex auth"
      );
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appType,
          url: url.replace(/\/+$/, ""),
          ...(authType === "apiKey" ? { apiKey } : {}),
          ...(authType === "oauth" ? { apiKey: plexToken } : {}),
          ...(authType === "credentials" ? { username, password } : {}),
        }),
      });
      const data = (await res.json()) as TestConnectionResult;
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Request failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      onSubmit({
        name,
        appType,
        url: url.replace(/\/+$/, ""),
        ...(authType === "apiKey" ? { apiKey: apiKey || undefined } : {}),
        ...(authType === "oauth"
          ? { apiKey: plexToken || undefined }
          : {}),
        ...(authType === "credentials"
          ? { username: username || undefined, password: password || undefined }
          : {}),
      });
      onOpenChange(false);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!editing) {
      setName(APP_LABELS["sonarr"]);
      setAppType("sonarr");
      setNameManuallySet(false);
      setUrl("");
      setApiKey("");
      setUsername("");
      setPassword("");
      setPlexToken("");
      setPlexAuthStatus("idle");
      setPlexAuthError("");
      setTestResult(null);
    }
  };

  const oauthReady = plexAuthStatus === "success" && !!plexToken;
  const oauthRequired = authType === "oauth" && !editing?.hasApiKey && !oauthReady;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit App" : "Add App"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="e.g., Sonarr - TV Shows"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameManuallySet(true);
              }}
              required
            />
          </div>

          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="appType">App Type</Label>
              <Select
                value={appType}
                onValueChange={(v) => {
                  const newType = v as AppType;
                  setAppType(newType);
                  if (!nameManuallySet) {
                    setName(APP_LABELS[newType]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {APP_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="http://192.168.1.50:8989"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          {authType === "apiKey" && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={
                  editing?.hasApiKey
                    ? "Leave empty to keep current"
                    : "Enter API key"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required={!editing?.hasApiKey}
              />
            </div>
          )}

          {authType === "oauth" && (
            <div className="space-y-2">
              <Label>Plex Account</Label>
              {plexAuthStatus === "idle" && (
                <>
                  {editing?.hasApiKey && (
                    <p className="text-sm text-muted-foreground">
                      Already authorized. Sign in again to update.
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={startPlexAuth}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Sign in with Plex
                  </Button>
                </>
              )}
              {plexAuthStatus === "waiting" && (
                <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for authorization... Complete sign-in in the browser
                  tab that opened.
                </div>
              )}
              {plexAuthStatus === "success" && (
                <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Plex account authorized
                </div>
              )}
              {plexAuthStatus === "error" && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{plexAuthError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={startPlexAuth}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Try again
                  </Button>
                </div>
              )}
            </div>
          )}

          {authType === "credentials" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!editing?.hasCredentials}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={
                    editing?.hasCredentials
                      ? "Leave empty to keep current"
                      : "Enter password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editing?.hasCredentials}
                />
              </div>
            </>
          )}

          {authType === "none" && (
            <p className="text-sm text-muted-foreground">
              This app does not require authentication.
            </p>
          )}

          {url && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing}
              >
                {testing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Test Connection
              </Button>
              {testResult && (
                <div className="flex items-center gap-1">
                  {testResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {testResult.ok
                      ? `OK${testResult.version ? ` (v${testResult.version})` : ""}${testResult.responseTimeMs ? ` ${testResult.responseTimeMs}ms` : ""}`
                      : testResult.message}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || oauthRequired}>
              {loading ? "Saving..." : editing ? "Update" : "Add App"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
