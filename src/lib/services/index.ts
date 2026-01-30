import type { AppType } from "@/types/app-config";
import { BaseAppService } from "./base-service";
import { SonarrService } from "./sonarr";
import { RadarrService } from "./radarr";
import { ProwlarrService } from "./prowlarr";
import { BazarrService } from "./bazarr";
import { PlexService } from "./plex";
import { JellyfinService } from "./jellyfin";
import { ImmichService } from "./immich";
import { OverseerrService } from "./overseerr";
import { PinchflatService } from "./pinchflat";
import { QBittorrentService } from "./qbittorrent";

const services: Record<AppType, BaseAppService> = {
  sonarr: new SonarrService(),
  radarr: new RadarrService(),
  prowlarr: new ProwlarrService(),
  bazarr: new BazarrService(),
  plex: new PlexService(),
  jellyfin: new JellyfinService(),
  immich: new ImmichService(),
  overseerr: new OverseerrService(),
  pinchflat: new PinchflatService(),
  qbittorrent: new QBittorrentService(),
};

export function getService(appType: AppType): BaseAppService {
  return services[appType];
}
