"use client";

import { useRef, useState } from "react";
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
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

export function ConfigTransfer({ onImport }: { onImport: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/config/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
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
      setExportOpen(false);
      setPassword("");
    } catch {
      toast.error("Failed to export config");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!password || !pendingFile) return;
    setLoading(true);
    try {
      const text = await pendingFile.text();
      const encrypted = JSON.parse(text);
      const res = await fetch("/api/config/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, encrypted }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to import config");
        return;
      }
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
      setImportOpen(false);
      setPassword("");
      setPendingFile(null);
    } catch {
      toast.error("Invalid config file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPassword("");
            setExportOpen(true);
          }}
        >
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
            if (file) {
              setPendingFile(file);
              setPassword("");
              setImportOpen(true);
            }
            e.target.value = "";
          }}
        />
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Config</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="export-password">
              Choose a password to encrypt the export file
            </Label>
            <Input
              id="export-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExport()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleExport} disabled={!password || loading}>
              {loading ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) setPendingFile(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Config</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="import-password">
              Enter the password used when exporting
            </Label>
            <Input
              id="import-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleImport} disabled={!password || loading}>
              {loading ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
