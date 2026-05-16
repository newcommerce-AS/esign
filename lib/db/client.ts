import { drizzle as drizzleNeon, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite, PgliteDatabase } from "drizzle-orm/pglite";
import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

type AnyDb = NeonHttpDatabase | PgliteDatabase;

let _db: AnyDb | null = null;

async function initPglite(client: PGlite) {
  const migrationsDir = path.join(process.cwd(), "drizzle");
  const sqlFiles = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of sqlFiles) {
    const sql = readFileSync(path.join(migrationsDir, f), "utf8");
    const statements = sql
      .split(/--> statement-breakpoint/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      try {
        await client.exec(stmt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/already exists/i.test(msg)) throw e;
      }
    }
  }
}

export async function initDb(): Promise<AnyDb> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (url) {
    _db = drizzleNeon(neon(url));
    return _db;
  }
  // Local dev mode: use PGlite (embedded Postgres WASM)
  const dbDir = path.join(process.cwd(), ".dev-db");
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
  const client = new PGlite(dbDir);
  await initPglite(client);
  _db = drizzlePglite(client);
  console.warn("[dev-mode] Using PGlite at .dev-db/ — set DATABASE_URL for production");
  return _db;
}

export const db = new Proxy({} as AnyDb, {
  get(_target, prop, receiver) {
    if (!_db) throw new Error("DB not initialized. Call await initDb() before accessing db.");
    return Reflect.get(_db as unknown as object, prop, receiver);
  },
});
