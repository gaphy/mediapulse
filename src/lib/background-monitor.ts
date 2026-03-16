const DEFAULT_INTERVAL_MS = 60_000; // 60 seconds

let intervalId: ReturnType<typeof setInterval> | null = null;

async function pollStatuses(): Promise<void> {
  try {
    const port = process.env.PORT || "3026";
    const res = await globalThis.fetch(
      `http://localhost:${port}/api/status`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      console.error(
        `[background-monitor] /api/status returned ${res.status}`
      );
    }
  } catch (err) {
    console.error("[background-monitor] Poll failed:", err);
  }
}

export function startBackgroundMonitor(): void {
  if (intervalId) return; // Already running

  const intervalMs = parseInt(
    process.env.MONITOR_INTERVAL_MS || String(DEFAULT_INTERVAL_MS),
    10
  );

  console.log(
    `[background-monitor] Starting with ${intervalMs / 1000}s interval`
  );

  // Run an initial check after startup (give the server time to be ready)
  setTimeout(pollStatuses, 10_000);

  intervalId = setInterval(pollStatuses, intervalMs);

  // Prevent the interval from keeping the process alive during shutdown
  if (intervalId && typeof intervalId === "object" && "unref" in intervalId) {
    intervalId.unref();
  }
}

export function stopBackgroundMonitor(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[background-monitor] Stopped");
  }
}
