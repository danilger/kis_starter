import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/app.db";
  if (url.startsWith("file:")) {
    return url.slice("file:".length);
  }
  return url;
}

const dbPath = resolveDbPath();
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath, { create: true });
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
