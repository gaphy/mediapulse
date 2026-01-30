# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2025-01-29

### Added
- Dashboard with responsive grid layout and 30-second auto-refresh
- Sort apps by name or health status
- 10 app integrations: Sonarr, Radarr, Prowlarr, Bazarr, Plex, Jellyfin, Immich, Overseerr, Pinchflat, qBittorrent
- Health monitoring with colored status indicators (online, degraded, offline, unknown)
- Per-app metrics display (series counts, queue sizes, disk usage, active streams, etc.)
- Clickable app cards linking to each app's web UI
- Warnings and errors displayed in a modal dialog per app card
- Settings page with add, edit, delete, enable/disable app management
- Test connection button with live feedback
- Plex OAuth authentication flow
- AES-256-GCM encryption for stored API keys and passwords
- Config export and import via JSON file from the settings page
- Docker support with multi-stage build and Docker Compose
- Skeleton loading states and empty state with setup prompt
