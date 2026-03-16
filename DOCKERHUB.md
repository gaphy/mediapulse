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

## Quick Start

### Docker Compose (Recommended)

Create a `docker-compose.yml`:

```yaml
services:
  mediapulse:
    image: altrest/mediapulse:latest
    container_name: mediapulse
    ports:
      - "3026:3026"
    volumes:
      - mediapulse-data:/app/data
    restart: unless-stopped

volumes:
  mediapulse-data:
```

Then run:

```bash
docker compose up -d
```

### Docker Run

```bash
docker run -d \
  --name mediapulse \
  -p 3026:3026 \
  -v mediapulse-data:/app/data \
  --restart unless-stopped \
  altrest/mediapulse:latest
```

Open [http://localhost:3026](http://localhost:3026) and go to **Settings** to add your apps.

## Volumes

| Path | Description |
|------|-------------|
| `/app/data` | SQLite database and encryption key. Mount this to persist your configuration across container updates. |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | No (auto-generated) | 32-byte hex string for AES-256-GCM encryption of stored API keys and passwords. Auto-generated and persisted in `/app/data` on first run. To provide your own: `openssl rand -hex 32`. |

## Features

- Single-page dashboard with 30-second auto-refresh
- **Notifications** when services go offline or come back online (Telegram, Discord, Webhook)
- AES-256-GCM encryption for API keys and passwords at rest
- Config export/import for backup and migration
- Dark/light theme support
- Multi-arch image (amd64 + arm64)
- All API calls happen server-side (credentials never reach the browser)

## Notifications

Get alerted when your services go offline or come back online. Configure in **Settings → Notifications**.

| Channel | Setup |
|---------|-------|
| **Telegram** | Create a bot via [@BotFather](https://t.me/BotFather), message your bot to initiate contact, get your Chat ID from [@userinfobot](https://t.me/userinfobot) |
| **Discord** | Create a webhook in Server Settings → Integrations → Webhooks |
| **Webhook** | Any HTTP endpoint accepting POST/GET with JSON payload |

## Architecture

- **Next.js 15** (App Router) with React 19
- **Tailwind CSS v4** with shadcn/ui
- **better-sqlite3** for config storage
- **SWR** for client-side polling
