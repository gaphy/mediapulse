export const APP_TYPES = [
  "sonarr",
  "radarr",
  "lidarr",
  "prowlarr",
  "bazarr",
  "plex",
  "jellyfin",
  "immich",
  "overseerr",
  "huntarr",
  "pinchflat",
  "qbittorrent",
] as const;

export type AppType = (typeof APP_TYPES)[number];

export interface AppConfig {
  id: string;
  name: string;
  appType: AppType;
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfigPublic {
  id: string;
  name: string;
  appType: AppType;
  url: string;
  hasApiKey: boolean;
  hasCredentials: boolean;
  sortOrder: number;
  enabled: boolean;
}

export const APP_LABELS: Record<AppType, string> = {
  sonarr: "Sonarr",
  radarr: "Radarr",
  lidarr: "Lidarr",
  prowlarr: "Prowlarr",
  bazarr: "Bazarr",
  plex: "Plex",
  jellyfin: "Jellyfin",
  immich: "Immich",
  overseerr: "Overseerr",
  huntarr: "Huntarr",
  pinchflat: "Pinchflat",
  qbittorrent: "qBittorrent",
};

export const APP_AUTH_TYPE: Record<
  AppType,
  "apiKey" | "credentials" | "oauth" | "none"
> = {
  sonarr: "apiKey",
  radarr: "apiKey",
  lidarr: "apiKey",
  prowlarr: "apiKey",
  bazarr: "apiKey",
  plex: "oauth",
  jellyfin: "apiKey",
  immich: "apiKey",
  overseerr: "apiKey",
  huntarr: "credentials",
  pinchflat: "none",
  qbittorrent: "credentials",
};
