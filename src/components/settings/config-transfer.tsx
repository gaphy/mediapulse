"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

export function ConfigTransfer({ onImport }: { onImport: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const res = await fetch("/api/config/export");
      if (!res.ok) {
        toast.error("Failed to export config");
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mediapulse-config.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Config exported");
    } catch {
      toast.error("Failed to export config");
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/config/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to import config");
        return;
      }
      const result = await res.json();
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} app(s)`);
      }
      if (result.skipped > 0) {
        toast.info(`Skipped ${result.skipped} duplicate(s)`);
      }
      if (result.errors?.length > 0) {
        toast.error(result.errors.join(", "));
      }
      onImport();
    } catch {
      toast.error("Invalid config file");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="h-4 w-4 mr-1" />
        Export
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-1" />
        Import
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
