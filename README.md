# MediaPulse

A self-hosted dashboard for monitoring your media server stack at a glance. Track the health, key metrics, and activity of Sonarr, Radarr, Plex, Jellyfin, and more from a single page with auto-refresh.

## Supported Apps

| App | Metrics |
|-----|---------|
| **Sonarr** | Series count, queue, missing episodes, disk usage |
| **Radarr** | Movie count, queue, missing movies, disk usage |
| **Lidarr** | Artist count, queue, missing albums, disk usage |
| **Prowlarr** | Indexer count, failed indexers |
| **Bazarr** | Missing subtitles (TV + movies) |
| **Plex** | Libraries, active streams |
| **Jellyfin** | Libraries, active sessions, update status |
| **Immich** | Photos, videos, storage used |
| **Overseerr** | Pending requests, requested, available, partially available |
| **Huntarr** | Response time |
| **Pinchflat** | Response time |
| **qBittorrent** | Download/upload speed, active downloads |

## Quick Start (Docker)

```bash
docker compose up -d
```

An encryption key is automatically generated on first run and persisted in the data volume. To provide your own key instead, set the `ENCRYPTION_KEY` environment variable before starting:

```bash
# Optional: use your own key
export ENCRYPTION_KEY=$(openssl rand -hex 32)
docker compose up -d
```

Open [http://localhost:3026](http://localhost:3026) and go to **Settings** to add your apps.

## Manual Setup

Requires Node.js 22+.

```bash
# Install dependencies
npm install

# Generate an encryption key and add it to .env.local
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" > .env.local

# Start the dev server
npm run dev
```

For production:

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | No (auto-generated) | 32-byte hex string for AES-256-GCM encryption of stored API keys and passwords. Auto-generated and persisted on first Docker run. To generate manually: `openssl rand -hex 32`. |

## Config Export / Import

You can export and import your app configuration from the **Settings** page using the Export and Import buttons. The exported JSON file contains all app configs including credentials in plaintext, so store it securely.

This is useful for backing up your configuration or migrating to a new installation.

## Architecture

- **Next.js 15** (App Router) with React 19 and TypeScript
- **Tailwind CSS v4** with shadcn/ui components
- **better-sqlite3** for config storage (credentials encrypted at rest with AES-256-GCM)
- **SWR** for client-side polling (30-second auto-refresh)
- All external API calls happen server-side (API keys never reach the browser)

## License

MIT
