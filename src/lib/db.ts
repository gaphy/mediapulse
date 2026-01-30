import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { encrypt, decrypt } from "./crypto";
import type { AppConfig, AppConfigPublic, AppType } from "@/types/app-config";

const DB_PATH = path.join(process.cwd(), "data", "mediapulse.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_instances (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      app_type      TEXT NOT NULL,
      url           TEXT NOT NULL,
      api_key       TEXT,
      username      TEXT,
      password      TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      enabled       INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function rowToConfig(row: Record<string, unknown>): AppConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    appType: row.app_type as AppType,
    url: row.url as string,
    apiKey: row.api_key ? decrypt(row.api_key as string) : undefined,
    username: row.username as string | undefined,
    password: row.password ? decrypt(row.password as string) : undefined,
    sortOrder: row.sort_order as number,
    enabled: (row.enabled as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function configToPublic(config: AppConfig): AppConfigPublic {
  return {
    id: config.id,
    name: config.name,
    appType: config.appType,
    url: config.url,
    hasApiKey: !!config.apiKey,
    hasCredentials: !!config.username && !!config.password,
    sortOrder: config.sortOrder,
    enabled: config.enabled,
  };
}

export function getAllApps(): AppConfigPublic[] {
  const database = getDb();
  const rows = database
    .prepare("SELECT * FROM app_instances ORDER BY sort_order ASC, name ASC")
    .all() as Record<string, unknown>[];
  return rows.map((row) => configToPublic(rowToConfig(row)));
}

export function getEnabledApps(): AppConfig[] {
  const database = getDb();
  const rows = database
    .prepare(
      "SELECT * FROM app_instances WHERE enabled = 1 ORDER BY sort_order ASC, name ASC"
    )
    .all() as Record<string, unknown>[];
  return rows.map(rowToConfig);
}

export function getApp(id: string): AppConfig | null {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM app_instances WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToConfig(row) : null;
}

export function getAppPublic(id: string): AppConfigPublic | null {
  const app = getApp(id);
  return app ? configToPublic(app) : null;
}

export function createApp(data: {
  name: string;
  appType: AppType;
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
}): AppConfigPublic {
  const database = getDb();
  const id = uuidv4();
  const maxOrder = database
    .prepare("SELECT MAX(sort_order) as max_order FROM app_instances")
    .get() as { max_order: number | null };
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  database
    .prepare(
      `INSERT INTO app_instances (id, name, app_type, url, api_key, username, password, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.name,
      data.appType,
      data.url.replace(/\/+$/, ""),
      data.apiKey ? encrypt(data.apiKey) : null,
      data.username || null,
      data.password ? encrypt(data.password) : null,
      sortOrder
    );

  return getAppPublic(id)!;
}

export function updateApp(
  id: string,
  data: {
    name?: string;
    url?: string;
    apiKey?: string | null;
    username?: string | null;
    password?: string | null;
    sortOrder?: number;
    enabled?: boolean;
  }
): AppConfigPublic | null {
  const database = getDb();
  const existing = getApp(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.url !== undefined) {
    fields.push("url = ?");
    values.push(data.url.replace(/\/+$/, ""));
  }
  if (data.apiKey !== undefined) {
    fields.push("api_key = ?");
    values.push(data.apiKey ? encrypt(data.apiKey) : null);
  }
  if (data.username !== undefined) {
    fields.push("username = ?");
    values.push(data.username || null);
  }
  if (data.password !== undefined) {
    fields.push("password = ?");
    values.push(data.password ? encrypt(data.password) : null);
  }
  if (data.sortOrder !== undefined) {
    fields.push("sort_order = ?");
    values.push(data.sortOrder);
  }
  if (data.enabled !== undefined) {
    fields.push("enabled = ?");
    values.push(data.enabled ? 1 : 0);
  }

  if (fields.length === 0) return getAppPublic(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  database
    .prepare(`UPDATE app_instances SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return getAppPublic(id);
}

export function deleteApp(id: string): boolean {
  const database = getDb();
  const result = database
    .prepare("DELETE FROM app_instances WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function getAppByTypeAndUrl(appType: AppType, url: string): AppConfig | null {
  const database = getDb();
  const normalized = url.replace(/\/+$/, "");
  const row = database
    .prepare("SELECT * FROM app_instances WHERE app_type = ? AND url = ?")
    .get(appType, normalized) as Record<string, unknown> | undefined;
  return row ? rowToConfig(row) : null;
}

export function getAllAppsWithSecrets(): AppConfig[] {
  const database = getDb();
  const rows = database
    .prepare("SELECT * FROM app_instances ORDER BY sort_order ASC, name ASC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToConfig);
}
