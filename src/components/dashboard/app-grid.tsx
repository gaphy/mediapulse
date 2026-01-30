"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { AppCard } from "./app-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Settings, ArrowDownAZ, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AppStatus } from "@/types/app-status";
import type { HealthStatus } from "@/types/app-status";

type SortMode = "name" | "status";

const healthOrder: Record<HealthStatus, number> = {
  offline: 0,
  degraded: 1,
  unknown: 2,
  online: 3,
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AppGrid() {
  const [sort, setSort] = useState<SortMode>("name");

  const { data, error, isLoading } = useSWR<AppStatus[]>(
    "/api/status",
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  const sorted = useMemo(() => {
    if (!data) return [];
    const copy = [...data];
    if (sort === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      copy.sort(
        (a, b) =>
          healthOrder[a.health] - healthOrder[b.health] ||
          a.name.localeCompare(b.name)
      );
    }
    return copy;
  }, [data, sort]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load dashboard
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Check that the server is running and try again.
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No apps configured</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Add your first app to start monitoring.
        </p>
        <Link href="/settings">
          <Button>Go to Settings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <Button
          variant={sort === "name" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setSort("name")}
        >
          <ArrowDownAZ className="h-4 w-4 mr-1" />
          Name
        </Button>
        <Button
          variant={sort === "status" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setSort("status")}
        >
          <Activity className="h-4 w-4 mr-1" />
          Status
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((status) => (
          <AppCard key={status.appId} status={status} />
        ))}
      </div>
    </div>
  );
}
