"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { TestConnectionResult } from "@/types/app-status";

export function TestConnectionButton({ appId }: { appId: string }) {
  const [result, setResult] = useState<TestConnectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/apps/${appId}/test`, { method: "POST" });
      const data = (await res.json()) as TestConnectionResult;
      setResult(data);
    } catch {
      setResult({ ok: false, message: "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={loading}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Test
      </Button>
      {result && (
        <div className="flex items-center gap-1">
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span className="text-xs text-muted-foreground">
            {result.ok
              ? `OK${result.version ? ` (v${result.version})` : ""}${result.responseTimeMs ? ` ${result.responseTimeMs}ms` : ""}`
              : result.message}
          </span>
        </div>
      )}
    </div>
  );
}
