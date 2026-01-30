"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="flex items-center gap-2 mr-6">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">MediaPulse</span>
        </div>
        <nav className="flex items-center gap-4 flex-1">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/"
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/settings"
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Settings
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
