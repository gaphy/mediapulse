export async function onRequestError() {
  // Required export — no-op
}

export async function register() {
  // Only run on the Node.js server runtime, not on the Edge runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackgroundMonitor } = await import(
      "@/lib/background-monitor"
    );
    startBackgroundMonitor();
  }
}
